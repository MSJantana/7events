import styles from './modal.module.css'
import { useEffect, useState } from 'react'
import type { EventSummary } from '../../types'
import { getEventsByStatus, getTicketTypes, publishEvent, cancelEvent, getEventsByStatusPaginated } from '../../services/events'
import { getAllOrders } from '../../services/orders'
import { useToast } from '../../hooks/useToast'

async function getMergedAllEvents() {
  const pub = await getEventsByStatus('PUBLISHED')
  const draft = await getEventsByStatus('DRAFT').catch(() => [])
  const canceled = await getEventsByStatus('CANCELED').catch(() => [])
  const finalized = await getEventsByStatus('FINALIZED').catch(() => [])
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

async function loadAllData() {
  const items = await getMergedAllEvents()
  const statsObj = await computeStatsForEvents(items)
  return { items, total: 0, serverMode: false, stats: statsObj }
}

async function loadFilterData(filterVal: 'PUBLISHED' | 'DRAFT' | 'CANCELED' | 'FINALIZED', pageNum: number, pageSz: number) {
  try {
    const resp = await getEventsByStatusPaginated(filterVal, pageNum, pageSz)
    const items = Array.isArray(resp?.items) ? resp.items : []
    const statsObj = await computeStatsForEvents(items)
    return { items, total: Number(resp?.total || 0), serverMode: true, stats: statsObj }
  } catch {
    const list = await getEventsByStatus(filterVal).catch(() => [])
    const items = Array.isArray(list) ? list : []
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

export default function MyEventsModal({ open, onClose, onEdit, onPublished }: Readonly<{ open: boolean; onClose: () => void; onEdit: (ev: EventSummary) => void; onPublished?: () => void }>) {
  const { show, hide } = useToast()
  const [events, setEvents] = useState<EventSummary[]>([])
  const filter: 'ALL' | 'PUBLISHED' | 'DRAFT' | 'CANCELED' | 'FINALIZED' = 'ALL'
  const query = ''
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [stats, setStats] = useState<Record<string, { available: number; waiting: number; active: number }>>({})
  const [serverMode, setServerMode] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!open) { return }
    ;(async () => {
      try {
        const data = filter === 'ALL' ? await loadAllData() : await loadFilterData(filter, page, pageSize)
        setServerMode(data.serverMode)
        setTotal(data.total)
        setEvents(data.items)
        setStats(data.stats)
      } catch { setEvents([]) }
    })()
  }, [open, page])
  useEffect(() => {
    if (!open) { return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

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
    const publishDisabled = hasPurch || ev.status === 'PUBLISHED' || finalOrCanceled
    const cancelDisabled = finalOrCanceled
    const editDisabled = hasPurch || finalOrCanceled
    const disabledTitle = finalOrCanceled ? 'Ação indisponível para eventos finalizados/cancelados' : undefined
    return { publishDisabled, cancelDisabled, editDisabled, disabledTitle }
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
    <div className={styles.overlay}>
      <div className={styles.modal}>     
        <div className={styles.section}>
          
          {filteredSorted.length === 0 ? (
            <div className={`${styles.notice} ${styles.noticeInfo}`}>Nenhum evento encontrado</div>
          ) : pageItems.map(ev => {
            const a = computeActions(ev, hasPurchases(ev.id))
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
          })}
          {filteredSorted.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:12, color:'#6b7280' }}>Página {page} de {totalPages}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}>Fechar</button>
                <button className={`${styles.btn} ${styles.ghost}`} disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
                <button className={`${styles.btn} ${styles.ghost}`} disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Próxima</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
