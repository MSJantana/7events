import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { signJwt } from '../middlewares/auth'
import { Role } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'
import { getGoogleAuthUrl, handleGoogleCallback } from '../modules/auth/auth.service'
import { audit } from '../utils/audit'
import { prisma } from '../prisma'
import { logError, logInfo } from '../utils/logger'
import { localRegisterSchema, localLoginSchema } from '../utils/validation'

const router = Router()

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string }
    if (!idToken) return res.status(400).json({ error: 'idToken_required' })
    if (!env.GOOGLE_CLIENT_ID)
      return res.status(500).json({ error: 'google_client_id_missing' })

    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload?.name) return res.status(400).json({ error: 'invalid_google_payload' })

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name },
      create: { email: payload.email, name: payload.name, role: Role.PARTICIPANT }
    })

    if (payload.sub) {
      await prisma.userGoogle.upsert({
        where: { sub: payload.sub },
        update: { email: payload.email, name: payload.name, userId: user.id },
        create: { sub: payload.sub, email: payload.email, name: payload.name, userId: user.id }
      })
    }

    const token = signJwt({ sub: user.id, role: user.role })
    return res.json({ token, user })
  } catch (e: any) {
    let alg: string | undefined
    try {
      const h = String(req.body?.idToken || '').split('.')[0]
      if (h) {
        const b = Buffer.from(h.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
        const j = JSON.parse(b.toString('utf-8'))
        alg = j?.alg
      }
    } catch {
      alg = undefined
    }
    logError('google_auth_failed', { error: e, ip: req.ip, alg, audience: env.GOOGLE_CLIENT_ID })
    const details = e?.message || e?.response?.data || 'unknown_error'
    return res.status(500).json({ error: 'google_auth_failed', details })   
  }
})

router.get('/google/url', async (_req: Request, res: Response) => {
  try {
    const qs = _req.query as Record<string, string | string[] | undefined>
    const state = typeof qs.state === 'string' ? qs.state : undefined
    const url = await getGoogleAuthUrl(state)    
    return res.json({ url })
  } catch {
    return res.status(500).json({ error: 'google_url_failed' })
  }
})

router.get('/google', async (_req: Request, res: Response) => {
  try {
    const qs = _req.query as Record<string, string | string[] | undefined>
    const state = typeof qs.state === 'string' ? qs.state : undefined
    const url = await getGoogleAuthUrl(state)
    return res.redirect(url)
  } catch {
    return res.status(500).json({ error: 'google_redirect_failed' })
  }
})

router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ error: 'google_env_missing' })
    }
    const code = req.query.code as string
    logInfo('google_code_received', { codeLength: code ? code.length : 0 })
    if (!code) return res.status(400).json({ error: 'code_required' })
    const ip = req.ip
    const result = await handleGoogleCallback(code, ip)
    if (req.query.raw) {
      return res.json(result)
    }
    const isSecure = env.NODE_ENV !== 'development'
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    const st = typeof req.query.state === 'string' ? req.query.state : ''
    const buy = st ? `?buy=${encodeURIComponent(st)}` : ''
    return res.redirect(`${env.POST_LOGIN_REDIRECT_URL}${buy}`)
  } catch (e: any) {
    logError('google_callback_failed', { error: e, ip: req.ip, clientId: env.GOOGLE_CLIENT_ID, redirectUri: env.GOOGLE_REDIRECT_URI })
    const details = e?.response?.data || e?.message || 'unknown_error'
    return res.status(500).json({ error: 'google_callback_failed', details })
  }
})

router.get('/whoami', async (req: Request, res: Response) => {
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
    const access = cookies['access_token']
    if (!access) return res.status(401).json({ error: 'unauthenticated' })
    let payload: any
    try { payload = jwt.verify(access, env.JWT_SECRET) } catch { return res.status(401).json({ error: 'unauthenticated' }) }
    const id = String(payload?.sub || '')
    if (!id) return res.status(401).json({ error: 'unauthenticated' })
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'user_not_found' })
    return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, role: user.role, accessToken: access })
  } catch {
    return res.status(500).json({ error: 'whoami_failed' })
  }
})

router.get('/success', async (_req: Request, res: Response) => {
  try {
    const q = _req.query as Record<string, string | string[] | undefined>
    const b = typeof q.buy === 'string' && q.buy ? `?buy=${encodeURIComponent(q.buy)}` : ''
    return res.redirect(`${env.FRONTEND_URL}/login${b}`)   
  } catch {
    return res.status(500).json({ error: 'success_failed' })
  }
})

