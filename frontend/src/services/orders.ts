import { API_URL, fetchJSON } from './api'
import type { Order } from '../types'

export async function getMyOrders(): Promise<Order[]> {
  return fetchJSON<Order[]>(`${API_URL}/orders/me`)
}

export async function getAllOrders(): Promise<Order[]> {
  return fetchJSON<Order[]>(`${API_URL}/orders`)
}

export async function createBulkOrder(eventId: string, items: Array<{ ticketTypeId: string; quantity: number }>): Promise<{ id: string; status: string }> {
  return fetchJSON(`${API_URL}/orders/bulk`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ eventId, items })
  })
}

export async function payOrder(orderId: string, method: 'CREDIT_CARD' | 'PAYPAL' | 'PIX' | 'BOLETO'): Promise<{ id: string; status: string }> {
  return fetchJSON(`${API_URL}/orders/${orderId}/pay`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ method })
  })
}
