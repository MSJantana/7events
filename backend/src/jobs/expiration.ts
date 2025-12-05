import { prisma } from '../prisma'
import { audit } from '../utils/audit'
import { env } from '../config/env'

export function startReservationExpiryJob() {
  const ttlMs = env.RESERVATION_TTL_MINUTES * 60 * 1000
  
  setInterval(async () => {
    try {
      const now = new Date()
      await prisma.event.updateMany({ where: { status: 'PUBLISHED', endDate: { lt: now } }, data: { status: 'FINALIZED' } })
    } catch (e) {
      console.error('Failed to finalize events', e)
    }

    const cutoff = new Date(Date.now() - ttlMs)
    const stale = await prisma.ticket.findMany({
      where: { status: 'WAITING', createdAt: { lt: cutoff } },
      take: 100
    })
    
    for (const t of stale) {
      try {
        await prisma.$transaction(async (tx) => {
          const ticket = await tx.ticket.findUnique({ where: { id: t.id } })
          if (ticket?.status !== 'WAITING') return
          
          const order = await tx.order.findUnique({ where: { id: ticket.orderId! } })
          if (order?.status !== 'PENDING') return
          
          await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'CANCELED' } })
          await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELED' } })
          
          await tx.event.update({ where: { id: ticket.eventId }, data: { capacity: { increment: 1 } } })
          await tx.ticketType.update({ where: { id: ticket.ticketTypeId }, data: { quantity: { increment: 1 } } })
          
          audit('reservation_expired', { ticketId: ticket.id, orderId: order.id })
        }, { isolationLevel: 'Serializable' })
      } catch (e) {
        console.error(`Failed to expire ticket ${t.id}`, e)
      }
    }
  }, 60 * 1000)
}
