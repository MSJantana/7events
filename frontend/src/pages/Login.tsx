import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../index.css'
import { palette } from '../theme/palette'
import EventsCarousel from '../components/EventsCarousel'
import { useToast } from '../hooks/useToast'
import LoginModal from '../components/modals/LoginModal'
import EventPurchaseModal from '../components/modals/EventPurchaseModal'
import { isValidEmail, isStrongPassword } from '../utils/validation'
import CreateEventModal from '../components/modals/CreateEventModal'
import MyEventsModal from '../components/modals/MyEventsModal'
import MyTicketsModal from '../components/modals/MyTicketsModal'
import EditEventModal from '../components/modals/EditEventModal'
import Header from '../components/Header'
import type { EventSummary, User } from '../types'

async function persistAccessTokenFrom(resp: Response) {
  try {
    const jr = await resp.json().catch(() => ({}))
    if (jr?.accessToken) {
      try { globalThis.localStorage.setItem('access_token', jr.accessToken) } catch { void 0 }
    }
  } catch { void 0 }
}

async function loadWhoami(API: string, setUser: Dispatch<SetStateAction<User | null>>) {
  try {
    const w = await fetch(`${API}/auth/whoami`, { credentials: 'include' })
    if (!w.ok) return
    const j = await w.json()
    if (j?.accessToken) {
      try { globalThis.localStorage.setItem('access_token', j.accessToken) } catch { void 0 }
    }
    if (j?.user) setUser({ id: j.user.id, name: j.user.name, email: j.user.email, role: j.user.role })
  } catch { setUser(u => u) }
}

function validateCredentials(
  email: string,
  password: string,
  setEmailError: Dispatch<SetStateAction<string>>,
  setPasswordError: Dispatch<SetStateAction<string>>
) {
  const eOk = isValidEmail(email)
  const pOk = isStrongPassword(password)
  setEmailError(eOk ? '' : 'Email inválido')
  setPasswordError(pOk ? '' : 'Senha deve ter 8+ e incluir maiúscula, minúscula e dígito')
  return eOk && pOk
}

