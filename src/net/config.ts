/** Set at build time via Amplify env var VITE_WS_URL (wss://.../prod). */
export function getWebSocketUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  return ''
}

export function isOnlineConfigured(): boolean {
  return Boolean(getWebSocketUrl())
}
