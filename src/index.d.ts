import { WebSocket, WebSocketServer } from 'ws'

interface MessageCreator {
  sendChunk(chunk: object): void
  sendResponse(response: object): void
  sendBinaryChunk(chunk: Buffer): void
  sendBinaryResponse(response: Buffer): void
}

export class ClientEx<T> extends WebSocket {
  // Wait for the WebSocket to be ready
  waitForReady(): Promise<void>

  // Write a JSON object to the WebSocket
  write(data: Record<string, any>): void

  // Send a JSON object message in full to the server
  sendMessage(messageType: string, contents: Record<string, any>): void
  // Send a binary message in full to the server
  sendBinaryMessage(messageType: string, contents: Buffer): void

  // Send a message in chunks to the server
  createMessage(messageType: string): MessageCreator

  // Send a message to server & get response
  request(messageType: string, contents: Record<string, any>, chunkCb?: (obj: Record<string, any>) => void, timeout?: number): Promise<object>
  // Send a message to server & get response in binary
  requestBinary(messageType: string, contents: Buffer, chunkCb?: (obj: Buffer) => void, timeout?: number): Promise<Buffer>

  // Receive a message from the server (one not asked for)
  receive(messageType: string, cb: (obj: Record<string, any>) => void): void
  receive(messageType: string, cb: (obj: Record<string, any>, responder: MessageCreator) => void): void
  // Receive a binary message from the server (one not asked for)
  receiveBinary(messageType: string, cb: (obj: Buffer) => void): void
  receiveBinary(messageType: string, cb: (obj: Buffer, responder: MessageCreator) => void): void

  exec: T
}

export class ServerEx<T> extends WebSocketServer {
  on(event: 'join', listener: (client: ClientEx<T>) => void): this
  on(event: "close" | "listening", cb: (this: ServerEx<T>) => void): this
  // on(event: 'connection' | 'error' | 'headers' | 'close' | 'listening' | 'message', listener: (...args: any[]) => void): this;
  on(event: string, listener: (...args: any[]) => void): this
}

export interface WSClientOptions {
  url: string
}
export interface WSServerOptions {
  port: number
}

export function createClient<T>(options: { 
  ws: WSClientOptions,
  imports?: T,
  exports?: Record<string, Function>
}): ClientEx<T>
export function createServer<T>(options: {
  ws: WSServerOptions,
  imports?: T,
  exports?: Record<string, Function>
}): ServerEx<T>
