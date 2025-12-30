import styles from './modal.module.css'
import { renderNotice } from '../common/Notice'
import type { NoticeStyles } from '../common/Notice'
import { getMyOrders } from '../../services/orders'
import { useEffect, useState } from 'react'
import type { Order } from '../../types'
import TicketList from './TicketList'
import type { TicketRowData } from './TicketList'

const notice = (kind: 'ok' | 'err' | 'info', text: string, style?: Record<string, unknown>) => renderNotice(styles as unknown as NoticeStyles, kind, text, style)

export default function MyTicketsModal({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) { return }
    ;(async () => {
      try { setOrders(await getMyOrders()) } catch { setOrders([]) }
    })()
  }, [open])

  useEffect(() => {
    if (!open) { return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const tickets: TicketRowData[] = orders.flatMap(o => {
    return (o.tickets || []).map(t => {
      // Cast 't' to a type that includes 'event' to avoid 'any'
      const ticketWithEvent = t as typeof t & { event?: { title?: string; imageUrl?: string } }
      const evt = ticketWithEvent.event
      return {
        id: t.id || '',
        eventName: evt?.title || 'Evento',
        eventImage: evt?.imageUrl,
        ticketTypeName: t.ticketType?.name || 'Ingresso',
        price: Number(t.ticketType?.price || 0),
        status: t.status || o.status,
        purchaseDate: o.createdAt || '',
        code: o.id || ''
      }
    })
  })

  // Group tickets by Event Name
  const ticketsByEvent = tickets.reduce((acc, t) => {
    const key = t.eventName
    if (!acc[key]) {
      acc[key] = {
        name: key,
        image: t.eventImage,
        tickets: []
      }
    }
    acc[key].tickets.push(t)
    return acc
  }, {} as Record<string, { name: string; image?: string; tickets: TicketRowData[] }>)

  const eventGroups = Object.values(ticketsByEvent)

  const toggleEvent = (eventName: string) => {
    const next = new Set(expandedEvents)
    if (next.has(eventName)) {
      next.delete(eventName)
    } else {
      next.add(eventName)
    }
    setExpandedEvents(next)
  }

  return (
    <div className={styles.overlay} onPointerDown={(e)=>{ if (e.currentTarget===e.target) onClose() }}>
      <div className={styles.modal} style={{ maxWidth: '1100px', width: '95%' }}>     
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
             <h2 className={styles.title}>Meus Ingressos</h2>
             <button className={styles.close} onClick={onClose}>✕</button>
          </div>
          {tickets.length === 0 ? (
            notice('info', 'Nenhum ingresso encontrado')
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {eventGroups.map((group) => {
                const isExpanded = expandedEvents.has(group.name)
                return (
                  <div key={group.name} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                    <div 
                      onClick={() => toggleEvent(group.name)}
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        padding: '16px 20px', background: '#f9fafb', cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ 
                          width: 48, height: 48, borderRadius: 8, background: '#e5e7eb',
                          backgroundImage: group.image ? `url(${group.image})` : 'none',
                          backgroundSize: 'cover', backgroundPosition: 'center'
                        }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>{group.name}</div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>
                            {group.tickets.length} {group.tickets.length === 1 ? 'ingresso' : 'ingressos'}
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.2s', color: '#9ca3af' 
                      }}>
                        ▼
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px 20px', background: '#fff' }}>
                        <TicketList tickets={group.tickets} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
