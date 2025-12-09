export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

export async function fetchJSON<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const token = globalThis.localStorage === undefined ? null : globalThis.localStorage.getItem('access_token')
  const headers = new Headers(init?.headers || undefined)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const r = await fetch(url, { credentials: 'include', ...init, headers })
  if (!r.ok) throw new Error(`http_error_${r.status}`)
  return r.json() as Promise<T>
}

export const api = {
  whoami: () => fetchJSON<{ user?: { id: string; name: string; email?: string; role: string }, accessToken?: string }>(`${API_URL}/auth/whoami`),
  logout: () => fetchJSON(`${API_URL}/auth/logout`, { method: 'POST' }),
  publishedEvents: () => fetchJSON<Array<unknown>>(`${API_URL}/events?status=PUBLISHED`),
  eventBySlug: (slug: string) => fetchJSON(`${API_URL}/events/slug/${slug}`),
  imageConfig: () => fetchJSON<{ uploadMaxMB: number; allowedMimes: string[]; minWidth: number; minHeight: number; mainMaxWidth: number }>(`${API_URL}/images/config`)
}
