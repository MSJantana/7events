import { API_URL, fetchJSON } from './api'
import type { Device } from '../types'

export async function getDevices(): Promise<Device[]> {
  return fetchJSON<Device[]>(`${API_URL}/devices`)
}

export async function createDevice(data: { name: string; eventId?: string; enabled?: boolean }): Promise<Device> {
  return fetchJSON(`${API_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}

export async function deleteDevice(id: string): Promise<void> {
  return fetchJSON(`${API_URL}/devices/${id}`, {
    method: 'DELETE'
  })
}

export async function toggleDevice(id: string): Promise<Device> {
  return fetchJSON(`${API_URL}/devices/${id}/toggle`, {
    method: 'PATCH'
  })
}
