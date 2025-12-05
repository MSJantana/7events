import { Router, Request, Response } from 'express'
import { requireAuth, signJwt } from '../middlewares/auth'
import { isAdmin } from '../utils/authz'
import { prisma } from '../prisma'
import { Role } from '@prisma/client'
import { createUserSchema, updateUserSchema, localLoginSchema } from '../utils/validation'
import { randomBytes, scryptSync } from 'node:crypto'

const router = Router()

router.post('/', requireAuth, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
  try {
    const { email, name, role, password } = createUserSchema.parse(req.body)
    let passwordHash: string | undefined
    if (password) {
      const hasUpper = /[A-Z]/.test(password)
      const hasLower = /[a-z]/.test(password)
      const hasDigit = /\d/.test(password)
      if (!(hasUpper && hasLower && hasDigit)) return res.status(400).json({ error: 'weak_password' })
      const salt = randomBytes(16).toString('hex')
      const hash = scryptSync(password, salt, 32).toString('hex')
      passwordHash = `${salt}:${hash}`
    }
    const created = await prisma.user.create({
      data: { email, name, role: role as Role, passwordHash }
    })
    return res.status(201).json(created)
  } catch (e: any) {
    if (e?.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })
    const message = e?.code === 'P2002' ? 'email_exists' : 'user_create_failed'
    const status = e?.code === 'P2002' ? 409 : 500
    return res.status(status).json({ error: message })
  }
})

export default router

router.get('/', requireAuth, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    return res.json(users)
  } catch {
    return res.status(500).json({ error: 'list_failed' })
  }
})

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
  try {
    const { id } = req.params
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'not_found' })
    return res.json(user)
  } catch {
    return res.status(500).json({ error: 'get_failed' })
  }
})

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
  try {
    const { id } = req.params
    const body = updateUserSchema.parse(req.body)
    const data: any = { ...body }
    if (body.password) {
      const hasUpper = /[A-Z]/.test(body.password)
      const hasLower = /[a-z]/.test(body.password)
      const hasDigit = /\d/.test(body.password)
      if (!(hasUpper && hasLower && hasDigit)) return res.status(400).json({ error: 'weak_password' })
      const salt = randomBytes(16).toString('hex')
      const hash = scryptSync(body.password, salt, 32).toString('hex')
      data.passwordHash = `${salt}:${hash}`
      delete data.password
    }
    const updated = await prisma.user.update({ where: { id }, data })
    return res.json(updated)
  } catch (e: any) {
    if (e?.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })
    if (e?.code === 'P2025') return res.status(404).json({ error: 'not_found' })
    if (e?.code === 'P2002') return res.status(409).json({ error: 'email_exists' })
    return res.status(500).json({ error: 'update_failed' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = localLoginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'user_not_registered' })
    if (!user.passwordHash) return res.status(401).json({ error: 'invalid_credentials' })
    const [salt, stored] = String(user.passwordHash).split(':')
    const verify = scryptSync(password, salt, 32).toString('hex')
    if (verify !== stored) return res.status(401).json({ error: 'invalid_credentials' })
    const token = signJwt({ sub: user.id, role: user.role })
    return res.json({ token, user })
  } catch (e: any) {
    if (e?.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })
    return res.status(500).json({ error: 'user_login_failed' })
  }
})

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
  try {
    const { id } = req.params
    await prisma.user.delete({ where: { id } })
    return res.status(204).send()
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'not_found' })
    return res.status(500).json({ error: 'delete_failed' })
  }
})
