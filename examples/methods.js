// @ts-check
const ipc = require('basic-ipc')

const server = ipc.createServer({
  ws: { port: 8091 },
  imports: {
    loginRequest: async (a, b) => ({ echoPayload: String, response: String })
  }
})

const client = ipc.createClient({
  ws: { url: 'ws://localhost:8091' },
  exports: {
    async loginRequest (data) {
      console.log('Received', arguments)
      return {
        echoPayload: data,
        response: 'Hello from client!'
      }
    }
  }
})

server.on('join', async (user) => {
  const res = await user.exec.loginRequest(123, 456)
  console.log('Response:', res)
  client.close()
  server.close()
})
