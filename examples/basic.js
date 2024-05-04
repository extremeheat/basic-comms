const ipc = require('basic-ipc')
const server = ipc.createServer({
  ws: { port: 8091 }
})

server.once('listening', () => {
  const client = ipc.createClient({
    ws: { url: 'ws://localhost:8091' }
  })
  client.once('open', () => {
    client.sendMessage('hello', { world: '!' })
  })
})
server.on('connection', async (client) => {
  client.receive('hello', (message) => {
    console.log('Received hello message:', message)
    server.close()
    client.close()
  })
})
