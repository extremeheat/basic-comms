# node-basic-ipc
[![NPM version](https://img.shields.io/npm/v/basic-ipc.svg)](http://npmjs.com/package/basic-ipc)
[![Build Status](https://github.com/extremeheat/basic-ipc/actions/workflows/ci.yml/badge.svg)](https://github.com/extremeheat/basic-ipc/actions/workflows/)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/extremeheat/basic-ipc)

Node.js real-time client <-> server (between backend and browser) communication library for IPC.

Features:
- Send and receive JSON objects or binary data
- Send and receive messages in chunks
- Request-response pattern


## Install
```bash
npm install basic-ipc
```

## Usage
Simple example of server and client communication using WebSocket:
```javascript
const ipc = require('basic-ipc');
const server = ipc.createServer({
  ws: { port: 8091 }
})

server.once('listening', () => {
  const client = ipc.createClient({
    ws: { url: 'ws://localhost:8091' }
  })
  client.once('open', () => {
    client.sendMessage('hello', { world: '!' })
  })
})

server.on('connection', async (client) => {
  client.receive('hello', (message) => {
    console.log('Received hello message:', message)
    server.close()
    client.close()
  })
})
```

## API
See the type definitions in [index.d.ts](src/index.d.ts) for more information.

## License
MIT