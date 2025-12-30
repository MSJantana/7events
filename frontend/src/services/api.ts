export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000'

export async function fetchJSON<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const token = globalThis.localStorage === undefined ? null : globalThis.localStorage.getItem('access_token')
  const headers = new Headers(init?.headers || undefined)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const r = await fetch(url, { credentials: 'include', ...init, headers })
  if (!r.ok) {
    let body: unknown = null
    try { body = await r.json() } catch { body = null }
    const code = (body as { error?: string })?.error || `http_error_${r.status}`
    const err: Error & { name?: string; status?: number; code?: string; details?: unknown } = new Error(code)
    err.name = 'HttpError'
    err.status = r.status
    err.code = code
    if (body && typeof body === 'object') err.details = (body as { details?: unknown }).details

    if ((r.status === 401 || code === 'unauthorized') && token) {
      globalThis.dispatchEvent(new Event('session-expired'))
    }

    throw err
  }
  return r.json() as Promise<T>
}

export function translateError(code?: string): string {
  const c = String(code || '').trim()
  const map: Record<string, string> = {
    invalid_credentials: 'Credenciais inválidas',
    email_exists: 'Email já cadastrado',
    weak_password: 'Senha fraca: use maiúscula, minúscula e dígito',
    invalid_body: 'Dados inválidos',
    local_login_failed: 'Falha no login',
    local_register_failed: 'Falha no cadastro',
    not_found: 'Não encontrado',
    unauthorized: 'Não autorizado',
    forbidden: 'Acesso negado'
  }
  return map[c] || (c.startsWith('http_error_') ? 'Erro de rede' : (c || 'Erro desconhecido'))
}

export const api = {
  whoami: () => fetchJSON<{ user?: { id: string; name: string; email?: string; role: string }, accessToken?: string }>(`${API_URL}/auth/whoami`),
  logout: () => fetchJSON(`${API_URL}/auth/logout`, { method: 'POST' }),
  publishedEvents: () => fetchJSON<Array<unknown>>(`${API_URL}/events?status=PUBLISHED`),
  eventBySlug: (slug: string) => fetchJSON(`${API_URL}/events/slug/${slug}`),
  imageConfig: () => fetchJSON<{ uploadMaxMB: number; allowedMimes: string[]; minWidth: number; minHeight: number; mainMaxWidth: number }>(`${API_URL}/images/config`)
}
