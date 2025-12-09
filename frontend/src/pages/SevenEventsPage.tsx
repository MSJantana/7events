import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import EventsCarousel from '../components/EventsCarousel'
import { useAuth } from '../hooks/useAuth'
import { useEventsCarousel } from '../hooks/useEventsCarousel'
 
import pageStyles from './seven-events.module.css'
import { useToast } from '../hooks/useToast'
import { API_URL, api } from '../services/api'
import type { EventSummary, EventDetail } from '../types'
import AuthModal from '../components/modals/AuthModal'
import EventDetailModal from '../components/modals/EventDetailModal'
import CreateEventModal from '../components/modals/CreateEventModal'
import MyEventsModal from '../components/modals/MyEventsModal'
import MyTicketsModal from '../components/modals/MyTicketsModal'
import EditEventModal from '../components/modals/EditEventModal'
import EventPurchaseModal from '../components/modals/EventPurchaseModal'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/([^a-z0-9]+)/g, '-')
    .replaceAll(/(^-+)|(-+$)/g, '')
}

export default function SevenEventsPage() {
  const { user, logout, setUser } = useAuth()
  const { events, activeIndex, setActiveIndex, setEvents } = useEventsCarousel()
  const { show } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [showEventModal, setShowEventModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMyEvents, setShowMyEvents] = useState(false)
  const [showMyTickets, setShowMyTickets] = useState(false)
  const [editEvent, setEditEvent] = useState<{ id: string; title: string; location: string; startDate: string; endDate: string; description: string; imageUrl?: string | null } | null>(null)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventData, setEventData] = useState<EventDetail | null>(null)
  const [selectedTT, setSelectedTT] = useState('')
  const [qty, setQty] = useState(1)

  async function handleOpenEvent(ev: EventSummary) {
    const i = events.findIndex(e => e.id === ev.id)
    setActiveIndex(() => Math.max(i, 0))
    const slug = ev.title
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .replaceAll(/([^a-z0-9]+)/g, '-')
      .replaceAll(/(^-+)|(-+$)/g, '')
    setShowEventModal(true)
    setEventLoading(true)
    setEventError('')
    setEventData(null)
    try {
      const r = await fetch(`${API_URL}/events/slug/${slug}`)
      if (!r.ok) throw new Error('not_found')
      const j = await r.json()
      setEventData(j)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar'
      setEventError(msg)
    } finally { setEventLoading(false) }
  }

  async function handleMakeOrder() {
    const active = events[activeIndex]
    if (!active) return
    const slug = active.title
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .replaceAll(/([^a-z0-9]+)/g, '-')
      .replaceAll(/(^-+)|(-+$)/g, '')
    setShowPurchaseModal(true)
    setEventLoading(true)
    setEventError('')
    setEventData(null)
    setSelectedTT('')
    setQty(1)
    try {
      const r = await fetch(`${API_URL}/events/slug/${slug}`)
      if (!r.ok) throw new Error('not_found')
      const j = await r.json()
      setEventData(j)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar'
      setEventError(msg)
    } finally { setEventLoading(false) }
  }


  async function openPurchaseBySlug(slug: string) {
    setShowPurchaseModal(true)
    setEventLoading(true)
    setEventError('')
    setEventData(null)
    setSelectedTT('')
    setQty(1)
    try {
      const r = await fetch(`${API_URL}/events/slug/${slug}`)
      if (!r.ok) throw new Error('not_found')
      const j = await r.json()
      setEventData(j)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar'
      setEventError(msg)
    } finally { setEventLoading(false) }
  }

  useEffect(() => {
    const buy = searchParams.get('buy') || ''
    if (buy && user) {
      openPurchaseBySlug(buy)
      searchParams.delete('buy')
      setSearchParams(searchParams)
    }
  }, [searchParams, user, setSearchParams])

  useEffect(() => {
    const h: EventListener = () => { setShowMyTickets(true) }
    ;(globalThis as EventTarget).addEventListener('openMyTickets', h)
    return () => { (globalThis as EventTarget).removeEventListener('openMyTickets', h) }
  }, [])

  return (
    <div className={pageStyles.page}>
      <Header
        user={user}
        onCreate={() => { if (user) { setShowCreateModal(true) } else { setShowAuthModal(true) } }}
        onOpenMyEvents={() => { if (user) { setShowMyEvents(true) } else { setShowAuthModal(true) } }}
        onOpenMyTickets={() => { if (user) { setShowMyTickets(true) } else { setShowAuthModal(true) } }}
        onLoginOpen={() => { setShowAuthModal(true) }}
        onLogout={async () => { await logout(); setUser(null) }}
        onMakeOrder={() => { if (user) { handleMakeOrder() } else { setShowAuthModal(true) } }}
      />
      <EventsCarousel events={events} activeIndex={activeIndex} onSelect={(i) => setActiveIndex(() => i)} onOpenEvent={handleOpenEvent} />

      <EventDetailModal
        open={showEventModal}
        loading={eventLoading}
        error={eventError}
        data={eventData}
        onClose={() => setShowEventModal(false)}
        onBuy={(ev) => {
          if (!user) {
            const slug = slugify(ev.title)
            setShowEventModal(false)
            navigate(`/login?buy=${encodeURIComponent(slug)}`)
            return
          }
          setEventData(ev)
          setSelectedTT('')
          setQty(1)
          setShowEventModal(false)
          setShowPurchaseModal(true)
        }}
      />
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} onLoggedIn={(u) => { setUser(u); setShowAuthModal(false) }} />
      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
        onCreated={async () => {
          setShowCreateModal(false)
          show({ text: 'Atualizando eventos...', kind: 'ok' })
          try {
            const j = await api.publishedEvents()
            if (Array.isArray(j)) setEvents(j as EventSummary[])
          } catch { setEvents(e => e) }
          show({ text: 'Eventos atualizados', kind: 'ok' })
        }}
      />
      <MyEventsModal
        open={showMyEvents}
        onClose={() => setShowMyEvents(false)}
        onEdit={(ev) => { setEditEvent({ id: ev.id, title: '', location: '', startDate: '', endDate: '', description: '', imageUrl: ev.imageUrl || null }); setShowMyEvents(false) }}
        onPublished={async () => {
          show({ text: 'Atualizando eventos...', kind: 'ok' })
          try {
            const j = await api.publishedEvents()
            if (Array.isArray(j)) setEvents(j as EventSummary[])
          } catch { setEvents(e => e) }
          show({ text: 'Eventos atualizados', kind: 'ok' })
        }}
      />
      <MyTicketsModal open={showMyTickets} onClose={() => setShowMyTickets(false)} />
      <EditEventModal
        key={editEvent?.id || 'none'}
        open={!!editEvent}
        onClose={() => setEditEvent(null)}
        eventId={editEvent?.id}
        currentImageUrl={editEvent?.imageUrl || null}
        onUpdated={(p) => {
          if (!p?.id) { return }
          setEvents(list => list.map(e => e.id===p.id ? { ...e, imageUrl: p.imageUrl || e.imageUrl } : e))
        }}
      />

      <EventPurchaseModal
        key={eventData?.id || 'none'}
        open={showPurchaseModal}
        loading={eventLoading}
        error={eventError}
        data={eventData}
        selectedTT={selectedTT}
        qty={qty}
        onClose={() => setShowPurchaseModal(false)}
        onSelectTT={(id)=> setSelectedTT(id)}
        onChangeQty={(n)=> setQty(n)}
      />
    </div>
  )
}
