import { Router, Request, Response } from 'express'
import { prisma } from '../prisma'
import { requireAuth } from '../middlewares/auth'
import { isAdmin, isOwner } from '../utils/authz'
import { createTicketTypeSchema, updateTicketTypeSchema } from '../utils/validation'

const router = Router({ mergeParams: true })

router.get('/', async (req: Request, res: Response) => {
  const { eventId } = req.params as { eventId: string }
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return res.status(404).json({ error: 'event_not_found' })
  const authed = !!(req as any).user
  if (!authed && event.status !== 'PUBLISHED') return res.status(401).json({ error: 'unauthorized' })
  if (authed && !isAdmin(req) && !isOwner(req, event.userId) && event.status !== 'PUBLISHED') {
    return res.status(403).json({ error: 'forbidden' })
  }
  const list = await prisma.ticketType.findMany({ where: { eventId } })
  res.json(list)
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { eventId } = req.params as { eventId: string }
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return res.status(404).json({ error: 'event_not_found' })
  if (!isAdmin(req) && !isOwner(req, event.userId)) return res.status(403).json({ error: 'forbidden' })
  let parsed: { name: string; price: number; quantity: number }
  try {
    parsed = createTicketTypeSchema.parse(req.body) as any
  } catch (e: any) {
    return res.status(400).json({ error: 'invalid_body', details: e.errors })
  }
  const created = await prisma.ticketType.create({
    data: { eventId, name: parsed.name, price: parsed.price, quantity: parsed.quantity }
  })
  res.status(201).json(created)
})

export default router

router.patch('/:ticketTypeId', requireAuth, async (req: Request, res: Response) => {
  const { ticketTypeId } = req.params as any
  const tt = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } })
  if (!tt) return res.status(404).json({ error: 'ticket_type_not_found' })
  const event = await prisma.event.findUnique({ where: { id: tt.eventId } })
  if (!event) return res.status(404).json({ error: 'event_not_found' })
  if (!isAdmin(req) && !isOwner(req, event.userId)) return res.status(403).json({ error: 'forbidden' })
  let data: any
  try {
    data = updateTicketTypeSchema.parse(req.body)
  } catch (e: any) {
    return res.status(400).json({ error: 'invalid_body', details: e.errors })
  }
  const updated = await prisma.ticketType.update({ where: { id: tt.id }, data })
  res.json(updated)
})

router.delete('/:ticketTypeId', requireAuth, async (req: Request, res: Response) => {
  const { ticketTypeId } = req.params as any
  const tt = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } })
  if (!tt) return res.status(404).json({ error: 'ticket_type_not_found' })
  const event = await prisma.event.findUnique({ where: { id: tt.eventId } })
  if (!event) return res.status(404).json({ error: 'event_not_found' })
  if (!isAdmin(req) && !isOwner(req, event.userId)) return res.status(403).json({ error: 'forbidden' })
  await prisma.ticketType.delete({ where: { id: tt.id } })
  res.status(204).send()
})
