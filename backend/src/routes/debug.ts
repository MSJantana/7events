import { Router, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env'
import { requireAuth } from '../middlewares/auth'
import { isAdmin } from '../utils/authz'
import { prisma } from '../prisma'

const router = Router()

router.post('/postman/env', async (req: Request, res: Response) => {
  try {
    const payload = req.body || {}
    const dir = path.join(process.cwd(), '.cache')
    const file = path.join(dir, 'postman-env.json')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    fs.writeFileSync(file, JSON.stringify({ savedAt: new Date().toISOString(), ...payload }, null, 2))
    return res.json({ saved: true })
  } catch {
    return res.status(500).json({ error: 'save_failed' })
  }
})

router.get('/postman/env', async (_req: Request, res: Response) => {
  try {
    const file = path.join(process.cwd(), '.cache', 'postman-env.json')
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'not_found' })
    const data = fs.readFileSync(file, 'utf-8')
    return res.type('application/json').send(data)
  } catch {
    return res.status(500).json({ error: 'read_failed' })
  }
})

router.post('/cleanup', requireAuth, async (req: Request, res: Response) => {
  try {
    if (env.NODE_ENV !== 'development') return res.status(403).json({ error: 'forbidden' })
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
    const result: any = {}
    result.payment = await prisma.payment.deleteMany({})
    result.ticket = await prisma.ticket.deleteMany({})
    result.ticketType = await prisma.ticketType.deleteMany({})
    result.order = await prisma.order.deleteMany({})
    result.event = await prisma.event.deleteMany({})
    result.loginSession = await prisma.loginSession.deleteMany({})
    result.userGoogle = await prisma.userGoogle.deleteMany({})
    result.user = await prisma.user.deleteMany({})
    return res.json({ ok: true, deleted: result })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'cleanup_failed' })
  }
})


export default router
