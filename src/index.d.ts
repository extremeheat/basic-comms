import { WebSocket } from 'ws'

export class Client extends WebSocket {
  // Write a JSON object to the WebSocket
  write(data: object): void

  // Send a JSON object message in full to the server
  sendMessage(messageType: string, contents: object): void
  // Send a JSON object message in chunks to the server
  createMessage(messageType: string): {
    sendChunk(chunk: object): void
    sendResponse(response: object): void
  }

  // Send a binary message in full to the server
  sendBinaryMessage(messageType: string, contents: Buffer): void
  // Send a binary message in chunks to the server
  createBinaryMessage(messageType: string): {
    sendChunk(chunk: Buffer): void
    sendResponse(response: Buffer): void
  }

  // Send a message to server & get response
  request(messageType: string, contents: object, chunkCb?: (obj: object) => void, timeout?: number): Promise<object>
  // Send a message to server & get response in binary
  requestBinary(messageType: string, contents: Buffer, chunkCb?: (obj: Buffer) => void, timeout?: number): Promise<Buffer>

  // Receive a message from the server (one not asked for)
  receive(messageType: string, cb: (obj: object) => void): void
  // Receive a binary message from the server (one not asked for)
  receiveBinary(messageType: string, cb: (obj: Buffer) => void): void
}

export class Server extends WebSocket.Server {
  on(event: 'connection', listener: (client: Client) => void): this
}

export interface WSClientOptions {
  url: string
}
export interface WSServerOptions {
  port: number
}

export function createClient(options: { ws: WSClientOptions }): Client
export function createServer(options: { ws: WSServerOptions }): Server
