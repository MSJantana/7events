import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import EventsCarousel from '../components/EventsCarousel'
import FinalizedEventsRow from '../components/FinalizedEventsRow'
import { useAuth } from '../hooks/useAuth'
import { useEventsCarousel } from '../hooks/useEventsCarousel'
import { getEventsByStatus } from '../services/events'
 
import pageStyles from './seven-events.module.css'
import { useToast } from '../hooks/useToast'
import { api } from '../services/api'
import type { EventSummary } from '../types'
import AuthModal from '../components/modals/AuthModal'
import MyTicketsView from '../components/MyTicketsView'
import DevicesView from '../components/DevicesView'
import MyEventsView from '../components/MyEventsView'
import EditEventModal from '../components/modals/EditEventModal'
import Footer from '../components/Footer'

export default function SevenEventsPage() {
  const { user, logout, setUser } = useAuth()
  const { events, activeIndex, setActiveIndex, setEvents } = useEventsCarousel()
  const { show } = useToast()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [finalizedEvents, setFinalizedEvents] = useState<EventSummary[]>([])

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [view, setView] = useState<'home' | 'tickets' | 'devices' | 'my-events'>('home')
  const [editEvent, setEditEvent] = useState<{ id: string; title: string; location: string; startDate: string; description: string; imageUrl?: string | null } | null>(null)

  useEffect(() => {
    const buyId = searchParams.get('buyId') || ''
    const buy = searchParams.get('buy') || ''
    if (buyId) {
      navigate(`/checkout/${buyId}`)
      return
    }
    if (buy) {
      navigate(`/checkout/${buy}`)
    }
  }, [searchParams, navigate])

  useEffect(() => {
    const h: EventListener = () => { setView('tickets') }
    ;(globalThis as EventTarget).addEventListener('openMyTickets', h)
    return () => { (globalThis as EventTarget).removeEventListener('openMyTickets', h) }
  }, [])
  
  useEffect(() => {
    const h: EventListener = () => { setView('my-events') }
    ;(globalThis as EventTarget).addEventListener('openMyEvents', h)
    return () => { (globalThis as EventTarget).removeEventListener('openMyEvents', h) }
  }, [])
  
  useEffect(() => {
    const h: EventListener = () => { setView('devices') }
    ;(globalThis as EventTarget).addEventListener('openDevices', h)
    return () => { (globalThis as EventTarget).removeEventListener('openDevices', h) }
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

  function handleOpenEvent(ev: EventSummary) {
    setActiveIndex(events.findIndex(e => e.id === ev.id))
    if (!user) {
      setPendingAction(() => () => navigate(`/checkout/${ev.id}`))
      setShowAuthModal(true)
      return
    }
    navigate(`/checkout/${ev.id}`)
  }

  function handleEditEvent(ev: EventSummary) {
    setEditEvent({ id: ev.id, title: '', location: '', startDate: '', description: '', imageUrl: ev.imageUrl || null })
  }

  async function handleEventsPublished() {
    show({ text: 'Atualizando eventos...', kind: 'ok' })
    try {
      const j = await api.publishedEvents()
      if (Array.isArray(j)) setEvents(j as EventSummary[])
    } catch { setEvents(e => e) }
    show({ text: 'Eventos atualizados', kind: 'ok' })
  }

  function renderContent() {
    if (view === 'home') {
      return (
        <>
          <EventsCarousel
            events={events}
            activeIndex={activeIndex}
            onSelect={(i) => setActiveIndex(() => i)}
            onOpenEvent={handleOpenEvent}
          />
          <FinalizedEventsRow
            events={finalizedEvents}
            onOpenEvent={(ev) => {
               navigate(`/checkout/${ev.id}`)
            }}
          />
        </>
      )
    }
    if (view === 'tickets') return <MyTicketsView />
    if (view === 'devices') return <DevicesView />
    
    return (
      <MyEventsView
        onEdit={handleEditEvent}
        onPublished={handleEventsPublished}
      />
    )
  }

  return (
    <div className={pageStyles.page} style={{ position: 'relative' }}>
      <Header
        user={user}
        onCreate={() => { if (user) { navigate('/create-event') } else { setShowAuthModal(true) } }}
        onOpenMyEvents={() => { if (user) { setView('my-events') } else { setShowAuthModal(true) } }}
        onOpenMyTickets={() => { if (user) { setView('tickets') } else { setShowAuthModal(true) } }}
        onOpenDevices={() => { if (user) { setView('devices') } else { setShowAuthModal(true) } }}
        onLoginOpen={() => { setShowAuthModal(true) }}
        onLogout={async () => { await logout(); setUser(null); setView('home') }}
        onGoHome={() => setView('home')}
      />
      <main style={{ flex: 1, paddingBottom: '80px' }}>
        {renderContent()}
      </main>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} onLoggedIn={(u) => { 
        setUser(u); 
        setShowAuthModal(false); 
        if (pendingAction) {
          pendingAction();
          setPendingAction(null);
        }
      }} />
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

      <Footer />
    </div>
  )
}
