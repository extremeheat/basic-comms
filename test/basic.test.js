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
      client.once('open', done)
    })
  })
})
