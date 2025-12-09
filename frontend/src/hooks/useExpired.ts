import { useEffect, useState } from 'react'
import type { EventStatus } from '../types'

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
  const expired = !!endDate && new Date(endDate).getTime() <= now
  return expired || status === 'FINALIZED'
}
