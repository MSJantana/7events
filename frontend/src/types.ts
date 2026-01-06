export type UserRole = 'ADMIN' | 'ORGANIZER'
export type User = { id: string; name: string; email?: string; role: UserRole }

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'FINALIZED'
export type EventSummary = { id: string; title: string; description?: string; location: string; startDate: string; endDate: string; status: EventStatus; imageUrl?: string | null }
export type EventDetail = EventSummary & { capacity: number; minPrice: number; ticketTypes: { id: string; name: string; price: number; quantity: number }[] }

export type TicketType = { id: string; name: string; price: number; quantity: number }
export type Ticket = { id?: string; code?: string; eventId?: string; status: 'WAITING' | 'ACTIVE' | 'CANCELED' | 'REFUNDED' | 'USED' | 'INVALID'; ticketType?: { name?: string; price?: number } }
export type Order = { id: string; status: 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED'; createdAt?: string; tickets?: Array<{ id?: string; code?: string; eventId?: string; status?: 'WAITING' | 'ACTIVE' | 'CANCELED' | 'REFUNDED' | 'USED' | 'INVALID'; ticketType?: { name?: string; price?: number; createdAt?: string; updatedAt?: string } }> }

export type Device = {
  id: string
  name: string
  eventId: string | null
  enabled: boolean
  apiKey: string
  createdAt: string
  event?: { title: string }
}
