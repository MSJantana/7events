import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'
import { prisma } from '../prisma'
import { audit } from '../utils/audit'

function parseCookies(header?: string) {
  return Object.fromEntries(
    (header || '')
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.includes('='))
      .map((p: string) => {
        const i = p.indexOf('=')
        return [p.substring(0, i), decodeURIComponent(p.substring(i + 1))]
      })
  ) as Record<string, string>
}

function getAccessToken(req: Request, cookies: Record<string, string>) {
  const auth = req.headers['authorization']
  if (auth?.startsWith('Bearer ')) return auth.substring(7)
  return cookies['access_token']
}

function clearAuth(res: Response) {
  const isSecure = env.NODE_ENV !== 'development'
  res.clearCookie('access_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
  res.clearCookie('refresh_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
}

async function validateSession(sid: string) {
  const s = await prisma.loginSession.findUnique({ where: { sessionId: sid } })
  return s
}

function isExpired(session: any) {
  return session.expiresAt < new Date()
}

function isInactive(session: any) {
  const cutoff = new Date(Date.now() - env.INACTIVITY_TTL_MINUTES * 60 * 1000)
  return session.lastActivity < cutoff
}

function setAuthCookies(res: Response, access: string, refresh: string) {
  const isSecure = env.NODE_ENV !== 'development'
  res.cookie('access_token', access, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: env.ACCESS_TOKEN_DAYS * 24 * 60 * 60 * 1000 })
  res.cookie('refresh_token', refresh, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000 })
}

async function processAccessToken(token: string, res: Response) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any
    const sid = payload?.sid
    if (!sid) {
      res.status(401).json({ error: 'unauthorized' })
      return null
    }
    const session = await validateSession(sid)
    if (!session || session.revokedAt) {
      res.status(401).json({ error: 'session_invalid' })
      return null
    }
    if (isExpired(session)) {
      clearAuth(res)
      res.status(401).json({ error: 'session_expired' })
      return null
    }
    if (isInactive(session)) {
      clearAuth(res)
      await prisma.loginSession.update({ where: { sessionId: sid }, data: { revokedAt: new Date() } })
      res.status(401).json({ error: 'session_inactive' })
      return null
    }
    await prisma.loginSession.update({ where: { sessionId: sid }, data: { lastActivity: new Date() } })
    return payload
  } catch (e: any) {
    const expired = e?.name === 'TokenExpiredError'
    if (!expired) res.status(401).json({ error: 'invalid_token' })
    return null
  }
}

async function processRefreshToken(refresh: string, res: Response) {
  try {
    const rPayload: any = jwt.verify(refresh, env.JWT_SECRET)
    if (rPayload?.type !== 'refresh' || !rPayload?.sid || !rPayload?.sub) {
      res.status(401).json({ error: 'invalid_refresh' })
      return null
    }
    const session = await validateSession(rPayload.sid)
    if (!session || session.revokedAt) {
      res.status(401).json({ error: 'session_invalid' })
      return null
    }
    if (isExpired(session)) {
      clearAuth(res)
      res.status(401).json({ error: 'session_expired' })
      return null
    }
    if (isInactive(session)) {
      clearAuth(res)
      await prisma.loginSession.update({ where: { sessionId: rPayload.sid }, data: { revokedAt: new Date() } })
      res.status(401).json({ error: 'session_inactive' })
      return null
    }
    const user = await prisma.user.findUnique({ where: { id: rPayload.sub }, select: { role: true } })
    if (!user) {
      res.status(401).json({ error: 'user_missing' })
      return null
    }
    await prisma.loginSession.update({ where: { sessionId: rPayload.sid }, data: { revokedAt: new Date() } })
    const newSid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
    await prisma.loginSession.create({ data: { userId: rPayload.sub, sessionId: newSid, expiresAt } })
    audit('token_rotated', { userId: rPayload.sub, oldSid: rPayload.sid, newSid })
    const newAccess = signJwt({ sub: rPayload.sub, role: user.role, sid: newSid }, env.ACCESS_TOKEN_DAYS)
    const newRefresh = signJwt({ sub: rPayload.sub, type: 'refresh', sid: newSid }, env.REFRESH_TOKEN_DAYS)
    setAuthCookies(res, newAccess, newRefresh)
    const payload = jwt.verify(newAccess, env.JWT_SECRET) as any
    return payload
  } catch {
    res.status(401).json({ error: 'refresh_failed' })
    return null
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers['cookie'])
  const token = getAccessToken(req, cookies)
  if (token) {
    const payload = await processAccessToken(token, res)
    if (payload) {
      (req as any).user = payload
      return next()
    }
    if (res.headersSent) {
      return
    }
  }

  const refresh = cookies['refresh_token']
  if (!refresh) return res.status(401).json({ error: 'unauthorized' })
  const rPayload = await processRefreshToken(refresh, res)
  if (!rPayload) {
    return
  }
  (req as any).user = rPayload
  return next()
}

export function signJwt(payload: object, expiresInDays = env.ACCESS_TOKEN_DAYS) {
  const secret: Secret = env.JWT_SECRET
  const options: SignOptions = { expiresIn: expiresInDays * 24 * 60 * 60 }
  return jwt.sign(payload as any, secret, options)
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const cookieHeader = req.headers['cookie']
    const cookies = Object.fromEntries(
      (cookieHeader || '')
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s.includes('='))
        .map((p: string) => {
          const i = p.indexOf('=')
          return [p.substring(0, i), decodeURIComponent(p.substring(i + 1))]
        })
    ) as Record<string, string>
    const auth = req.headers['authorization']
    const bearer = auth?.startsWith('Bearer ') ? auth.substring(7) : undefined
    const access = bearer || cookies['access_token']
    if (access) {
      try {
        const payload = jwt.verify(access, env.JWT_SECRET) as any
        ;(req as any).user = payload
      } catch {}
    }
  } catch {}
  next()
}
