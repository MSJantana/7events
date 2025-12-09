import { Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { processEventImage, removePreviousUnderUploads } from '../modules/images/image.service'
import type { Role } from '@prisma/client'
import { eventService } from '../services/eventService'
import { prisma } from '../prisma'
import { isAdmin, isOwner } from '../utils/authz'
import { createEventSchema, updateEventSchema } from '../utils/validation'

type AuthedRequest = Request & { user: { sub: string; role: Role; sid?: string } }
type UploadRequest = AuthedRequest & { file?: Express.Multer.File }

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

  async getBySlug(req: Request, res: Response) {
    const { slug } = req.params as { slug: string }
    function toSlug(s: string) {
      return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }
    const events = await eventService.listEvents('PUBLISHED')
    const found = events.find(e => toSlug(e.title) === slug)
    if (!found) return res.status(404).json({ error: 'not_found' })
    try {
      const now = new Date()
      if (new Date(found.endDate).getTime() <= now.getTime() && found.status !== 'FINALIZED') {
        const upd = await eventService.updateEvent(found.id, { status: 'FINALIZED' } as any)
        Object.assign(found, { status: upd.status })
      }
    } catch {}
    const ticketTypes = await prisma.ticketType.findMany({ where: { eventId: found.id } })
    const minPrice = ticketTypes.length ? Math.min(...ticketTypes.map(t => Number(t.price))) : 0
    return res.json({
      id: found.id,
      title: found.title,
      description: found.description,
      location: found.location,
      startDate: found.startDate,
      endDate: found.endDate,
      status: found.status,
      imageUrl: found.imageUrl,
      capacity: found.capacity,
      minPrice,
      ticketTypes
    })
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
  },

  async uploadImage(req: UploadRequest, res: Response) {
    const { id } = req.params
    const existing = await eventService.getEventById(id)
    if (!existing) return res.status(404).json({ error: 'not_found' })
    if (!isAdmin(req) && !isOwner(req, existing.userId)) return res.status(403).json({ error: 'forbidden' })
    if (!req.file) return res.status(400).json({ error: 'file_required' })
    const base = `${req.protocol}://${req.get('host')}`
    const uploadDir = path.join(process.cwd(), 'uploads', 'events')
    const tmpPath = req.file.path
    try {
      const { mainName } = await processEventImage(tmpPath, uploadDir)
      fs.unlink(tmpPath, () => {})
      removePreviousUnderUploads(base, existing.imageUrl || '')
      const url = `${base}/uploads/events/${mainName}`
      const updated = await eventService.updateEvent(id, { imageUrl: url })
      return res.json(updated)
    } catch (e: any) {
      try { fs.unlinkSync(tmpPath) } catch {}
      return res.status(500).json({ error: 'upload_failed', details: e?.message })
    }
  }
}
