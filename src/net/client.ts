import { getWebSocketUrl } from './config'
import type { ClientMessage, ServerMessage } from './protocol'

type MessageHandler = (msg: ServerMessage) => void

export class MultiplayerClient {
  private ws: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private openPromise: Promise<void> | null = null

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async connect(): Promise<void> {
    if (this.connected) return
    if (this.openPromise) return this.openPromise

    const url = getWebSocketUrl()
    if (!url) {
      throw new Error('Online play is not configured (missing VITE_WS_URL).')
    }

    this.openPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url)
      this.ws = ws

      const onError = () => {
        cleanup()
        reject(new Error('WebSocket connection failed'))
      }

      const onOpen = () => {
        cleanup()
        resolve()
      }

      const cleanup = () => {
        ws.removeEventListener('open', onOpen)
        ws.removeEventListener('error', onError)
      }

      ws.addEventListener('open', onOpen)
      ws.addEventListener('error', onError)
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMessage
          for (const handler of this.handlers) handler(msg)
        } catch {
          /* ignore bad frames */
        }
      })
      ws.addEventListener('close', () => {
        this.ws = null
        this.openPromise = null
      })
    })

    try {
      await this.openPromise
    } catch (err) {
      this.openPromise = null
      throw err
    }
  }

  send(msg: ClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(msg))
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.openPromise = null
  }
}

let shared: MultiplayerClient | null = null

export function getMultiplayerClient() {
  if (!shared) shared = new MultiplayerClient()
  return shared
}
