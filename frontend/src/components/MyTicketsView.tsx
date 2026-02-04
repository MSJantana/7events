import { getMyOrders, getAllOrders } from '../services/orders'
import { API_URL } from '../services/api'
import { useEffect, useState, useCallback } from 'react'
import type { Order } from '../types'
import TicketList, { type TicketRowData } from './modals/TicketList'
import { useAuth } from '../hooks/useAuth'

export default function MyTicketsView() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const fetchOrders = useCallback(async () => {
    if (user?.role === 'ADMIN') return getAllOrders()
    return getMyOrders()
  }, [user])

  const handleManualRefresh = async () => {
    if (loading) return
    setLoading(true)
    try { setOrders(await fetchOrders()) } catch { setOrders([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await fetchOrders()
        if (mounted) {
          setOrders(data)
        }
      } catch {
        if (mounted) setOrders([])
      }
    }
    load()
    // Optional: auto-refresh every few seconds
    const timer = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [fetchOrders])

  const eventGroups = processOrders(orders)

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Meus Ingressos</h2>
          <button 
            onClick={handleManualRefresh}
            title="Atualizar lista"
            disabled={loading}
            style={{ 
              border: 'none', background: 'transparent', cursor: loading ? 'wait' : 'pointer', 
              color: '#6b7280', display: 'flex', alignItems: 'center', opacity: loading ? 0.7 : 1 
            }}>
            <span className={`mi ${loading ? 'spin' : ''}`} style={{ fontSize: 24 }}>refresh</span>
          </button>
        </div>
      </div>

      {eventGroups.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 12 }}>
          Nenhum ingresso encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {eventGroups.map((group) => (
            <TicketGroup 
              key={group.name} 
              group={group} 
              isExpanded={expandedEvents.has(group.name)} 
              onToggle={() => toggleEvent(group.name)} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

const resolveImageUrl = (url?: string) => {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

const processOrders = (orders: Order[]) => {
  const tickets: TicketRowData[] = orders.flatMap(o => {
    return (o.tickets || []).map(t => {
      const ticketWithEvent = t as typeof t & { event?: { title?: string; imageUrl?: string; location?: string; startDate?: string } }
      const evt = ticketWithEvent.event
      return {
        id: t.id || '',
        eventName: evt?.title || 'Evento',
        eventImage: resolveImageUrl(evt?.imageUrl),
        ticketTypeName: t.ticketType?.name || 'Ingresso',
        price: Number(t.ticketType?.price || 0),
        status: t.status || o.status,
        purchaseDate: o.createdAt || '',
        code: t.code || t.id || '',
        location: evt?.location || '',
        startDate: evt?.startDate || ''
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

  return Object.values(ticketsByEvent)
}

const TicketGroup = ({ 
  group, 
  isExpanded, 
  onToggle 
}: { 
  group: { name: string; image?: string; tickets: TicketRowData[] }; 
  isExpanded: boolean; 
  onToggle: () => void; 
}) => {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '20px', background: '#fff', cursor: 'pointer',
          border: 'none', width: '100%', textAlign: 'left', font: 'inherit',
          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
        onFocus={(e) => e.currentTarget.style.background = '#f9fafb'}
        onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
        onBlur={(e) => e.currentTarget.style.background = '#fff'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: 8, background: '#e5e7eb',
            backgroundImage: group.image ? `url('${group.image}')` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            flexShrink: 0
          }} />
          <div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 18, marginBottom: 4 }}>{group.name}</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {group.tickets.length} {group.tickets.length === 1 ? 'ingresso' : 'ingressos'}
            </div>
          </div>
        </div>
        <div style={{ 
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.2s', color: '#9ca3af', fontSize: 12
        }}>
          ▼
        </div>
      </button>
      
      {isExpanded && (
        <div style={{ padding: '0 20px 20px 20px', background: '#fff' }}>
          <TicketList tickets={group.tickets} />
        </div>
      )}
    </div>
  )
}
