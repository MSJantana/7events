import { Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { eventService } from '../services/eventService'
import { isAdmin, isOwner } from '../utils/authz'
import { createEventSchema, updateEventSchema } from '../utils/validation'

type AuthedRequest = Request & { user: { sub: string; role: Role; sid?: string } }

export const eventController = {
  async list(req: Request, res: Response) {
    const authed = !!(req as any).user
    const status = authed ? ((req.query.status as any) || 'PUBLISHED') : 'PUBLISHED'
    const events = await eventService.listEvents(status)
    res.json(events)
  },

  async get(req: Request, res: Response) {
    const { id } = req.params
    const event = await eventService.getEventById(id)
    if (!event) return res.status(404).json({ error: 'not_found' })
    res.json(event)
  },

  async create(req: AuthedRequest, res: Response) {
    try {
      const body = createEventSchema.parse(req.body)
      const event = await eventService.createEvent({
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        userId: req.user.sub
      } as any)
      res.status(201).json(event)
    } catch (e: any) {
      return res.status(400).json({ error: 'invalid_body', details: e.errors })
    }
  },

  async update(req: AuthedRequest, res: Response) {
    const { id } = req.params
    const existing = await eventService.getEventById(id)
    if (!existing) return res.status(404).json({ error: 'not_found' })
    if (!isAdmin(req) && !isOwner(req, existing.userId)) return res.status(403).json({ error: 'forbidden' })

    try {
      const body = updateEventSchema.parse(req.body)
      const data: any = { ...body }
      if (data.startDate) data.startDate = new Date(data.startDate)
      if (data.endDate) data.endDate = new Date(data.endDate)

      const updated = await eventService.updateEvent(id, data)
      res.json(updated)
    } catch (e: any) {
      return res.status(400).json({ error: 'invalid_body', details: e.errors })
    }
  },

  async publish(req: AuthedRequest, res: Response) {
    const { id } = req.params
    const existing = await eventService.getEventById(id)
    if (!existing) return res.status(404).json({ error: 'not_found' })
    if (!isAdmin(req) && !isOwner(req, existing.userId)) return res.status(403).json({ error: 'forbidden' })
    if (existing.capacity <= 0) return res.status(400).json({ error: 'invalid_capacity' })

    const updated = await eventService.publishEvent(id)
    res.json(updated)
  },

  async cancel(req: AuthedRequest, res: Response) {
    const { id } = req.params
    const existing = await eventService.getEventById(id)
    if (!existing) return res.status(404).json({ error: 'not_found' })
    if (!isAdmin(req) && !isOwner(req, existing.userId)) return res.status(403).json({ error: 'forbidden' })

    const updated = await eventService.cancelEvent(id)
    res.json(updated)
  }
}
