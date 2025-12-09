import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { EventSummary } from '../types'

export function useEventsCarousel() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const j = await api.publishedEvents()
        if (!cancelled && Array.isArray(j)) setEvents(j as EventSummary[])
      } catch { setEvents(e => e) }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!Array.isArray(events) || events.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) >= events.length ? 0 : (i + 1))
    }, 4000)
    return () => clearInterval(id)
  }, [events])

  return { events, activeIndex, setActiveIndex, setEvents }
}
