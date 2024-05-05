/* eslint-disable no-dupe-keys */ // eslint is dumb and doesn't understand that the keys are being overwritten on purpose
const { onceWithTimeout } = require('./util')
const BinaryStream = require('bytewriter/src/browser')
const debug = typeof window === 'undefined'
  ? (require('debug')('basic-ipc').enabled && require('debug')('basic-ipc'))
  : (window && window.location.search.includes('debug') && console.log)

function inject (socket, methods) {
  let ids = 0
  const expectingBinaryMessages = new Set()
  function onBinaryMessage (/** @type {Buffer} */message) {
    debug?.('-> BIN', message.toString())
    socket.emit('binMsg', message)
    for (const expected of expectingBinaryMessages) {
      if (BinaryStream.buffersEqual(message.subarray(0, expected.length), expected)) {
        const stream = new BinaryStream(message)
        const messageType = stream.readStringRaw(expected.length - 4) // (expected includes the name + 4 byte ID)
        const id = stream.readUInt32BE()
        const data = stream.readRemaining()
        socket.emit(
          'binMsg.' + messageType,
          data,
          id
        )
      }
    }
  }
  function onTextMessage (message) {
    debug?.('-> TXT', message.toString())
    let json
    try {
      json = JSON.parse(message.toString())
    } catch (e) {
      return onBinaryMessage(message)
    }
    if (json && json.T) {
      socket.emit('msgResp', json.T, json)
      socket.emit('msgResp.' + json.T, json)
    }
  }
  socket.on('message', (message) => {
    if (message[0] === 0x7b && message[message.length - 1] === 0x7d) {
      return onTextMessage(message)
    } else {
      return onBinaryMessage(message)
    }
  })

  socket.write = (data) => socket.send(JSON.stringify(data))

  function _sendBinaryMessage (messageType, messageContents, id) {
    const messageBuf = new BinaryStream()
    messageBuf.writeStringRaw(messageType)
    messageBuf.writeUInt32BE(id)
    messageBuf.writeBuffer(messageContents)
    socket.send(messageBuf.getBuffer())
  }
  socket.sendBinaryMessage = function (messageType, messageContents, id) {
    debug?.('<- BIN', messageType, messageContents, id)
    return _sendBinaryMessage(messageType, messageContents, id)
  }

  socket.sendMessage = function (messageType, messageContents, id) {
    debug?.('<- TXT', messageType, messageContents, id)
    if (typeof messageContents !== 'object') throw new Error('Message contents must be an object')
    socket.write({ T: undefined, I: undefined, ...messageContents, T: messageType, I: id })
  }

  socket.createMessage = function (messageType, expectedResponseId) {
    return {
      sendChunk (chunk) {
        if (typeof chunk !== 'object') throw new Error('Chunk must be an object')
        socket.write({ T: undefined, ...chunk, T: 'chunk.' + messageType, I: expectedResponseId })
      },
      sendResponse (response) {
        socket.write({ T: undefined, ...response, T: messageType, I: expectedResponseId })
      },

      sendBinaryChunk (chunk) {
        if (!(chunk instanceof ArrayBuffer)) throw new Error('Chunk must be a buffer')
        _sendBinaryMessage('chunk.' + messageType, chunk, expectedResponseId)
      },
      sendBinaryResponse (response) {
        _sendBinaryMessage(messageType, response, expectedResponseId)
      }
    }
  }

  socket.request = async function (type, payload, chunkCb, timeout = 5000) {
    if (typeof payload !== 'object') throw new Error('Payload must be an object')
    const id = ++ids
    socket.sendMessage(type, payload, id)
    function onChunk (message) {
      chunkCb?.(message)
    }
    socket.on('msgResp.chunk.' + id + type, onChunk)
    const result = await onceWithTimeout(socket, 'msgResp.' + id, timeout)
    socket.off('msgResp.chunk.' + id + type, onChunk)
    return result
  }
  socket.requestBinary = async function (type, payload, chunkCb, timeout = 5000) {
    const id = ++ids
    // if payload is buffer-like, send it as a binary message
    if (payload instanceof ArrayBuffer) {
      socket.sendBinaryMessage(type, payload, id)
    } else {
      if (typeof payload !== 'object') throw new Error('Payload must be an object')
      socket.sendMessage(type, payload, id)
    }
    function onChunk (message) {
      chunkCb?.(message)
    }
    socket.on('binMsg.chunk.' + type, onChunk)
    const result = await onceWithTimeout(socket, 'binMsg.' + type, timeout)
    socket.off('binMsg.chunk.' + type, onChunk)
    return result
  }

  socket.receive = async function (type, handler) {
    socket.on('msgResp.' + type, (resp) => handler(resp, resp.I && socket.createMessage(resp.I)))
  }

  socket.receiveBinary = async function (type, handler) {
    const stream = new BinaryStream()
    stream.writeStringRaw(type)
    stream.writeUInt32BE(0) // ID is 0 for non-response messages
    expectingBinaryMessages.add(stream.getBuffer())
    socket.on('binMsg.' + type, (resp, id) => handler(resp, id && socket.createMessage(id), id))
  }

  addMethods(socket, methods)
  return socket
}

function addMethods (socket, methods) {
  socket.exec = {}
  if (!methods) return
  if (methods.imports) {
    for (const [name] of Object.entries(methods.imports)) {
      socket.exec[name] = async function (...args) {
        return await socket.request(name, { args })
      }
    }
  }
  if (methods.exports) {
    for (const [name, fn] of Object.entries(methods.exports)) {
      socket.receive(name, async (message, resp) => {
        const result = await fn(...message.args)
        resp?.sendResponse(result)
      })
    }
  }
}

module.exports = inject
