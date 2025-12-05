import { Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { createOrderSchema, createOrderBulkSchema, payOrderSchema } from '../utils/validation'
import { orderService } from '../services/orderService'
import { isAdmin, isOwner } from '../utils/authz'

type AuthedRequest = Request & { user: { sub: string; role: Role; sid?: string } }

export const orderController = {
  async listAll(req: AuthedRequest, res: Response) {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })
    const orders = await orderService.listAllOrders()
    res.json(orders)
  },
  async listMyOrders(req: AuthedRequest, res: Response) {
    const userId = req.user.sub
    const orders = await orderService.listUserOrders(userId)
    res.json(orders)
  },

  async create(req: AuthedRequest, res: Response) {
    const userId = req.user.sub
    try {
      const { eventId, ticketTypeId } = createOrderSchema.parse(req.body)
      const result = await orderService.createOrder(userId, eventId, ticketTypeId)
      res.status(201).json(result)
    } catch (e: any) {
      if (e.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })
      
      const map: any = {
        event_not_found: 404,
        event_not_published: 400,
        event_finalized: 400,
        event_sold_out: 409,
        ticket_type_not_found: 404,
        ticket_type_sold_out: 409
      }
      const code = map[e?.message] || 500
      res.status(code).json({ error: e?.message || 'order_failed' })
    }
  },

  async createBulk(req: AuthedRequest, res: Response) {
    const userId = req.user.sub
    try {
      const { eventId, items } = createOrderBulkSchema.parse(req.body)
      const result = await orderService.createOrderBulk(userId, eventId, items)
      res.status(201).json(result)
    } catch (e: any) {
      if (e.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })
      const map: any = {
        event_not_found: 404,
        event_not_published: 400,
        event_finalized: 400,
        event_sold_out: 409,
        insufficient_capacity: 409,
        ticket_type_not_found: 404,
        ticket_type_sold_out: 409,
        ticket_type_insufficient_quantity: 409
      }
      const code = map[e?.message] || 500
      res.status(code).json({ error: e?.message || 'order_failed' })
    }
  },

  async pay(req: AuthedRequest, res: Response) {
    const userId = req.user.sub
    const { id } = req.params
    
    try {
      const { method } = payOrderSchema.parse(req.body)
      
      // Check ownership before paying
      const order = await orderService.getOrderById(id)
      if (!order) return res.status(404).json({ error: 'order_not_found' })
      if (!isAdmin(req) && !isOwner(req, order.userId)) return res.status(403).json({ error: 'forbidden' })

      const result = await orderService.payOrder(id, userId, method)
      res.json(result)
    } catch (e: any) {
      if (e.errors) return res.status(400).json({ error: 'invalid_body', details: e.errors })

      const map: any = {
        order_not_found: 404,
        order_not_pending: 400,
        ticket_missing: 400,
        ticket_canceled: 400,
        ticket_type_not_found: 404,
        payment_exists: 400
      }
      const code = map[e?.message] || 500
      res.status(code).json({ error: e?.message || 'payment_failed' })
    }
  },

  async refund(req: AuthedRequest, res: Response) {
    const userId = req.user.sub
    const { id } = req.params
    try {
      const order = await orderService.getOrderById(id)
      if (!order) return res.status(404).json({ error: 'order_not_found' })
      if (!isAdmin(req) && !isOwner(req, order.userId)) return res.status(403).json({ error: 'forbidden' })

      const result = await orderService.refundOrder(id, userId)
      res.json(result)
    } catch (e: any) {
      const map: any = {
        order_not_found: 404,
        order_not_paid: 400,
        no_active_tickets: 400
      }
      const code = map[e?.message] || 500
      res.status(code).json({ error: e?.message || 'refund_failed' })
    }
  },

  async cancel(req: Request, res: Response) {
    const { id } = req.params
    try {
      const order = await orderService.getOrderById(id)
      if (!order) return res.status(404).json({ error: 'order_not_found' })
      if (!isAdmin(req) && !isOwner(req, order.userId)) return res.status(403).json({ error: 'forbidden' })

      const result = await orderService.cancelOrder(id)
      res.json(result)
    } catch (e: any) {
      const map: any = {
        order_not_found: 404,
        order_not_pending: 400,
        ticket_missing: 400,
        ticket_not_waiting: 400,
        no_waiting_tickets: 400
      }
      const code = map[e?.message] || 500
      res.status(code).json({ error: e?.message || 'cancel_failed' })
    }
  },

  async revertCancel(req: Request, res: Response) {
    const { id } = req.params
    try {
      const order = await orderService.getOrderById(id)
      if (!order) return res.status(404).json({ error: 'order_not_found' })
      if (!isAdmin(req) && !isOwner(req, order.userId)) return res.status(403).json({ error: 'forbidden' })

      const result = await orderService.revertCancel(id)
      res.json(result)
    } catch (e: any) {
      const map: any = {
        order_not_found: 404,
        order_not_canceled: 400,
        ticket_missing: 400,
        ticket_not_canceled: 400,
        no_canceled_tickets: 400,
        resources_not_found: 404,
        no_stock: 409
      }
      const code = map[e?.message] || 500
      res.status(code).json({ error: e?.message || 'revert_failed' })
    }
  }
}
