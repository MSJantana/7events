import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../index.css'
import { palette } from '../theme/palette'
import EventsCarousel from '../components/EventsCarousel'
import { useToast } from '../hooks/useToast'
import AuthModal from '../components/modals/AuthModal'
import EventPurchaseModal from '../components/modals/EventPurchaseModal'
import CreateEventModal from '../components/modals/CreateEventModal'
import MyEventsModal from '../components/modals/MyEventsModal'
import MyTicketsModal from '../components/modals/MyTicketsModal'
import EditEventModal from '../components/modals/EditEventModal'
import Header from '../components/Header'
import Footer from '../components/Footer'
import type { EventSummary, EventDetail, User } from '../types'

export default function Login() {
  const API = useMemo(() => (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000', [])
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const buySlug = searchParams.get('buy') || ''
  const buyId = searchParams.get('buyId') || ''
  
  const [showModal, setShowModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventData, setEventData] = useState<EventDetail | null>(null)
  const [selectedTT, setSelectedTT] = useState<string>('')
  const [qty, setQty] = useState<number>(1)

  const [user, setUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMyEvents, setShowMyEvents] = useState(false)
  const [editEvent, setEditEvent] = useState<{ id: string; title: string; location: string; startDate: string; description: string } | null>(null)
  const [showMyTickets, setShowMyTickets] = useState(false)
  const [events, setEvents] = useState<Array<{ id: string; title: string; description?: string; location: string; startDate: string; endDate: string; status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'FINALIZED'; imageUrl?: string | null }>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const { show } = useToast()

  const publishedEvents = useMemo(() => events.filter(e => e.status === 'PUBLISHED'), [events])

  // detect auth (cookie-based)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`${API}/auth/whoami`, { credentials: 'include' })
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled && j?.user) setUser({ id: j.user.id, name: j.user.name, email: j.user.email, role: j.user.role })
      } catch { setUser(u => u) }
      finally { if (!cancelled) setAuthLoading(false) }
    })()
    return () => { cancelled = true }
  }, [API])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`${API}/events?status=PUBLISHED`, { credentials: 'include' })
        const j = await r.json().catch(() => [])
        if (!cancelled && Array.isArray(j)) setEvents(j)
      } catch { setEvents(e => e) }
    })()
    return () => { cancelled = true }
  }, [API])

  useEffect(() => {
    if (authLoading) return
    const pending = sessionStorage.getItem('auth_pending')
    const errorParam = searchParams.get('error')
    if (pending || errorParam) {
      if (!user) {
        setShowModal(true)
        if (errorParam) {
          show({ text: 'Falha na autenticação: ' + errorParam, kind: 'err' })
          setSearchParams(prev => {
             const next = new URLSearchParams(prev)
             next.delete('error')
             return next
          }, { replace: true })
        }
      }
      sessionStorage.removeItem('auth_pending')
    }
  }, [authLoading, user, searchParams, show, setSearchParams])

  useEffect(() => {
    const openBySlug = async (slug: string) => {
      setEventLoading(true)
      setEventError('')
      setEventData(null)
      try {
        const r = await fetch(`${API}/events/slug/${slug}`, { credentials: 'include' })
        if (!r.ok) {
          const j: Partial<{ error?: string }> = await r.json().catch(() => ({}))
          throw new Error(j?.error || 'not_found')
        }
        const j: EventDetail = await r.json()
        setEventData(j)
        setShowEventModal(true)
        const firstAvailable = (j.ticketTypes || []).find((tt) => Number(tt.quantity || 0) > 0)
        setSelectedTT(firstAvailable?.id || '')
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('buy')
          next.delete('buyId')
          return next
        }, { replace: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao carregar'
        setEventError(msg)
      } finally {
        setEventLoading(false)
      }
    }
    const openById = async (id: string) => {
      setEventLoading(true)
      setEventError('')
      setEventData(null)
      try {
        const r = await fetch(`${API}/events/${id}`, { credentials: 'include' })
        if (!r.ok) throw new Error('not_found')
        const j: EventDetail = await r.json()
        setEventData(j)
        setShowEventModal(true)
        const firstAvailable = (j.ticketTypes || []).find((tt) => Number(tt.quantity || 0) > 0)
        setSelectedTT(firstAvailable?.id || '')
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('buy')
          next.delete('buyId')
          return next
        }, { replace: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao carregar'
        setEventError(msg)
      } finally {
        setEventLoading(false)
      }
    }
    const param = buyId || buySlug
    if (!param) return
    if (authLoading) return
    if (!user) { setShowModal(true); return }
    if (buyId) openById(buyId)
    else openBySlug(buySlug)
  }, [API, buySlug, buyId, user, authLoading, setSearchParams])

  useEffect(() => {
    if (!Array.isArray(publishedEvents) || publishedEvents.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) >= publishedEvents.length ? 0 : (i + 1))
    }, 4000)
    return () => clearInterval(id)
  }, [publishedEvents])

  useEffect(() => {
    if (publishedEvents.length > 0 && activeIndex >= publishedEvents.length) {
      setActiveIndex(0)
    }
  }, [publishedEvents, activeIndex])

  async function reloadEvents() {
    setRefreshing(true)
    show({ text: 'Atualizando eventos...', kind: 'ok' })
    try {
      const r = await fetch(`${API}/events?status=PUBLISHED`, { credentials: 'include' })
      const j = await r.json().catch(() => [])
      if (Array.isArray(j)) setEvents(j)
    } catch { setEvents(e => e) }
    finally { setRefreshing(false) }
    show({ text: 'Eventos atualizados', kind: 'ok' })
  }

  return (
    <div style={{ height: '100vh', background: palette.bg, display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box', paddingTop: 100, overflow: 'hidden' }}>
      <Header
        user={user}
        onCreate={() => { if (user) { setShowCreateModal(true) } else { setShowModal(true) } }}
        onOpenMyEvents={() => { if (user) { setShowMyEvents(true) } else { setShowModal(true) } }}
        onOpenMyTickets={() => { if (user) { setShowMyTickets(true) } else { setShowModal(true) } }}
        onLoginOpen={() => { setShowModal(true) }}
        onLogout={async () => { try { await fetch(`${API}/auth/logout`, { method:'POST', credentials:'include' }); setUser(null); show({ text:'Sessão encerrada', kind:'ok' }) } catch { show({ text:'Falha ao sair', kind:'err' }) } }}
        onMakeOrder={() => {
          const active = publishedEvents[activeIndex]
          if (!active) { if (!user) { setShowModal(true) } ; return }
          if (!user) {
            setShowModal(true)
            const next = new URLSearchParams(searchParams)
            next.set('buyId', active.id)
            setSearchParams(next)
            return
          }
          const slug = active.title
            .toLowerCase()
            .normalize('NFD')
            .replaceAll(/[\u0300-\u036f]/g, '')
            .replaceAll(/([^a-z0-9]+)/g, '-')
            .replaceAll(/(?:^-+|-+$)/g, '')
          setShowEventModal(true)
          setEventLoading(true)
          setEventError('')
          setEventData(null)
          ;(async () => {
            try {
              const r = await fetch(`${API}/events/slug/${slug}`)
              if (!r.ok) throw new Error('not_found')
              const j = await r.json()
              setEventData(j)
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Falha ao carregar'
              setEventError(msg)
            } finally { setEventLoading(false) }
          })()
        }}
      />

      <section style={{ position: 'relative', padding: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', justifyContent: 'center' }}>
        <div style={{ width:'100%', margin:'0 auto', padding:'0 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '100%', display: 'flex', gap: 14, flexWrap:'wrap' }}>
          </div>
          {refreshing && null}
          <EventsCarousel
            events={publishedEvents}
            activeIndex={activeIndex}
            onSelect={(i)=> setActiveIndex(i)}
            onOpenEvent={(ev) => {
              if (!user) {
                setShowModal(true)
                const next = new URLSearchParams(searchParams)
                next.set('buyId', ev.id)
                setSearchParams(next)
                return
              }
              const next = new URLSearchParams(searchParams)
              next.set('buyId', ev.id)
              setSearchParams(next)
            }}
          />
        </div>
      </section>

      <AuthModal
        open={showModal}
        onClose={() => setShowModal(false)}
        buySlug={buySlug}
        buyId={buyId}
        onLoggedIn={(u) => {
          setUser(u)
          let next = '/'
          if (buyId) next = `/?buyId=${encodeURIComponent(buyId)}`
          else if (buySlug) next = `/?buy=${encodeURIComponent(buySlug)}`
          navigate(next, { replace: true })
        }}
      />

      <EventPurchaseModal
        key={eventData?.id || 'none'}
        open={showEventModal}
        loading={eventLoading}
        error={eventError}
        data={eventData}
        selectedTT={selectedTT}
        qty={qty}
        onClose={() => {
          setShowEventModal(false)
          setQty(1)
          setSelectedTT('')
        }}
        onSelectTT={(id)=> setSelectedTT(id)}
        onChangeQty={(n)=> setQty(n)}
      />

      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
        onCreated={async () => {
          await reloadEvents()
          setShowCreateModal(false)
        }}
      />

      <MyEventsModal
        open={showMyEvents}
        onClose={() => setShowMyEvents(false)}
        onEdit={(ev: EventSummary) => { setEditEvent({ id: ev.id, title: '', location: '', startDate: '', description: '' }) }}
        onPublished={reloadEvents}
      />

      <MyTicketsModal open={showMyTickets} onClose={() => setShowMyTickets(false)} />

      <EditEventModal
        open={!!editEvent}
        onClose={() => setEditEvent(null)}
        eventId={editEvent?.id}
        currentImageUrl={(editEvent ? (events.find(e => e.id===editEvent.id)?.imageUrl || null) : null)}
        onUpdated={(p) => { 
          if (!p?.id) return
          setEvents(list => list.map(e => e.id === p.id ? { ...e, imageUrl: p.imageUrl || e.imageUrl } : e))
        }}
      />
      <Footer />
    </div>
  )
}

