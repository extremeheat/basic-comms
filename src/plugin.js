/* eslint-disable no-dupe-keys */ // eslint is dumb and doesn't understand that the keys are being overwritten on purpose
const { onceWithTimeout } = require('./util')
const debug = require('debug')('basic-ipc').enabled && require('debug')('basic-ipc')

module.exports = function inject (socket) {
  let ids = 0
  const expectingBinaryMessages = new Set()
  function onBinaryMessage (/** @type {Buffer} */message) {
    debug?.('-> BIN', message.toString())
    socket.emit('binMsg', message)
    for (const expected of expectingBinaryMessages) {
      if (message.slice(0, expected.length).equals(expected)) {
        socket.emit('binMsg.' + expected.slice(0, -4).toString(), message.slice(expected.length), message.slice(expected.length - 4).readUInt32BE())
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
    // messageType + (expected response ID?) + messageContents
    const messageBuf = Buffer.alloc(Buffer.byteLength(messageType) + 4 + Buffer.byteLength(messageContents))
    messageBuf.write(messageType)
    messageBuf.writeUInt32BE(id, Buffer.byteLength(messageType))
    messageContents.copy(messageBuf, Buffer.byteLength(messageType) + 4)
    socket.send(messageBuf)
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
        if (!Buffer.isBuffer(chunk)) throw new Error('Chunk must be a buffer')
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
    const buf = Buffer.alloc(Buffer.byteLength(type) + 4)
    buf.write(type)
    expectingBinaryMessages.add(buf)
    socket.on('binMsg.' + type, (resp, id) => handler(resp, id && socket.createMessage(id), id))
  }
  return socket
}