router.post('/local/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = localRegisterSchema.parse(req.body)
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasDigit = /\d/.test(password)
    if (!(hasUpper && hasLower && hasDigit)) return res.status(400).json({ error: 'weak_password' })
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync(password, salt, 32).toString('hex')
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` },
      create: { email, name, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` }
    })
    return res.status(201).json({ id: user.id })
  } catch (e: any) {
    if (e?.issues) { logError('local_register_invalid_body', { error: e }); return res.status(400).json({ error: 'invalid_body', details: e.issues }) }
    const message = e?.code === 'P2002' ? 'email_exists' : 'local_register_failed'
    const status = e?.code === 'P2002' ? 409 : 500
    logError('local_register_failed', { error: e })
    return res.status(status).json({ error: message, details: e?.message || e?.code || 'unknown_error' })
  }
})

router.post('/local/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = localLoginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.passwordHash) return res.status(401).json({ error: 'invalid_credentials' })
    const [salt, stored] = String(user.passwordHash).split(':')
    const verify = scryptSync(password, salt, 32).toString('hex')
    if (verify !== stored) return res.status(401).json({ error: 'invalid_credentials' })
    const sid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
    await prisma.loginSession.create({ data: { userId: user.id, sessionId: sid, expiresAt } })
    const accessToken = signJwt({ sub: user.id, role: user.role, sid }, env.ACCESS_TOKEN_DAYS)
    const refreshToken = signJwt({ sub: user.id, type: 'refresh', sid }, env.REFRESH_TOKEN_DAYS)
    const isSecure = env.NODE_ENV !== 'development'
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: env.ACCESS_TOKEN_DAYS * 24 * 60 * 60 * 1000
    })
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    })
    return res.json({ accessToken, refreshToken, user })
  } catch (e: any) {
    if (e?.issues) return res.status(400).json({ error: 'invalid_body', details: e.issues })
    return res.status(500).json({ error: 'local_login_failed' })
  }
})

router.post('/logout', async (req: Request, res: Response) => {
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
    const refresh = cookies['refresh_token']
    let sid: string | undefined
    if (refresh) {
      try { const rp: any = jwt.verify(refresh, env.JWT_SECRET); sid = rp?.sid } catch {}
    }
    const access = cookies['access_token']
    if (!sid && access) {
      try { const ap: any = jwt.decode(access); sid = ap?.sid } catch {}
    }
    if (sid) {
      try {
        await prisma.loginSession.update({ where: { sessionId: sid }, data: { revokedAt: new Date() } })
        audit('logout', { sid })
      } catch {}
    }
    const isSecure = env.NODE_ENV !== 'development'
    res.clearCookie('access_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
    res.clearCookie('refresh_token', { httpOnly: true, secure: isSecure, sameSite: 'lax' })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'logout_failed' })
  }
})

router.post('/dev/admin-token', async (req: Request, res: Response) => {
  try {
    if (env.NODE_ENV !== 'development') return res.status(403).json({ error: 'forbidden' })
    const { email, name } = (req.body || {}) as { email?: string; name?: string }
    const e = email || 'admin@example.com'
    const n = name || 'Admin'
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync('dev-admin-password', salt, 32).toString('hex')
    const user = await prisma.user.upsert({
      where: { email: e },
      update: { name: n, role: Role.ADMIN, passwordHash: `${salt}:${hash}` },
      create: { email: e, name: n, role: Role.ADMIN, passwordHash: `${salt}:${hash}` }
    })
    const token = signJwt({ sub: user.id, role: user.role })
    return res.json({ token, user })
  } catch {
    return res.status(500).json({ error: 'dev_admin_token_failed' })
  }
})

router.post('/dev/participant-token', async (req: Request, res: Response) => {
  try {
    if (env.NODE_ENV !== 'development') return res.status(403).json({ error: 'forbidden' })
    const { email, name } = (req.body || {}) as { email?: string; name?: string }
    const e = email || 'organizer@example.com'
    const n = name || 'Organizer'
    const salt = randomBytes(16).toString('hex')
    const hash = scryptSync('dev-organizer-password', salt, 32).toString('hex')
    const user = await prisma.user.upsert({
      where: { email: e },
      update: { name: n, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` },
      create: { email: e, name: n, role: Role.ORGANIZER, passwordHash: `${salt}:${hash}` }
    })
    const token = signJwt({ sub: user.id, role: user.role })
    return res.json({ token, user })
  } catch {
    return res.status(500).json({ error: 'dev_participant_token_failed' })
  }
})

export default router
