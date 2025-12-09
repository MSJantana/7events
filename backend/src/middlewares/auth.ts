import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'
import { prisma } from '../prisma'
import { audit } from '../utils/audit'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['authorization']
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

  let token: string | undefined
  if (auth?.startsWith('Bearer ')) token = auth.substring(7)
  else if (cookies['access_token']) token = cookies['access_token']

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any
      ;(req as any).user = payload
      return next()
    } catch (e: any) {
      const expired = e?.name === 'TokenExpiredError'
      if (!expired) return res.status(401).json({ error: 'invalid_token' })
    }
  }

  const refresh = cookies['refresh_token']
  if (!refresh) return res.status(401).json({ error: 'unauthorized' })
  try {
    const rPayload: any = jwt.verify(refresh, env.JWT_SECRET)
    if (rPayload?.type !== 'refresh' || !rPayload?.sid || !rPayload?.sub) {
      return res.status(401).json({ error: 'invalid_refresh' })
    }
    const session = await prisma.loginSession.findUnique({ where: { sessionId: rPayload.sid } })
    if (!session) return res.status(401).json({ error: 'session_invalid' })
    if (session.revokedAt) return res.status(401).json({ error: 'session_invalid' })
    if (session.expiresAt < new Date()) {
      const isSecure = env.NODE_ENV !== 'development'
      res.clearCookie('access_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
      res.clearCookie('refresh_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
      return res.status(401).json({ error: 'session_expired' })
    }
    // rotate session and refresh token
    const user = await prisma.user.findUnique({ where: { id: rPayload.sub }, select: { role: true } })
    if (!user) return res.status(401).json({ error: 'user_missing' })
    await prisma.loginSession.update({ where: { sessionId: rPayload.sid }, data: { revokedAt: new Date() } })
    const newSid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
    await prisma.loginSession.create({ data: { userId: rPayload.sub, sessionId: newSid, expiresAt } })
    audit('token_rotated', { userId: rPayload.sub, oldSid: rPayload.sid, newSid })
    const newAccess = signJwt({ sub: rPayload.sub, role: user.role, sid: newSid }, env.ACCESS_TOKEN_DAYS)
    const newRefresh = signJwt({ sub: rPayload.sub, type: 'refresh', sid: newSid }, env.REFRESH_TOKEN_DAYS)
    const isSecure = env.NODE_ENV !== 'development'
    res.cookie('access_token', newAccess, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: env.ACCESS_TOKEN_DAYS * 24 * 60 * 60 * 1000
    })
    res.cookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    })
    const payload = jwt.verify(newAccess, env.JWT_SECRET) as any
    ;(req as any).user = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'refresh_failed' })
  }
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
