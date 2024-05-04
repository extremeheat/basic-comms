// @ts-check
const ipc = require('basic-ipc')

const server = ipc.createServer({
  ws: { port: 8091 },
  imports: {
    loginRequest: async (data) => ({ data })
  }
})

const client = ipc.createClient({
  ws: { url: 'ws://localhost:8091' },
  exports: {
    async loginRequest (data) {
      return {
        echoPayload: data,
        response: 'Hello from client!'
      }
    }
  }
})

server.on('join', async (user) => {
  const res = await user.exec.loginRequest(123)
  console.log('Response:', res)
  client.close()
  server.close()
})
