// @ts-check
const WebSocket = require('ws')
const injectPlugin = require('./plugin')

/**
 * Creates a websocket client with helper methods for sending and receiving messages
 * @param {import('./index').WSClientOptions} options
 * @returns {import('./index').Client}
 */
function createClient (options = { url: 'ws://localhost:8091' }) {
  const socket = new WebSocket(options.url)
  return injectPlugin(socket)
}

/**
 * Creates a websocket server with helper methods for sending and receiving messages
 * @param {import('./index').WSServerOptions} options
 * @returns {import('./index').Server}
 */
function createServer (options = { port: 8091 }) {
  const server = new WebSocket.Server({ port: options.port })
  server.on('connection', (socket) => {
    injectPlugin(socket)
  })
  return server
}

function testText (cb) {
  const server = createServer()
  server.on('connection', async (client) => {
    client.sendMessage('hello', { message: 'Hello from server' })
    const loginData = await client.request('loginRequest', {}, console.log)
    console.log('Login response:', loginData)
    client.sendBinaryMessage('helloBin', Buffer.from('Hello from server'))
  })

  const client = createClient()
  client.receive('hello', (message) => {
    console.log('Received hello message:', message)
  })
  client.receive('loginRequest', (message, resp) => {
    console.log('Received login request:', message)
    resp.sendChunk({ chunk: 'chunk1' })
    resp.sendChunk({ chunk: 'chunk2' })
    resp.sendResponse({ message: 'Login successful' })
  })
  client.receiveBinary('helloBin', (message) => {
    console.log('Received binary hello message:', message.toString())
    server.close()
    client.close()
    cb?.()
  })
}

// if (!module.parent) testText()

module.exports = { createClient, createServer, testText }
