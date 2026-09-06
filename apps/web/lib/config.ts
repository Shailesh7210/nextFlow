export const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
export const WS_BACKEND_URL = BACKEND_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
