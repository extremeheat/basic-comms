const wsBackend = require('./webBackend')
const { raise } = require('./util')

function createServer (options) {
  raise('Cannot create server in browser')
}

function createClient (options) {
  if (options.ws) return wsBackend.createClient(options.ws, options)
  raise('No backend specified')
}

module.exports = {
  createServer, createClient
}

if (typeof window !== 'undefined') {
  window.ipc = module.exports
}
