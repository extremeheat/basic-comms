const wsBackend = require('./wsBackend')
const { raise } = require('./util')

function createServer (options) {
  if (options.ws) return wsBackend.createServer(options.ws, options)
  raise('No backend specified')
}

function createClient (options) {
  if (options.ws) return wsBackend.createClient(options.ws, options)
  raise('No backend specified')
}

module.exports = {
  createServer, createClient
}
