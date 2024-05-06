/* eslint-env mocha */
const lib = require('basic-ipc')
const wsBackend = require('basic-ipc/src/wsBackend')

describe('basic', () => {
  it('back and forth', function (done) {
    wsBackend.testText(done)
  })
  it('works with websockets', function (done) {
    const server = lib.createServer({
      ws: { port: 8091 }
    })
    server.once('listening', () => {
      const client = lib.createClient({
        ws: { url: 'ws://localhost:8091' }
      })
      client.waitForReady().then(() => {
        client.close()
        server.close()
        done()
      })
    })
  })

  it('methods work', function (done) {
    const server = lib.createServer({
      ws: { port: 8091 },
      imports: {
        loginRequest: async (data) => ({ data })
      }
    })
    const client = lib.createClient({
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
      console.log('Got connection')
      const res = await user.exec.loginRequest(123)
      console.log('Response:', res)
      client.close()
      server.close()
      done()
    })
  })
})
