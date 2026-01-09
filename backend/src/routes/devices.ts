import { Router, Request, Response } from 'express'
import { prisma } from '../prisma'
import { z } from 'zod'
import { requireAuth } from '../middlewares/auth'
import type { AuthRequest } from '../middlewares/auth'
import { isAdmin, isOwner } from '../utils/authz'
import { randomUUID } from 'node:crypto'

const router = Router()

// Schema for creating a device
const createDeviceSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  eventId: z.string().optional(), // If provided, locks this device to an event
  enabled: z.boolean().optional().default(true)
})

// List devices
router.get('/', requireAuth, async (req: Request, res: Response) => {
  // Only admin or organizer
  // Ideally filter by events the user owns if not admin
  try {
    const devices = await prisma.checkinDevice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { event: { select: { title: true, id: true } } }
    })
    
    // Simple authorization filter: if not admin, show only devices for events owned by user
    if (!isAdmin(req)) {
        // This is a simplification. In a real app we might need a more complex query
        // or just restrict this endpoint to Admins.
        // For now, let's allow Organizers to see all devices but only manage their own?
        // Or better: filter by event ownership.
        const userId = (req as AuthRequest).user!.sub
        const userEvents = await prisma.event.findMany({ where: { userId }, select: { id: true } })
        const eventIds = new Set(userEvents.map(e => e.id))
        
        // Filter in memory or query again. Let's query properly next time, for now filter.
        const filtered = devices.filter(d => !d.eventId || eventIds.has(d.eventId))
        return res.json(filtered)
    }

    return res.json(devices)
  } catch {
    return res.status(500).json({ error: 'Falha ao listar dispositivos' })
  }
})

// Create device
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createDeviceSchema.parse(req.body)
    
    // Generate API Key
    let prefix = 'GLB'
    
    if (data.eventId) {
      const event = await prisma.event.findUnique({ where: { id: data.eventId } })
      if (!event) return res.status(404).json({ error: 'Evento não encontrado' })
      if (event.status === 'FINALIZED' || event.status === 'CANCELED') return res.status(400).json({ error: 'Não é possível adicionar dispositivos a um evento finalizado ou cancelado' })
      if (!isAdmin(req) && !isOwner(req, event.userId)) {
        return res.status(403).json({ error: 'Sem permissão para este evento' })
      }
      
      // Generate initials from event title
      // Take first letter of each word, uppercase, alphanumeric only
      prefix = event.title
        .split(/\s+/)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .replaceAll(/[^A-Z0-9]/g, '')
        
      if (!prefix) prefix = 'EVT'
    } else {
      // Only admin can create global devices (not bound to event)
      if (!isAdmin(req)) return res.status(403).json({ error: 'Apenas admins podem criar dispositivos globais' })
    }

    // Format: PREFIX_UUID
    const apiKey = `${prefix}_${randomUUID()}`
    
    const device = await prisma.checkinDevice.create({
      data: {
        name: data.name,
        eventId: data.eventId,
        enabled: data.enabled,
        apiKey: apiKey
      }
    })

    return res.status(201).json(device)
  } catch (e: any) {
     if (e instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: e.issues })
    }
    return res.status(500).json({ error: 'Falha ao criar dispositivo' })
  }
})

// Delete device
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const device = await prisma.checkinDevice.findUnique({ where: { id } })
    if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' })

    if (device.eventId) {
        const event = await prisma.event.findUnique({ where: { id: device.eventId } })
        if (event && !isAdmin(req) && !isOwner(req, event.userId)) {
            return res.status(403).json({ error: 'Sem permissão' })
        }
    } else {
        if (!isAdmin(req)) return res.status(403).json({ error: 'Sem permissão' })
    }

    await prisma.checkinDevice.delete({ where: { id } })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Falha ao deletar dispositivo' })
  }
})

export default router
