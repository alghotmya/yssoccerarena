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
      let settled = false

      const onError = () => {
        cleanup()
        if (!settled) {
          settled = true
          reject(new Error('WebSocket connection failed'))
        }
      }

      const onOpen = () => {
        cleanup()
        if (!settled) {
          settled = true
          resolve()
        }
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
        if (this.ws === ws) this.ws = null
        this.openPromise = null
      })
    })

    try {
      await this.openPromise
    } catch (err) {
      this.openPromise = null
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        try {
          this.ws.close()
        } catch {
          /* ignore */
        }
        this.ws = null
      }
      throw err
    }
  }

  send(msg: ClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected — try again')
    }
    this.ws.send(JSON.stringify(msg))
  }

  disconnect() {
    const ws = this.ws
    this.ws = null
    this.openPromise = null
    try {
      ws?.close()
    } catch {
      /* ignore */
    }
  }
}

let shared: MultiplayerClient | null = null

export function getMultiplayerClient() {
  if (!shared) shared = new MultiplayerClient()
  return shared
}
