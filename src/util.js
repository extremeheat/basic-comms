module.exports = {
  raise (message) {
    throw typeof message === 'string' ? new Error(message) : message
  },

  onceWithTimeout (emitter, event, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        emitter.off(event, handler)
        reject(new Error(`Timeout waiting for ${event}`))
      }, timeout)
      function handler (...args) {
        clearTimeout(timeoutId)
        resolve(...args)
      }
      emitter.once(event, handler)
    })
  }
}
