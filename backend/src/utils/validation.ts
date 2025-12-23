import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  startDate: z.string().refine((s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s)) || /^\d{2}\/\d{2}\/\d{4}$/.test(String(s))), { message: 'invalid_date_format' }),
  startTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('')]).optional(),
  location: z.string().min(3),
  capacity: z.coerce.number().int().positive(),
  imageUrl: z.string().trim().refine((v) => { try { new URL(v); return true } catch { return false } }, { message: 'invalid_url' }).optional()
}).superRefine((v, ctx) => {
  const raw = String(v.startDate)
  let y = 0, mo = 0, d = 0
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
    if (!m) { ctx.addIssue({ code: 'custom', message: 'invalid_date_format', path: ['startDate'] }); return }
    y = Number(m[1]); mo = Number(m[2]); d = Number(m[3])
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
    if (!m) { ctx.addIssue({ code: 'custom', message: 'invalid_date_format', path: ['startDate'] }); return }
    d = Number(m[1]); mo = Number(m[2]); y = Number(m[3])
  } else {
    ctx.addIssue({ code: 'custom', message: 'invalid_date_format', path: ['startDate'] }); return
  }
  const s = new Date(y, mo - 1, d, 0, 0, 0, 0)
  const startOfToday = (() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0) })()
  if (s.getTime() < startOfToday.getTime()) ctx.addIssue({ code: 'custom', message: 'start_in_past', path: ['startDate'] })
})

export const updateEventSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  startDate: z.string().refine((s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s)) || /^\d{2}\/\d{2}\/\d{4}$/.test(String(s))), { message: 'invalid_date_format' }).optional(),
  startTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('')]).optional(),
  location: z.string().min(3).optional()
}).superRefine((v, ctx) => {
  if (v.title === undefined && v.description === undefined && v.startDate === undefined && v.location === undefined) {
    ctx.addIssue({ code: 'custom', message: 'no_fields' })
  }
  const startOfToday = (() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0) })()
  if (v.startDate !== undefined) {
    const raw = String(v.startDate)
    let y = 0, mo = 0, d = 0
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
      if (!m) { ctx.addIssue({ code: 'custom', message: 'invalid_date_format', path: ['startDate'] }); return }
      y = Number(m[1]); mo = Number(m[2]); d = Number(m[3])
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
      if (!m) { ctx.addIssue({ code: 'custom', message: 'invalid_date_format', path: ['startDate'] }); return }
      d = Number(m[1]); mo = Number(m[2]); y = Number(m[3])
    } else {
      ctx.addIssue({ code: 'custom', message: 'invalid_date_format', path: ['startDate'] }); return
    }
    const s = new Date(y, mo - 1, d, 0, 0, 0, 0)
    if (s.getTime() < startOfToday.getTime()) ctx.addIssue({ code: 'custom', message: 'start_in_past', path: ['startDate'] })
  }
})

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
  email: z.email(),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'ORGANIZER']).default('ORGANIZER'),
  password: z.string().min(8)
})

export const updateUserSchema = z.object({
  email: z.email().optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'ORGANIZER']).optional(),
  password: z.string().min(8).optional()
})

export const localRegisterSchema = z.object({
  email: z.email(),
  name: z.string().min(2),
  password: z.string().min(8)
})

export const localLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
})
