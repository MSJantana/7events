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
import { parseDateParts, parseTimeParts } from '../utils/dateParsers'

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

function prepareUpdateData(body: any, existing: any) {
  const data: any = { ...body }
  if ('startTime' in data) delete data.startTime

  if (data.startDate) {
    const dParts = parseDateParts(String(data.startDate))
    if (dParts) {
      let hh = 0, mm = 0
      if (typeof body.startTime === 'string') {
        const tParts = parseTimeParts(body.startTime)
        if (tParts) { hh = tParts.hh; mm = tParts.mm }
      }
      data.startDate = new Date(dParts.y, dParts.mo - 1, dParts.d, hh, mm, 0, 0)
      data.endDate = new Date(dParts.y, dParts.mo - 1, dParts.d, 23, 59, 59, 999)
    }
  } else if (typeof body.startTime === 'string') {
    const tParts = parseTimeParts(body.startTime)
    if (tParts) {
      const prev = new Date(existing.startDate)
      data.startDate = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), tParts.hh, tParts.mm, 0, 0)
    }
  }
  return data
}

export const eventController = {
  async list(req: Request, res: Response) {
    const authed = !!(req as any).user
    const q = (req.query.status as string) || 'PUBLISHED'
    const allowed = authed ? ['PUBLISHED', 'DRAFT', 'CANCELED', 'FINALIZED'] : ['PUBLISHED', 'FINALIZED']
    
    let status: string | string[] = 'PUBLISHED'
    if (q.includes(',')) {
      const parts = q.split(',').map(s => s.trim()).filter(s => allowed.includes(s))
      if (parts.length > 0) status = parts
    } else {
      status = allowed.includes(q) ? q : status
    }

    const events = await eventService.listEvents(status as any)
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
      
      const toDateBRT = (dStr: string, tStr?: string) => {
        const dp = parseDateParts(dStr)
        if (!dp) return new Date()
        let h = 0, m = 0
        if (tStr) {
          const tp = parseTimeParts(tStr)
          if (tp) { h = tp.hh; m = tp.mm }
        }
        return new Date(Date.UTC(dp.y, dp.mo - 1, dp.d, h + 3, m, 0, 0))
      }

      const start = toDateBRT(String(body.startDate), String(body.startTime))
      const end = toDateBRT(String(body.endDate), String(body.endTime))
      
      if (start.getTime() < Date.now()) {
        const details = [{ path: ['startDate'], message: 'date_in_past' }]
        return res.status(400).json({ error: 'invalid_body', details })
      }

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
      console.error('EVENT CREATE ERROR:', e) // Direct console log for debugging
      // Check for Foreign Key Constraint Violation (User not found)
      // P2003 is the standard code, but sometimes it might vary or be wrapped
      if (e?.code === 'P2003' || String(e?.message || '').includes('Foreign key constraint failed')) {
        return res.status(401).json({ error: 'unauthorized', details: 'user_not_found' })
      }
      const issues = e?.issues || e?.errors || []
      // Fix: Pass 'e' directly as error property, not e.message
      logWarn('event_create_failed', { requestId: (req as any)?.requestId, issuesCount: Array.isArray(issues) ? issues.length : 0, error: e })
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
      const data = prepareUpdateData(body, existing)

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
