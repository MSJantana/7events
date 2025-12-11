import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../index.css'
import { palette } from '../theme/palette'
import EventsCarousel from '../components/EventsCarousel'
import { useToast } from '../hooks/useToast'
import LoginModal from '../components/modals/LoginModal'
import { isValidEmail, isStrongPassword } from '../utils/validation'
import { translateError } from '../services/api'
import EventPurchaseModal from '../components/modals/EventPurchaseModal'
import EventDetailModal from '../components/modals/EventDetailModal'
import CreateEventModal from '../components/modals/CreateEventModal'
import MyEventsModal from '../components/modals/MyEventsModal'
import MyTicketsModal from '../components/modals/MyTicketsModal'
import EditEventModal from '../components/modals/EditEventModal'
import Header from '../components/Header'
import type { EventSummary, EventDetail, User } from '../types'

 

 

export default function Login() {
  const API = useMemo(() => (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000', [])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const buySlug = searchParams.get('buy') || ''
  const buyId = searchParams.get('buyId') || ''
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ text: string, kind: 'ok' | 'err' | '' }>({ text: '', kind: '' })
  const [showModal, setShowModal] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventData, setEventData] = useState<EventDetail | null>(null)
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
        if (j.status === 'FINALIZED') {
          setShowDetailsModal(true)
          setShowEventModal(false)
        } else {
          setShowEventModal(true)
          const firstAvailable = (j.ticketTypes || []).find((tt) => Number(tt.quantity || 0) > 0)
          setSelectedTT(firstAvailable?.id || '')
        }
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
        if (j.status === 'FINALIZED') {
          setShowDetailsModal(true)
          setShowEventModal(false)
        } else {
          setShowEventModal(true)
          const firstAvailable = (j.ticketTypes || []).find((tt) => Number(tt.quantity || 0) > 0)
          setSelectedTT(firstAvailable?.id || '')
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao carregar'
        setEventError(msg)
      } finally {
        setEventLoading(false)
      }
    }
    const param = buyId || buySlug
    if (!param) return
    if (!user) { setShowModal(true); setShowEmailForm(false) }
    if (buyId) openById(buyId)
    else openBySlug(buySlug)
  }, [API, buySlug, buyId, user])

  useEffect(() => {
    if (!Array.isArray(events) || events.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex(i => (i + 1) >= events.length ? 0 : (i + 1))
    }, 4000)
    return () => clearInterval(id)
  }, [events])

  

  

  

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
        onLogout={async () => { try { await fetch(`${API}/auth/logout`, { method:'POST', credentials:'include' }); setUser(null); show({ text:'Sessão encerrada', kind:'ok' }) } catch { show({ text:'Falha ao sair', kind:'err' }) } }}
        onMakeOrder={() => {
          const active = events[activeIndex]
          if (!active) { if (!user) { setShowModal(true) } ; return }
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
            onOpenEvent={(ev) => {
              if (!user) {
                setShowModal(true)
                setShowEmailForm(false)
                navigate(`/?buyId=${encodeURIComponent(ev.id)}`)
                return
              }
              navigate(`/?buyId=${encodeURIComponent(ev.id)}`)
            }}
          />
        </div>
      </section>
      <LoginModal
        open={showModal}
        API={API}
        buySlug={buySlug}
        buyId={buyId}
        onClose={() => setShowModal(false)}
        email={email}
        password={password}
        emailError={emailError}
        passwordError={passwordError}
        showPass={showEmailForm}
        showRegister={showRegister}
        loading={loading}
        status={status}
        setEmail={setEmail}
        setPassword={setPassword}
        setEmailError={setEmailError}
        setPasswordError={setPasswordError}
        setShowPass={(v)=> setShowEmailForm(v)}
        setShowRegister={(v)=> setShowRegister(v)}
        name={name}
        nameError={nameError}
        setName={setName}
        setNameError={setNameError}
        onLocalLogin={async () => {
          setStatus({ text: '', kind: '' })
          function setStatusTemp(text: string, kind: 'ok' | 'err', ms = 5000) {
            setStatus({ text, kind })
            setTimeout(() => setStatus({ text: '', kind: '' }), ms)
          }
          if (!validateCredentials(email, password, setEmailError, setPasswordError)) { setStatusTemp('Corrija os campos', 'err'); return }
          setLoading(true)
          try {
            const resp = await fetch(`${API}/auth/local/login`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password })
            })
            if (!resp.ok) {
              const j = await resp.json().catch(() => ({}))
              setStatusTemp(translateError(j?.error || 'local_login_failed'), 'err'); return
            }
            await persistAccessTokenFrom(resp)
            await loadWhoami(API, setUser)
            setShowModal(false)
            setStatusTemp('Logado com sucesso', 'ok')
            const next = buyId ? `/?buyId=${encodeURIComponent(buyId)}` : (buySlug ? `/?buy=${encodeURIComponent(buySlug)}` : '/')
            navigate(next, { replace: true })
          } catch {
            setStatusTemp('Falha no login', 'err')
          } finally { setLoading(false) }
        }}
        onLocalRegister={async () => {
          setStatus({ text: '', kind: '' })
          function setStatusTemp(text: string, kind: 'ok' | 'err', ms = 5000) {
            setStatus({ text, kind })
            setTimeout(() => setStatus({ text: '', kind: '' }), ms)
          }
          const eOk = isValidEmail(email)
          const pOk = isStrongPassword(password)
          const nOk = !!name
          setEmailError(eOk ? '' : 'Email inválido')
          setPasswordError(pOk ? '' : 'Senha deve ter 8+ e incluir maiúscula, minúscula e dígito')
          setNameError(nOk ? '' : 'Nome obrigatório')
          if (!(eOk && pOk && nOk)) { setStatusTemp('Corrija os campos', 'err'); return }
          setLoading(true)
          try {
            const r = await fetch(`${API}/auth/local/register`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, name, password })
            })
            if (!r.ok) {
              const j = await r.json().catch(() => ({}))
              setStatusTemp(translateError(j?.error || 'local_register_failed'), 'err'); return
            }
            const login = await fetch(`${API}/auth/local/login`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password })
            })
            if (!login.ok) {
              const je = await login.json().catch(() => ({}))
              setStatusTemp(translateError(je?.error || 'local_login_failed'), 'err'); return
            }
            await loadWhoami(API, setUser)
            setShowModal(false)
            setStatusTemp('Conta criada e logado', 'ok')
            const next = buyId ? `/?buyId=${encodeURIComponent(buyId)}` : (buySlug ? `/?buy=${encodeURIComponent(buySlug)}` : '/')
            navigate(next, { replace: true })
          } catch {
            setStatusTemp('Falha no cadastro', 'err')
          } finally { setLoading(false) }
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
        onClose={() => setShowEventModal(false)}
        onSelectTT={(id)=> setSelectedTT(id)}
        onChangeQty={(n)=> setQty(n)}
      />

      <EventDetailModal
        open={showDetailsModal}
        loading={eventLoading}
        error={eventError}
        data={eventData}
        onClose={() => setShowDetailsModal(false)}
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
