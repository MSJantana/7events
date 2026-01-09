import styles from './modals/modal.module.css'
import { useEffect, useState, useCallback, type Dispatch, type SetStateAction } from 'react'
import type { EventSummary } from '../types'
import { getEventsByStatus, getTicketTypes, publishEvent, cancelEvent, getEventsByStatusPaginated } from '../services/events'
import { getAllOrders } from '../services/orders'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuth'
import { renderNotice } from './common/Notice'
import type { NoticeStyles } from './common/Notice'

async function getMergedAllEvents(isAdmin?: boolean) {
  const pubRaw = await getEventsByStatus('PUBLISHED')
  const draft = await getEventsByStatus('DRAFT').catch(() => [])
  const canceledRaw = await getEventsByStatus('CANCELED').catch(() => [])
  const finalizedRaw = await getEventsByStatus('FINALIZED').catch(() => [])

  // Filter events older than 10 days (except drafts)
  const now = Date.now()
  const limitMs = 10 * 24 * 60 * 60 * 1000
  
  const isRecent = (ev: EventSummary) => {
    if (isAdmin) return true
    if (!ev.endDate) return false 
    const end = new Date(ev.endDate).getTime()
    if (Number.isNaN(end)) return false
    return (now - end) <= limitMs
  }

  const pub = pubRaw.filter(isRecent)
  const canceled = canceledRaw.filter(isRecent)
  const finalized = finalizedRaw.filter(isRecent)

  const map = new Map<string, EventSummary>()
  for (const e of pub) if (!map.has(e.id)) map.set(e.id, e)
  for (const e of draft) if (!map.has(e.id)) map.set(e.id, e)
  for (const e of canceled) if (!map.has(e.id)) map.set(e.id, e)
  for (const e of finalized) if (!map.has(e.id)) map.set(e.id, e)
  return Array.from(map.values())
}

async function computeStatsForEvents(list: EventSummary[]) {
  const s: Record<string, { available: number; waiting: number; active: number }> = {}
  await Promise.all(list.map(async (ev) => {
    try {
      const tts = await getTicketTypes(ev.id)
      const available = Array.isArray(tts) ? tts.reduce((acc, t) => acc + Number(t?.quantity || 0), 0) : 0
      s[ev.id] = { available, waiting: 0, active: 0 }
    } catch { s[ev.id] = { available: 0, waiting: 0, active: 0 } }
  }))
  const orders = await getAllOrders().catch(() => [])
  for (const o of orders) {
    const tickets = Array.isArray(o?.tickets) ? o.tickets : []
    for (const t of tickets) {
      const evId = String(t?.eventId || '')
      const st = String(t?.status || '')
      if (!s[evId]) s[evId] = { available: 0, waiting: 0, active: 0 }
      if (st === 'WAITING') s[evId].waiting += 1
      if (st === 'ACTIVE') s[evId].active += 1
    }
  }
  return s
}

async function loadAllData(isAdmin?: boolean) {
  const items = await getMergedAllEvents(isAdmin)
  const statsObj = await computeStatsForEvents(items)
  return { items, total: 0, serverMode: false, stats: statsObj }
}

async function loadFilterData(filterVal: 'PUBLISHED' | 'DRAFT' | 'CANCELED' | 'FINALIZED', pageNum: number, pageSz: number, isAdmin?: boolean) {
  const now = Date.now()
  const limitMs = 10 * 24 * 60 * 60 * 1000
  const isOld = (ev: EventSummary) => {
    if (isAdmin) return false
    if (ev.status !== 'FINALIZED') return false
    const end = new Date(ev.endDate).getTime()
    return (now - end) > limitMs
  }

  try {
    const resp = await getEventsByStatusPaginated(filterVal, pageNum, pageSz)
    let items = Array.isArray(resp?.items) ? resp.items : []
    if (filterVal === 'FINALIZED') items = items.filter(e => !isOld(e))
    const statsObj = await computeStatsForEvents(items)
    return { items, total: Number(resp?.total || 0), serverMode: true, stats: statsObj }
  } catch {
    const list = await getEventsByStatus(filterVal).catch(() => [])
    let items = Array.isArray(list) ? list : []
    if (filterVal === 'FINALIZED') items = items.filter(e => !isOld(e))
    const statsObj = await computeStatsForEvents(items)
    return { items, total: 0, serverMode: false, stats: statsObj }
  }
}

