import { Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { processEventImage, removePreviousUnderUploads } from '../modules/images/image.service'
import type { Role } from '@prisma/client'
import { eventService } from '../services/eventService'
import { prisma } from '../prisma'
import { isAdmin, isOwner } from '../utils/authz'
import { createEventSchema, updateEventSchema } from '../utils/validation'
import { logWarn } from '../utils/logger'

type AuthedRequest = Request & { user: { sub: string; role: Role; sid?: string } }
type UploadRequest = AuthedRequest & { file?: Express.Multer.File }

function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(?:^-+)|(?:-+$)/g, '')
}

export const eventController = {
  async list(req: Request, res: Response) {
    const authed = !!(req as any).user
    const status = authed ? ((req.query.status as any) || 'PUBLISHED') : 'PUBLISHED'
    const events = await eventService.listEvents(status)
    res.json(events)
  },

  async get(req: Request, res: Response) {
    const { id } = req.params
    const found = await eventService.getEventById(id)
    if (!found) return res.status(404).json({ error: 'not_found' })
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

  async getBySlug(req: Request, res: Response) {
    const { slug } = req.params as { slug: string }
    const events = await eventService.listEvents('PUBLISHED')
    const found = events.find(e => toSlug(e.title) === slug)
    if (!found) return res.status(404).json({ error: 'not_found' })
    try {
      const now = new Date()
      const e = new Date(found.endDate)
      const eod = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999)
      if (eod.getTime() <= now.getTime() && found.status !== 'FINALIZED') {
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
      const raw = String(body.startDate)
      let y = 0, mo = 0, d = 0
      const m1 = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(raw)
      if (m1) {
        y = Number(m1[1] || 0); mo = Number(m1[2] || 0); d = Number(m1[3] || 0)
      } else {
        const m2 = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(raw)
        y = Number(m2?.[3] || 0); mo = Number(m2?.[2] || 0); d = Number(m2?.[1] || 0)
      }
      let hh = 0, mm = 0
      if (typeof body.startTime === 'string') {
        const tm = /^(\d{2}):(\d{2})$/.exec(body.startTime)
        if (tm) { hh = Number(tm[1] || 0); mm = Number(tm[2] || 0) }
      }
      const start = new Date(y, mo - 1, d, hh, mm, 0, 0)
      const end = new Date(y, mo - 1, d, 23, 59, 59, 999)
      const event = await eventService.createEvent({
        title: body.title,
        description: body.description,
        location: body.location,
        capacity: body.capacity,
        imageUrl: body.imageUrl,
        startDate: start,
        endDate: end,
        userId: req.user.sub
      } as any)
      res.status(201).json(event)
    } catch (e: any) {
      const issues = e?.issues || e?.errors || []
      logWarn('event_create_invalid_body', { requestId: (req as any)?.requestId, issuesCount: Array.isArray(issues) ? issues.length : 0, fields: Array.isArray(issues) ? issues.map((it: any) => it?.path?.[0]).filter(Boolean) : undefined })
      return res.status(400).json({ error: 'invalid_body', details: issues })
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
      if ('startTime' in data) delete data.startTime
      if (data.startDate) {
        const raw = String(data.startDate)
        let y = 0, mo = 0, d = 0
        const m1 = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(raw)
        if (m1) {
          y = Number(m1[1] || 0); mo = Number(m1[2] || 0); d = Number(m1[3] || 0)
        } else {
          const m2 = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(raw)
          y = Number(m2?.[3] || 0); mo = Number(m2?.[2] || 0); d = Number(m2?.[1] || 0)
        }
        let hh = 0, mm = 0
        if (typeof body.startTime === 'string') {
          const tm = /^(\d{2}):(\d{2})$/.exec(body.startTime)
          if (tm) { hh = Number(tm[1] || 0); mm = Number(tm[2] || 0) }
        }
        data.startDate = new Date(y, mo - 1, d, hh, mm, 0, 0)
        data.endDate = new Date(y, mo - 1, d, 23, 59, 59, 999)
      } else if (typeof body.startTime === 'string') {
        const tm = /^(\d{2}):(\d{2})$/.exec(body.startTime)
        if (tm) {
          const hh = Number(tm[1] || 0), mm = Number(tm[2] || 0)
          const prev = new Date(existing.startDate)
          data.startDate = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), hh, mm, 0, 0)
        }
      }

      const finalStart = data.startDate ? new Date(data.startDate) : new Date(existing.startDate)
      const finalEnd = data.endDate ? new Date(data.endDate) : new Date(existing.endDate)
      if (finalStart.getTime() > finalEnd.getTime()) {
        const details = [{ path: ['startDate'], message: 'start_after_end' }]
        return res.status(400).json({ error: 'invalid_body', details })
      }

      const updated = await eventService.updateEvent(id, data)
      res.json(updated)
    } catch (e: any) {
      const issues = e?.issues || e?.errors || []
      logWarn('event_update_invalid_body', { requestId: (req as any)?.requestId, issuesCount: Array.isArray(issues) ? issues.length : 0, fields: Array.isArray(issues) ? issues.map((it: any) => it?.path?.[0]).filter(Boolean) : undefined })
      return res.status(400).json({ error: 'invalid_body', details: issues })
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
