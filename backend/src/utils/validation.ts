import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: z.string().min(3),
  capacity: z.number().int().positive(),
  imageUrl: z.string().trim().refine((v) => { try { new URL(v); return true } catch { return false } }, { message: 'invalid_url' }).optional()
})

export const updateEventSchema = createEventSchema.partial()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const createOrderSchema = z.object({
  eventId: z.string().regex(UUID_RE),
  ticketTypeId: z.string().regex(UUID_RE)
})

export const createOrderBulkSchema = z.object({
  eventId: z.string().regex(UUID_RE),
  items: z.array(z.object({
    ticketTypeId: z.string().regex(UUID_RE),
    quantity: z.coerce.number().int().positive()
  })).min(1)
})

export const payOrderSchema = z.object({
  method: z.enum(['CREDIT_CARD', 'PAYPAL', 'PIX', 'BOLETO'])
})

export const createTicketTypeSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().positive()
})

export const updateTicketTypeSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().positive().optional()
}).refine((v) => v.name !== undefined || v.price !== undefined || v.quantity !== undefined, {
  message: 'no_fields'
})

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'ORGANIZER', 'PARTICIPANT']).default('PARTICIPANT'),
  password: z.string().min(8)
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'ORGANIZER', 'PARTICIPANT']).optional(),
  password: z.string().min(8).optional()
})

export const localRegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8)
})

export const localLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
