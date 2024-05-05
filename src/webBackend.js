const injectPlugin = require('./plugin')

class SimpleEmitter {
  _events = {}
  _onces = {}
  on (name, fn) {
    if (!this._events[name]) this._events[name] = []
    this._events[name].push(fn)
  }

  emit (name, ...data) {
    this._events[name]?.forEach(fn => fn(...data))
    this._onces[name]?.forEach(fn => this.off(name, fn))
    delete this._onces[name]
  }

  once (name, fn) {
    this.on(name, fn)
    if (!this._onces[name]) this._onces[name] = []
    this._onces[name].push(fn)
  }

  off (name, fn) {
    const event = this._events[name]?.indexOf(fn)
    if (event >= 0) this._events[name].splice(event, 1)

    const once = this._onces[name]?.indexOf(fn)
    if (once >= 0) this._onces[name].splice(once, 1)

    if (!fn || !this._events[name]?.length) {
      delete this._events[name]
      delete this._onces[name]
    }
  }

  static injectInto (obj) {
    Object.defineProperties(obj, Object.getOwnPropertyDescriptors(SimpleEmitter.prototype))
    Object.assign(obj, new SimpleEmitter())
  }
}

/**
 * Creates a websocket client with helper methods for sending and receiving messages
 * @param {import('./index').WSClientOptions} options
 * @param {object} [methods]
 * @returns {import('./index').ClientEx}
 */
function createClient (options = { url: 'ws://localhost:8091' }, methods) {
  const socket = new window.WebSocket(options.url)
  SimpleEmitter.injectInto(socket)
  socket.onmessage = ({ data }) => socket.emit('message', data)
  return injectPlugin(socket, methods)
}

function createServer () {
  throw new Error('createServer is not available in browser environment')
}

module.exports = { createClient, createServer }
