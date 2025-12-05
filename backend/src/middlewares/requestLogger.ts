import { Request, Response, NextFunction } from 'express'
import { logInfo } from '../utils/logger'
import { randomUUID as nodeRandomUUID } from 'node:crypto'

function genId() {
  try {
    return nodeRandomUUID()
  } catch {
    if ((globalThis as any)?.crypto?.randomUUID) return (globalThis as any).crypto.randomUUID()
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const id = genId()
  ;(req as any).requestId = id
  const start = Date.now()
  logInfo('req_start', { id, method: req.method, url: req.originalUrl || req.url, ip: req.ip, ua: req.headers['user-agent'] })
  res.on('finish', () => {
    const durationMs = Date.now() - start
    logInfo('req_end', { id, status: res.statusCode, durationMs, method: req.method, url: req.originalUrl || req.url, length: res.getHeader('content-length') })
  })
  next()
}