function matchesQuery(title: string, q: string) {
  const s = q.trim().toLowerCase()
  return s === '' ? true : title.toLowerCase().includes(s)
}

function matchesFilter(status: EventSummary['status'], f: 'ALL' | 'PUBLISHED' | 'DRAFT' | 'CANCELED' | 'FINALIZED') {
  return f === 'ALL' ? true : status === f
}

const notice = (kind: 'ok' | 'err' | 'info', text: string, style?: Record<string, unknown>) => renderNotice(styles as unknown as NoticeStyles, kind, text, style)

export default function MyEventsView({ onEdit, onPublished }: Readonly<{ onEdit: (ev: EventSummary) => void; onPublished?: () => void }>) {
  const { show, hide } = useToast()
  const { user } = useAuth()
  const [events, setEvents] = useState<EventSummary[]>([])
  const filter: 'ALL' | 'PUBLISHED' | 'DRAFT' | 'CANCELED' | 'FINALIZED' = 'ALL'
  const query = ''
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [stats, setStats] = useState<Record<string, { available: number; waiting: number; active: number }>>({})
  const [serverMode, setServerMode] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
        const isAdmin = user?.role === 'ADMIN'
        const data = filter === 'ALL' ? await loadAllData(isAdmin) : await loadFilterData(filter, page, pageSize, isAdmin)
        setServerMode(data.serverMode)
        setTotal(data.total)
        setEvents(data.items)
        setStats(data.stats)
    } catch { 
        setEvents([]) 
    } finally {
        setLoading(false)
    }
  }, [filter, page, pageSize, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  function hasPurchases(evId: string) {
    const st = stats[evId] || { waiting: 0, active: 0, available: 0 }
    return (Number(st.waiting || 0) + Number(st.active || 0)) > 0
  }

  function statusPillStyle(status: EventSummary['status']) {
    if (status === 'PUBLISHED') return { background:'#ecfdf5', borderColor:'var(--ok)', color:'#065f46' }
    if (status === 'DRAFT') return { background:'#fff', borderColor:'var(--border)', color:'var(--gray)' }
    if (status === 'CANCELED') return { background:'#fee2e2', borderColor:'var(--danger)', color:'#111' }
    return { background:'#f3f4f6', borderColor:'var(--border)', color:'var(--gray)' }
  }

function statusIcon(status: EventSummary['status']) {
  if (status === 'PUBLISHED') return '✅'
  if (status === 'DRAFT') return '📝'
  if (status === 'CANCELED') return '⛔'
  return '🏁'
}

function computeActions(ev: EventSummary, hasPurch: boolean) {
    const finalOrCanceled = ev.status === 'FINALIZED' || ev.status === 'CANCELED'
    const evOwnerId = (ev as Record<string, unknown>)['userId'] as string | undefined
    const isOwner = !!user && (user.role === 'ADMIN' || String(evOwnerId || '') === String(user.id))
    const publishDisabled = hasPurch || ev.status === 'PUBLISHED' || finalOrCanceled || !isOwner
    const cancelDisabled = finalOrCanceled || !isOwner
    const editDisabled = hasPurch || finalOrCanceled || !isOwner
    let disabledTitle: string | undefined
    if (!isOwner) {
      disabledTitle = 'Ação permitida apenas ao criador do evento'
    } else if (finalOrCanceled) {
      disabledTitle = 'Ação indisponível para eventos finalizados/cancelados'
    }

    return { publishDisabled, cancelDisabled, editDisabled, disabledTitle }
  }

function renderEventItem(
  ev: EventSummary,
  a: { publishDisabled: boolean; cancelDisabled: boolean; editDisabled: boolean; disabledTitle?: string },
  stats: Record<string, { available: number; waiting: number; active: number }>,
  onPublish: (id: string) => void,
  onCancel: (ev: EventSummary) => void,
  onEdit: (ev: EventSummary) => void
  ) {
    return (
      <div key={ev.id} className={styles.item}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ fontWeight:700 }}>{ev.title}</div>
        <span className={styles.pill} style={statusPillStyle(ev.status)}>
          <span aria-hidden>{statusIcon(ev.status)}</span>
          <span>{ev.status}</span>
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color: '#6b7280', border:'1px solid #e5e7eb', borderRadius:999, padding:'2px 8px' }}>Disponíveis: {stats[ev.id]?.available ?? '—'}</span>
          <span style={{ fontSize:12, color: '#6b7280', border:'1px solid #e5e7eb', borderRadius:999, padding:'2px 8px' }}>Reservados: {stats[ev.id]?.waiting ?? '—'}</span>
          <span style={{ fontSize:12, color: '#6b7280', border:'1px solid #e5e7eb', borderRadius:999, padding:'2px 8px' }}>Ativos: {stats[ev.id]?.active ?? '—'}</span>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button
          disabled={a.publishDisabled}
          title={a.disabledTitle}
          className={`${styles.btn} ${styles.ghost}`}
          onClick={() => onPublish(ev.id)}
        >Publicar</button>
        <button
          disabled={a.cancelDisabled}
          title={a.disabledTitle}
          className={`${styles.btn} ${styles.danger}`}
          onClick={() => onCancel(ev)}
        >Cancelar</button>
        <button
          disabled={a.editDisabled}
          title={a.disabledTitle}
          className={`${styles.btn} ${styles.ghost}`}
          onClick={() => onEdit(ev)}
        >Editar</button>
      </div>
    </div>
  )
}

