import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const j = await api.whoami()
        if (j?.accessToken) {
          try { globalThis.localStorage.setItem('access_token', j.accessToken) } catch { void 0 }
        }
        if (!cancelled && j?.user) setUser({
          id: j.user.id,
          name: j.user.name,
          email: j.user.email,
          role: j.user.role as User['role'],
          eventsCount: j.user.eventsCount
        })
      } catch { setUser(u => u) }
    })()
    return () => { cancelled = true }
  }, [])

  async function logout() {
    try {
      await api.logout()
      try { globalThis.localStorage.removeItem('access_token') } catch { void 0 }
      setUser(null)
    } catch { setUser(u => u) }
  }

  return { user, setUser, logout }
}
