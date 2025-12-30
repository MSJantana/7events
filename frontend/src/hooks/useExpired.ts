import { useEffect, useState } from 'react'
import type { EventStatus } from '../types'
import { toLocalDate } from '../utils/format'

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function useExpired(endDate?: string, status?: EventStatus, intervalMs = 60000) {
  const now = useNow(intervalMs)
  // Se existe endDate, usamos ele para validar se o evento expirou
  // Caso contrário, usamos o status FINALIZED como fallback
  const expired = !!endDate && toLocalDate(endDate, true).getTime() <= now
  return expired || status === 'FINALIZED'
}