function renderPaginationFooter(page: number, totalPages: number, setPage: Dispatch<SetStateAction<number>>) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 16 }}>
      <div style={{ fontSize:12, color:'#6b7280' }}>Página {page} de {totalPages}</div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button className={`${styles.btn} ${styles.ghost}`} disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
        <button className={`${styles.btn} ${styles.ghost}`} disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Próxima</button>
      </div>
    </div>
  )
}

  async function onPublish(id: string) {
    try { await publishEvent(id); setEvents(list => list.map(e => e.id===id ? { ...e, status: 'PUBLISHED' } : e)); show({ text: 'Publicado', kind: 'ok' }); onPublished?.() }
    catch { show({ text: 'Falha ao publicar', kind: 'err' }) }
  }
  function applyCancel(id: string) {
    setEvents(list => list.map(e => e.id===id ? { ...e, status: 'CANCELED' } : e))
  }
  async function confirmCancel(ev: EventSummary) {
    try { await cancelEvent(ev.id); applyCancel(ev.id); show({ text: 'Cancelado', kind: 'ok' }) }
    catch { show({ text: 'Falha ao cancelar', kind: 'err' }) }
  }
  function onCancel(ev: EventSummary) {
    if (ev.status === 'FINALIZED') { show({ text: 'evento finalizado não pode ser cancelado', kind: 'err' }); return }
    if (hasPurchases(ev.id)) { show({ text: 'evento não pode ser cancelado: ingressos adquiridos', kind: 'err' }); return }
    show({
      text: 'Deseja cancelar este evento?',
      kind: 'err',
      actions: [
        { label: 'Não', onClick: () => { hide() }, kind: 'ghost' },
        { label: 'Sim', kind: 'danger', onClick: confirmCancel.bind(null, ev) }
      ],
      duration: 0
    })
  }

  const baseList = serverMode ? events : events.filter(ev => matchesFilter(ev.status, filter))
  const filtered = baseList.filter(ev => matchesQuery(ev.title, query))
  const filteredSorted = [...filtered].sort((a,b) => {
    const ta = new Date(a.startDate).getTime(); const tb = new Date(b.startDate).getTime()
    return tb - ta
  })
  const totalPages = serverMode ? Math.max(1, Math.ceil(Math.max(Number(total||0), filteredSorted.length) / pageSize)) : Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const pageItems = serverMode ? filteredSorted : filteredSorted.slice((page-1)*pageSize, (page-1)*pageSize + pageSize)

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Gerenciar Eventos</h2>
        <button 
            onClick={loadData}
            title="Atualizar lista"
            disabled={loading}
            style={{ 
                border: 'none', background: 'transparent', cursor: loading ? 'wait' : 'pointer', 
                color: '#6b7280', display: 'flex', alignItems: 'center', opacity: loading ? 0.7 : 1 
            }}>
            <span className={`mi ${loading ? 'spin' : ''}`} style={{ fontSize: 24 }}>refresh</span>
        </button>
      </div>

      <div className={styles.section} style={{ padding: 0 }}>
        {filteredSorted.length === 0 ? (
          notice('info', 'Nenhum evento encontrado')
        ) : pageItems.map(ev => renderEventItem(ev, computeActions(ev, hasPurchases(ev.id)), stats, onPublish, onCancel, onEdit))}
        {filteredSorted.length > 0 && renderPaginationFooter(page, totalPages, setPage)}
      </div>
    </div>
  )
}
