import { prisma } from '../prisma'
import { PaymentMethod } from '@prisma/client'
import { audit } from '../utils/audit'

export const orderService = {
  async listAllOrders() {
    return prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tickets: { include: { ticketType: true, event: true, payment: true } }, user: true }
    })
  },
  async listUserOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { tickets: { include: { ticketType: true, event: true, payment: true } } }
    })
  },

  async getOrderById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: { tickets: true, user: true } })
  },

  async createOrder(userId: string, eventId: string, ticketTypeId: string) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } })
      if (!event) throw new Error('event_not_found')
      if (event.status !== 'PUBLISHED') throw new Error('event_not_published')
      if (new Date(event.endDate).getTime() <= Date.now()) throw new Error('event_finalized')
      if (event.capacity <= 0) throw new Error('event_sold_out')

      const tt = await tx.ticketType.findUnique({ where: { id: ticketTypeId } })
      if (!tt || tt?.eventId !== eventId) throw new Error('ticket_type_not_found')
      if (tt.quantity <= 0) throw new Error('ticket_type_sold_out')

      await tx.event.update({ where: { id: eventId }, data: { capacity: { decrement: 1 } } })
      await tx.ticketType.update({ where: { id: ticketTypeId }, data: { quantity: { decrement: 1 } } })

      const year = new Date(event.startDate).getFullYear()
      const prefix = String(event.title || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'EVT'
      const base = `${prefix}-${year}`
      const last = await tx.order.findMany({ where: { code: { startsWith: base + '-' } }, select: { code: true }, orderBy: { createdAt: 'desc' }, take: 1 })
      let seq = 1
      if (last.length > 0) {
        const m = /-(\d+)$/.exec(last[0].code || '')
        if (m) seq = Number(m[1]) + 1
      }
      const code = `${base}-${String(seq).padStart(5, '0')}`

      const order = await tx.order.create({ data: { userId, ticketQuantity: 1, totalPrice: tt.price, code } })
      const ticket = await tx.ticket.create({
        data: {
          orderId: order.id,
          ticketTypeId,
          eventId,
          status: 'WAITING'
        }
      })
      audit('order_reserved', { orderId: order.id, ticketId: ticket.id, eventId, ticketTypeId })

      if (tt.price === 0) {
        const updatedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: 'ACTIVE', userId }
        })
        const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } })
        audit('order_paid_free', { orderId: order.id, ticketId: ticket.id })
        return { order: updatedOrder, ticket: updatedTicket, price: tt.price }
      }

      return { order, ticket, price: tt.price }
    }, { isolationLevel: 'Serializable' })
  },

  async createOrderBulk(userId: string, eventId: string, items: Array<{ ticketTypeId: string; quantity: number }>) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } })
      if (!event) throw new Error('event_not_found')
      if (event.status !== 'PUBLISHED') throw new Error('event_not_published')
      if (new Date(event.endDate).getTime() <= Date.now()) throw new Error('event_finalized')

      const totalQty = items.reduce((acc, it) => acc + it.quantity, 0)
      if (event.capacity < totalQty) throw new Error('insufficient_capacity')

      const tts = await tx.ticketType.findMany({ where: { id: { in: items.map((i) => i.ticketTypeId) } } })
      const ttMap = new Map(tts.map((t) => [t.id, t]))
      for (const it of items) {
        const tt = ttMap.get(it.ticketTypeId)
        if (!tt || tt.eventId !== eventId) throw new Error('ticket_type_not_found')
        if (tt.quantity < it.quantity) throw new Error('ticket_type_insufficient_quantity')
      }

      await tx.event.update({ where: { id: eventId }, data: { capacity: { decrement: totalQty } } })
      for (const it of items) {
        await tx.ticketType.update({ where: { id: it.ticketTypeId }, data: { quantity: { decrement: it.quantity } } })
      }

      const totalPrice = items.reduce((sum, it) => {
        const tt = ttMap.get(it.ticketTypeId)!
        return sum + Number(tt.price) * it.quantity
      }, 0)

      const year = new Date(event.startDate).getFullYear()
      const prefix = String(event.title || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'EVT'
      const base = `${prefix}-${year}`
      const last = await tx.order.findMany({ where: { code: { startsWith: base + '-' } }, select: { code: true }, orderBy: { createdAt: 'desc' }, take: 1 })
      let seq = 1
      if (last.length > 0) {
        const m = /-(\d+)$/.exec(last[0].code || '')
        if (m) seq = Number(m[1]) + 1
      }
      const code = `${base}-${String(seq).padStart(5, '0')}`

      const order = await tx.order.create({ data: { userId, ticketQuantity: totalQty, totalPrice, code } })
      const tickets: any[] = []
      for (const it of items) {
        for (let i = 0; i < it.quantity; i++) {
          const t = await tx.ticket.create({
            data: { orderId: order.id, ticketTypeId: it.ticketTypeId, eventId, status: 'WAITING' }
          })
          tickets.push(t)
          audit('order_reserved', { orderId: order.id, ticketId: t.id, eventId, ticketTypeId: it.ticketTypeId })
        }
      }

      if (totalPrice === 0) {
        const updatedTickets: any[] = []
        for (const t of tickets) {
          const ut = await tx.ticket.update({ where: { id: t.id }, data: { status: 'ACTIVE', userId } })
          updatedTickets.push(ut)
        }
        const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } })
        audit('order_paid_free_bulk', { orderId: order.id, tickets: updatedTickets.map((x) => x.id) })
        return { order: updatedOrder, tickets: updatedTickets, price: totalPrice }
      }

      return { order, tickets, price: totalPrice }
    }, { isolationLevel: 'Serializable' })
  },

  async payOrder(orderId: string, userId: string, method: PaymentMethod) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { tickets: true } })
    if (!order) throw new Error('order_not_found')
    if (order.status !== 'PENDING') throw new Error('order_not_pending')

    const waiting = order.tickets.filter((t) => t.status === 'WAITING')
    if (waiting.length === 0) throw new Error('ticket_missing')

    return prisma.$transaction(async (tx) => {
      const payments: any[] = []
      for (const t of waiting) {
        const exists = await tx.payment.findUnique({ where: { ticketId: t.id } })
        if (exists) continue
        const tt = await tx.ticketType.findUnique({ where: { id: t.ticketTypeId } })
        if (!tt) throw new Error('ticket_type_not_found')
        const payment = await tx.payment.create({
          data: { ticketId: t.id, userId, amount: tt.price, status: 'COMPLETED', method }
        })
        payments.push(payment)
        await tx.ticket.update({ where: { id: t.id }, data: { status: 'ACTIVE', userId } })
        audit('order_paid', { orderId, ticketId: t.id, method })
      }
      const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } })
      const updatedTickets = await tx.ticket.findMany({ where: { orderId } })
      return { payments, tickets: updatedTickets, order: updatedOrder }
    }, { isolationLevel: 'Serializable' })
  },

  async cancelOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { tickets: true } })
    if (!order) throw new Error('order_not_found')
    if (order.status !== 'PENDING') throw new Error('order_not_pending')

    const waiting = order.tickets.filter((t) => t.status === 'WAITING')
    if (waiting.length === 0) throw new Error('no_waiting_tickets')

    return prisma.$transaction(async (tx) => {
      for (const t of waiting) {
        await tx.ticket.update({ where: { id: t.id }, data: { status: 'CANCELED' } })
        await tx.event.update({ where: { id: t.eventId }, data: { capacity: { increment: 1 } } })
        await tx.ticketType.update({ where: { id: t.ticketTypeId }, data: { quantity: { increment: 1 } } })
        audit('order_canceled', { orderId, ticketId: t.id })
      }
      const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELED' } })
      const updatedTickets = await tx.ticket.findMany({ where: { orderId } })
      return { order: updatedOrder, tickets: updatedTickets }
    }, { isolationLevel: 'Serializable' })
  },

  async revertCancel(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { tickets: true } })
    if (!order) throw new Error('order_not_found')
    if (order.status !== 'CANCELED') throw new Error('order_not_canceled')

    const canceled = order.tickets.filter((t) => t.status === 'CANCELED')
    if (canceled.length === 0) throw new Error('no_canceled_tickets')

    // Validate stock availability for all tickets
    // Group counts per event and ticketType
    const perEventCount: Record<string, number> = {}
    const perTTCount: Record<string, number> = {}
    for (const t of canceled) {
      perEventCount[t.eventId] = (perEventCount[t.eventId] || 0) + 1
      perTTCount[t.ticketTypeId] = (perTTCount[t.ticketTypeId] || 0) + 1
    }

    // Ensure capacity and quantities are available
    for (const [eventId, cnt] of Object.entries(perEventCount)) {
      const ev = await prisma.event.findUnique({ where: { id: eventId } })
      if (!ev) throw new Error('resources_not_found')
      if (ev.capacity < cnt) throw new Error('no_stock')
    }
    for (const [ttId, cnt] of Object.entries(perTTCount)) {
      const tt = await prisma.ticketType.findUnique({ where: { id: ttId } })
      if (!tt) throw new Error('resources_not_found')
      if (tt.quantity < cnt) throw new Error('no_stock')
    }

    return prisma.$transaction(async (tx) => {
      for (const [eventId, cnt] of Object.entries(perEventCount)) {
        await tx.event.update({ where: { id: eventId }, data: { capacity: { decrement: cnt } } })
      }
      for (const [ttId, cnt] of Object.entries(perTTCount)) {
        await tx.ticketType.update({ where: { id: ttId }, data: { quantity: { decrement: cnt } } })
      }
      for (const t of canceled) {
        await tx.ticket.update({ where: { id: t.id }, data: { status: 'WAITING' } })
        audit('order_cancel_reverted', { orderId, ticketId: t.id })
      }
      const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { status: 'PENDING' } })
      const updatedTickets = await tx.ticket.findMany({ where: { orderId } })
      return { order: updatedOrder, tickets: updatedTickets }
    }, { isolationLevel: 'Serializable' })
  }
  ,
  async refundOrder(orderId: string, userId: string, method?: PaymentMethod) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { tickets: true } })
    if (!order) throw new Error('order_not_found')
    if (order.status !== 'PAID') throw new Error('order_not_paid')

    const active = order.tickets.filter((t) => t.status === 'ACTIVE')
    if (active.length === 0) throw new Error('no_active_tickets')

    return prisma.$transaction(async (tx) => {
      for (const t of active) {
        const payment = await tx.payment.findUnique({ where: { ticketId: t.id } })
        if (payment) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
        }
        await tx.ticket.update({ where: { id: t.id }, data: { status: 'REFUNDED' } })
        await tx.event.update({ where: { id: t.eventId }, data: { capacity: { increment: 1 } } })
        await tx.ticketType.update({ where: { id: t.ticketTypeId }, data: { quantity: { increment: 1 } } })
        audit('order_refunded_ticket', { orderId, ticketId: t.id, method })
      }
      const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } })
      const updatedTickets = await tx.ticket.findMany({ where: { orderId } })
      return { order: updatedOrder, tickets: updatedTickets }
    }, { isolationLevel: 'Serializable' })
  }
}