export default function Login() {
  const API = useMemo(() => (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000', [])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const buySlug = searchParams.get('buy') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ text: string, kind: 'ok' | 'err' | '' }>({ text: '', kind: '' })
  const [showModal, setShowModal] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventData, setEventData] = useState<{
    id: string
    title: string
    description: string
    location: string
    startDate: string
    endDate: string
    status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'FINALIZED'
    imageUrl?: string | null
    capacity: number
    minPrice: number
    ticketTypes: { id: string; name: string; price: number; quantity: number }[]
  } | null>(null)
  const [selectedTT, setSelectedTT] = useState<string>('')
  const [qty, setQty] = useState<number>(1)

  
  const [user, setUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMyEvents, setShowMyEvents] = useState(false)
  const [editEvent, setEditEvent] = useState<{ id: string; title: string; location: string; startDate: string; endDate: string; description: string } | null>(null)
  const [showMyTickets, setShowMyTickets] = useState(false)
  const [events, setEvents] = useState<Array<{ id: string; title: string; description?: string; location: string; startDate: string; endDate: string; status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'FINALIZED'; imageUrl?: string | null }>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const { show } = useToast()

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
    if (!Array.isArray(events) || events.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) >= events.length ? 0 : (i + 1))
    }, 4000)
    return () => clearInterval(id)
  }, [events])

  

  async function onLocalLogin() {
    setStatus({ text: '', kind: '' })

    function setStatusTemp(text: string, kind: 'ok' | 'err', ms = 5000) {
      setStatus({ text, kind })
      setTimeout(() => setStatus({ text: '', kind: '' }), ms)
    }

    if (!validateCredentials(email, password, setEmailError, setPasswordError)) {
      setStatusTemp('Corrija os campos', 'err')
      return
    }

    setLoading(true)
    try {
      const resp = await fetch(`${API}/auth/local/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        setStatusTemp(j?.error || 'Falha no login', 'err')
        return
      }
      await persistAccessTokenFrom(resp)
      await loadWhoami(API, setUser)
      setShowModal(false)
      setStatusTemp('Logado com sucesso', 'ok')
      navigate(buySlug ? `/?buy=${encodeURIComponent(buySlug)}` : '/', { replace: true })
    } catch {
      setStatusTemp('Falha no login', 'err')
    } finally {
      setLoading(false)
    }
  }

  

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
    <div style={{ minHeight: '100vh', background: palette.bg, display: 'flex', flexDirection: 'column' }}>
      <Header
        user={user}
        onCreate={() => { if (user) { setShowCreateModal(true) } else { setShowModal(true); setShowEmailForm(false) } }}
        onOpenMyEvents={() => { if (user) { setShowMyEvents(true) } else { setShowModal(true); setShowEmailForm(false) } }}
        onOpenMyTickets={() => { if (user) { setShowMyTickets(true) } else { setShowModal(true); setShowEmailForm(false) } }}
        onLoginOpen={() => { setShowModal(true); setShowEmailForm(false) }}
        onLogout={async () => { try { await fetch(`${API}/auth/logout`, { method:'POST', credentials:'include' }); setUser(null); setStatus({ text:'Sessão encerrada', kind:'ok' }); setTimeout(()=> setStatus({ text:'', kind:'' }), 2000) } catch { setStatus({ text:'Falha ao sair', kind:'err' }); setTimeout(()=> setStatus({ text:'', kind:'' }), 2000) } }}
        onMakeOrder={() => {
          const active = events[activeIndex]
          if (!active) { if (!user) { setShowModal(true); setShowEmailForm(false) } ; return }
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

      <section style={{ position: 'relative', padding: '32px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width:'100%', margin:'0 auto', padding:'0 32px' }}>
          <div style={{ width: '100%', display: 'flex', gap: 14, flexWrap:'wrap' }}>
          </div>
          {refreshing && null}
          <EventsCarousel
            events={events}
            activeIndex={activeIndex}
            onSelect={(i)=> setActiveIndex(i)}
            onOpenEvent={async (ev) => {
              const slug = ev.title.toLowerCase().normalize('NFD').replaceAll(/[\u0300-\u036f]/g,'').replaceAll(/[^a-z0-9]+/g,'-').replaceAll(/(?:^-+|-+$)/g,'')
              setShowEventModal(true)
              setEventLoading(true)
              setEventError('')
              setEventData(null)
              try {
                const r = await fetch(`${API}/events/slug/${slug}`)
                if (!r.ok) {
                  const j = await r.json().catch(() => ({}))
                  throw new Error(j?.error || 'not_found')
                }
                const j = await r.json()
                setEventData(j)
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Falha ao carregar'
                setEventError(msg)
              } finally {
                setEventLoading(false)
              }
            }}
          />
        </div>
      </section>
      <LoginModal
        open={showModal}
        API={API}
        buySlug={buySlug}
        email={email}
        password={password}
        emailError={emailError}
        passwordError={passwordError}
        showPass={showEmailForm}
        loading={loading}
        status={status}
        onClose={() => setShowModal(false)}
        setEmail={setEmail}
        setPassword={setPassword}
        setEmailError={setEmailError}
        setPasswordError={setPasswordError}
        setShowPass={(v)=> setShowEmailForm(v)}
        onLocalLogin={onLocalLogin}
      />

      <EventPurchaseModal
        key={eventData?.id || 'none'}
        open={showEventModal}
        loading={eventLoading}
        error={eventError}
        data={eventData}
        selectedTT={selectedTT}
        qty={qty}
        onClose={() => setShowEventModal(false)}
        onSelectTT={(id)=> setSelectedTT(id)}
        onChangeQty={(n)=> setQty(n)}
      />

      <CreateEventModal open={showCreateModal} onClose={() => setShowCreateModal(false)} user={user} onCreated={async () => { await reloadEvents(); setShowCreateModal(false) }} />

      <MyEventsModal
        open={showMyEvents}
        onClose={() => setShowMyEvents(false)}
        onEdit={(ev: EventSummary) => { setEditEvent({ id: ev.id, title: '', location: '', startDate: '', endDate: '', description: '' }) }}
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
    </div>
  )
}


