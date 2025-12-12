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

export function useExpired(startDate?: string, status?: EventStatus, intervalMs = 60000) {
  const now = useNow(intervalMs)
  const expired = !!startDate && toLocalDate(startDate, true).getTime() <= now
  return expired || status === 'FINALIZED'
}
