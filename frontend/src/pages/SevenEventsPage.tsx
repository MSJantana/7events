import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import EventsCarousel from '../components/EventsCarousel'
import FinalizedEventsRow from '../components/FinalizedEventsRow'
import { useAuth } from '../hooks/useAuth'
import { useEventsCarousel } from '../hooks/useEventsCarousel'
import { getEventsByStatus } from '../services/events'
 
import pageStyles from './seven-events.module.css'
import { useToast } from '../hooks/useToast'
import { API_URL, api } from '../services/api'
import type { EventSummary, EventDetail } from '../types'
import AuthModal from '../components/modals/AuthModal'
import CreateEventModal from '../components/modals/CreateEventModal'
import MyTicketsView from '../components/MyTicketsView'
import DevicesView from '../components/DevicesView'
import MyEventsView from '../components/MyEventsView'
import EditEventModal from '../components/modals/EditEventModal'
import EventPurchaseModal from '../components/modals/EventPurchaseModal'
import Footer from '../components/Footer'

export default function SevenEventsPage() {
  const { user, logout, setUser } = useAuth()
  const { events, activeIndex, setActiveIndex, setEvents } = useEventsCarousel()
  const { show } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [finalizedEvents, setFinalizedEvents] = useState<EventSummary[]>([])

  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [view, setView] = useState<'home' | 'tickets' | 'devices' | 'my-events'>('home')
  const [editEvent, setEditEvent] = useState<{ id: string; title: string; location: string; startDate: string; description: string; imageUrl?: string | null } | null>(null)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventData, setEventData] = useState<EventDetail | null>(null)
  const [selectedTT, setSelectedTT] = useState('')
  const [qty, setQty] = useState(1)

  // card abre compra diretamente; detalhes continuam disponíveis por outras ações

  async function handleMakeOrder() {
    const active = events[activeIndex]
    if (!active) return
    setShowPurchaseModal(true)
    setEventLoading(true)
    setEventError('')
    setEventData(null)
    setSelectedTT('')
    setQty(1)
    try {
      const r = await fetch(`${API_URL}/events/${active.id}`)
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

  async function openPurchaseById(id: string) {
    setShowPurchaseModal(true)
    setEventLoading(true)
    setEventError('')
    setEventData(null)
    setSelectedTT('')
    setQty(1)
    try {
      const r = await fetch(`${API_URL}/events/${id}`)
      if (!r.ok) throw new Error('not_found')
      const j = await r.json()
      setEventData(j)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar'
      setEventError(msg)
    } finally { setEventLoading(false) }
  }

  // removido modal de detalhes; abrimos direto a compra

  useEffect(() => {
    const buyId = searchParams.get('buyId') || ''
    const buy = searchParams.get('buy') || ''
    if (user) {
      if (buyId) {
        openPurchaseById(buyId)
        searchParams.delete('buyId')
        setSearchParams(searchParams)
        return
      }
      if (buy) {
        openPurchaseBySlug(buy)
        searchParams.delete('buy')
        setSearchParams(searchParams)
      }
    } else if (buyId || buy) {
      setShowAuthModal(true)
    }
  }, [searchParams, user, setSearchParams])

  useEffect(() => {
    const h: EventListener = () => { setView('tickets') }
    ;(globalThis as EventTarget).addEventListener('openMyTickets', h)
    return () => { (globalThis as EventTarget).removeEventListener('openMyTickets', h) }
  }, [])

  useEffect(() => {
    let cancelled = false
    getEventsByStatus('FINALIZED').then((list) => {
      if (!cancelled && Array.isArray(list)) {
        const isAdmin = user?.role === 'ADMIN'
        if (isAdmin) {
            setFinalizedEvents(list)
            return
        }
        const now = Date.now()
        const tenDays = 10 * 24 * 60 * 60 * 1000
        const filtered = list.filter(e => {
          if (!e.endDate) return true
          const end = new Date(e.endDate).getTime()
          return (now - end) <= tenDays
        })
        setFinalizedEvents(filtered)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [user])

  function renderContent() {
    if (view === 'home') {
      return (
        <>
          <EventsCarousel
            events={events}
            activeIndex={activeIndex}
            onSelect={(i) => setActiveIndex(() => i)}
            onOpenEvent={(ev) => {
              setActiveIndex(events.findIndex(e => e.id===ev.id))
              if (user) {
                void openPurchaseById(ev.id)
              } else {
                setShowAuthModal(true)
                const next = new URLSearchParams(searchParams)
                next.set('buyId', ev.id)
                setSearchParams(next)
              }
            }}
          />
          <FinalizedEventsRow
            events={finalizedEvents}
            onOpenEvent={(ev) => {
               if (user) {
                 void openPurchaseById(ev.id)
               } else {
                  setShowAuthModal(true)
                  const next = new URLSearchParams(searchParams)
                  next.set('buyId', ev.id)
                  setSearchParams(next)
               }
            }}
          />
        </>
      )
    }
    if (view === 'tickets') return <MyTicketsView />
    if (view === 'devices') return <DevicesView />
    
    return (
      <MyEventsView
        onEdit={(ev) => { setEditEvent({ id: ev.id, title: '', location: '', startDate: '', description: '', imageUrl: ev.imageUrl || null }); }}
        onPublished={async () => {
          show({ text: 'Atualizando eventos...', kind: 'ok' })
          try {
            const j = await api.publishedEvents()
            if (Array.isArray(j)) setEvents(j as EventSummary[])
          } catch { setEvents(e => e) }
          show({ text: 'Eventos atualizados', kind: 'ok' })
        }}
      />
    )
  }

  return (
    <div className={pageStyles.page} style={{ position: 'relative' }}>
      <Header
        user={user}
        onCreate={() => { if (user) { setShowCreateModal(true) } else { setShowAuthModal(true) } }}
        onOpenMyEvents={() => { if (user) { setView('my-events') } else { setShowAuthModal(true) } }}
        onOpenMyTickets={() => { if (user) { setView('tickets') } else { setShowAuthModal(true) } }}
        onOpenDevices={() => { if (user) { setView('devices') } else { setShowAuthModal(true) } }}
        onLoginOpen={() => { setShowAuthModal(true) }}
        onLogout={async () => { await logout(); setUser(null); setView('home') }}
        onMakeOrder={() => { if (user) { handleMakeOrder() } else { setShowAuthModal(true) } }}
        onGoHome={() => setView('home')}
      />
      <main style={{ flex: 1, paddingBottom: '80px' }}>
        {renderContent()}
      </main>

      {/* removido EventDetailModal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} onLoggedIn={(u) => { setUser(u); setShowAuthModal(false) }} />
      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
        onCreated={async (createdId) => {
          setShowCreateModal(false)
          show({ text: 'Atualizando eventos...', kind: 'ok' })
          try {
            const j = await api.publishedEvents()
            if (Array.isArray(j)) setEvents(j as EventSummary[])
          } catch { setEvents(e => e) }
          show({ text: 'Eventos atualizados', kind: 'ok' })
          if (createdId && user) {
            try {
              // sempre abrir compra; modal lida com esgotado/expirado
              await openPurchaseById(createdId)
            } catch { show({ text: 'Falha ao carregar evento', kind: 'err' }) }
          }
        }}
      />
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
      <Footer />
    </div>
  )
}
