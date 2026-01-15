import { API_URL, fetchJSON } from './api'
import type { EventSummary, EventDetail } from '../types'

export async function getPublishedEvents(): Promise<EventSummary[]> {
  return fetchJSON<EventSummary[]>(`${API_URL}/events?status=PUBLISHED`)
}

export async function getEventBySlug(slug: string): Promise<EventDetail> {
  return fetchJSON<EventDetail>(`${API_URL}/events/slug/${slug}`)
}

export async function getEventById(id: string): Promise<EventDetail> {
  return fetchJSON<EventDetail>(`${API_URL}/events/${id}`)
}

export async function getEventsByStatus(status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'FINALIZED'): Promise<EventSummary[]> {
  return fetchJSON<EventSummary[]>(`${API_URL}/events?status=${status}`)
}

export async function getTicketTypes(eventId: string): Promise<Array<{ id: string; name: string; price: number; quantity: number }>> {
  return fetchJSON(`${API_URL}/events/${eventId}/ticket-types`)
}

export async function createEvent(payload: { title: string; description: string; location: string; startDate: string; startTime?: string; endDate?: string; endTime?: string; capacity: number }): Promise<{ id: string }> {
  return fetchJSON(`${API_URL}/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
}

export async function publishEvent(eventId: string): Promise<void> {
  await fetchJSON(`${API_URL}/events/${eventId}/publish`, { method: 'POST' })
}

export async function cancelEvent(eventId: string): Promise<void> {
  await fetchJSON(`${API_URL}/events/${eventId}/cancel`, { method: 'POST' })
}

export async function updateEventBasic(eventId: string, payload: Partial<{ title: string; description: string; location: string; startDate: string; startTime: string; endDate: string; endTime: string }>): Promise<void> {
  await fetchJSON(`${API_URL}/events/${eventId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

export async function uploadEventImage(eventId: string, file: File): Promise<{ imageUrl?: string; thumbUrl?: string }> {
  const fd = new FormData()
  fd.append('image', file)
  const r = await fetch(`${API_URL}/events/${eventId}/image`, { method: 'POST', credentials: 'include', body: fd })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err: UploadError = Object.assign(new Error(String(j?.error || 'upload_failed')), { details: String(j?.details || '') })
    throw err
  }
  return j
}

export async function createTicketType(eventId: string, payload: { name: string; price: number; quantity: number }): Promise<{ id: string }> {
  return fetchJSON(`${API_URL}/events/${eventId}/ticket-types`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

export async function updateTicketType(eventId: string, ticketTypeId: string, payload: Partial<{ name: string; price: number; quantity: number }>): Promise<void> {
  await fetchJSON(`${API_URL}/events/${eventId}/ticket-types/${ticketTypeId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

export async function getEventsByStatusPaginated(status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'FINALIZED', page: number, limit: number): Promise<{ items: EventSummary[]; page: number; limit: number; total: number }> {
  return fetchJSON<{ items: EventSummary[]; page: number; limit: number; total: number }>(`${API_URL}/events?status=${status}&page=${page}&limit=${limit}`)
}
type UploadError = Error & { details?: string }
