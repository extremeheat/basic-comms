/* eslint-disable no-dupe-keys */ // eslint is dumb and doesn't understand that the keys are being overwritten on purpose
const { onceWithTimeout } = require('./util')

module.exports = function inject (socket) {
  const expectingBinaryMessages = new Set()
  function onBinaryMessage (/** @type {Buffer} */message) {
    socket.emit('binMsg', message)
    for (const expected of expectingBinaryMessages) {
      if (message.slice(0, expected.length).equals(expected)) {
        socket.emit('binMsg.' + expected.slice(0, -1).toString(), message.slice(expected.length))
      }
    }
  }
  function onTextMessage (message) {
    let json
    try {
      json = JSON.parse(message.toString())
    } catch (e) {
      return onBinaryMessage(message)
    }
    if (json && json.type) {
      socket.emit('msgResp', json.type, json)
      socket.emit('msgResp.' + json.type, json)
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

  socket.sendMessage = function (messageType, messageContents) {
    if (typeof messageContents !== 'object') throw new Error('Message contents must be an object')
    socket.write({ type: undefined, ...messageContents, type: messageType })
  }
  socket.createMessage = function (messageType, messageContents) {
    return {
      sendChunk (chunk) {
        if (typeof chunk !== 'object') throw new Error('Chunk must be an object')
        socket.write({ type: undefined, ...chunk, type: 'chunk.' + messageType })
      },
      sendResponse (response) {
        if (messageContents) {
          if (typeof response !== 'object') throw new Error('Response must be an object')
          throw new Error('Cannot send response more than once. Chunks must be sent before response, and can only be sent if a final `messageContents` was not provided.')
        }
        socket.write({ type: undefined, ...response, type: messageType })
      }
    }
  }

  function _sendBinaryMessage (messageType, messageContents) {
    const messageBuf = Buffer.alloc(Buffer.byteLength(messageType) + 1 + Buffer.byteLength(messageContents))
    messageBuf.write(messageType)
    // write a null term/separator char (buffer is zeroed out by default, this is just for explicitness)
    messageBuf.writeUInt8(0, messageType.length)
    messageContents.copy(messageBuf, messageType.length + 1)
    socket.send(messageBuf)
  }
  socket.sendBinaryMessage = function (messageType, messageContents) {
    return _sendBinaryMessage(messageType, messageContents)
  }
  socket.createBinaryMessage = function (messageType, messageContents) {
    return {
      sendChunk (chunk) {
        _sendBinaryMessage('chunk.' + messageType, chunk)
      },
      sendResponse (response) {
        if (messageContents) {
          throw new Error('Cannot send response more than once. Chunks must be sent before response, and can only be sent if a final `messageContents` was not provided.')
        }
        _sendBinaryMessage(messageType, response)
      }
    }
  }

  socket.request = async function (type, payload, chunkCb, timeout = 5000) {
    if (typeof payload !== 'object') throw new Error('Payload must be an object')
    socket.sendMessage(type, payload)
    function onChunk (message) {
      chunkCb?.(message)
    }
    socket.on('msgResp.chunk.' + type, onChunk)
    const result = await onceWithTimeout(socket, 'msgResp.' + type, timeout)
    socket.off('msgResp.chunk.' + type, onChunk)
    return result
  }
  socket.requestBinary = async function (type, payload, chunkCb, timeout = 5000) {
    socket.sendBinaryMessage(type, payload)
    function onChunk (message) {
      chunkCb?.(message)
    }
    socket.on('binMsg.chunk.' + type, onChunk)
    const result = await onceWithTimeout(socket, 'binMsg.' + type, timeout)
    socket.off('binMsg.chunk.' + type, onChunk)
    return result
  }

  socket.receive = async function (type, handler) {
    socket.on('msgResp.' + type, handler)
  }
  socket.receiveBinary = async function (type, handler) {
    const buf = Buffer.alloc(Buffer.byteLength(type) + 1)
    buf.write(type)
    expectingBinaryMessages.add(buf)
    socket.on('binMsg.' + type, handler)
  }
  return socket
}
