import { OAuth2Client } from 'google-auth-library'
import { env } from '../../config/env'
import { prisma } from '../../prisma'
import { Role } from '@prisma/client'
import { signJwt } from '../../middlewares/auth'

function getClient() {
  // forma mais comum: args separados
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  )
}

export async function getGoogleAuthUrl(state?: string) {
  const client = getClient()

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    state
    // não precisa passar redirect_uri nem client_id aqui,
    // ele já usa o que foi configurado no OAuth2Client
  })

  return url
}

export async function handleGoogleCallback(code: string, ip?: string) {
  const client = getClient()

  // aqui também, só o code já basta
  const { tokens } = await client.getToken(code)

  if (!tokens.id_token) throw new Error('invalid_id_token')

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID
  })

  const payload = ticket.getPayload()
  if (!payload?.email || !payload?.name) throw new Error('invalid_google_payload')

  const { user, accessToken, refreshToken } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name },
      create: { email: payload.email!, name: payload.name!, role: Role.ORGANIZER }
    })

    if (payload.sub) {
      await tx.userGoogle.upsert({
        where: { sub: payload.sub },
        update: { email: payload.email!, name: payload.name!, userId: user.id },
        create: { sub: payload.sub, email: payload.email!, name: payload.name!, userId: user.id }
      })
    }

    const sessionId =
      globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await tx.loginSession.create({
      data: { userId: user.id, sessionId, ip, expiresAt }
    })

    const accessToken = signJwt({ sub: user.id, role: user.role, sid: sessionId }, 7)
    const refreshToken = signJwt({ sub: user.id, type: 'refresh', sid: sessionId }, 30)
    
    const eventsCount = await tx.event.count({ where: { userId: user.id } })

    return { user: { ...user, eventsCount }, accessToken, refreshToken }
  })

  return { accessToken, refreshToken, user }
}
