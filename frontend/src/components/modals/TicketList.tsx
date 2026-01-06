import { useState } from 'react'
import { fmtDate, fmtMoneyBRL } from '../../utils/format'
import { SevenEventsLogo } from '../common/SevenEventsLogo'

export type TicketRowData = {
  id: string
  eventName: string
  eventImage?: string
  ticketTypeName: string
  price: number
  status: string
  purchaseDate: string
  code: string
}

function StatusBadge({ status }: { readonly status: string }) {
  let color = '#6b7280'
  let bg = '#f3f4f6'
  let label = status

  switch (status) {
    case 'ACTIVE':
    case 'PAID':
      color = '#166534'
      bg = '#dcfce7'
      label = 'Ativo'
      break
    case 'WAITING':
    case 'PENDING':
      color = '#d97706'
      bg = '#fef3c7'
      label = 'Pendente'
      break
    case 'USED':
      color = '#1f2937'
      bg = '#e5e7eb'
      label = 'Utilizado'
      break
    case 'CANCELED':
    case 'INVALID':
    case 'REFUNDED':
      color = '#b91c1c'
      bg = '#fee2e2'
      label = 'Cancelado'
      break
  }

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color,
      background: bg,
      textTransform: 'capitalize'
    }}>
      {label}
    </span>
  )
}

export default function TicketList({ tickets }: { readonly tickets: readonly TicketRowData[] }) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) || null : null

  if (!tickets || tickets.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>Nenhum ingresso encontrado.</div>
  }

  return (
    <>
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', minWidth: 600 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Evento</th>
            <th style={{ padding: '0 16px', fontWeight: 600 }}>Ingresso</th>
            <th style={{ padding: '0 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Data Compra</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}>Valor</th>
              <th style={{ padding: '0 16px', fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.1s' }}>
                <td style={{ padding: '16px', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb',
                      backgroundImage: t.eventImage ? `url(${t.eventImage})` : 'none',
                      backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{t.eventName}</span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, color: '#374151' }}>{t.ticketTypeName}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '16px', color: '#4b5563' }}>
                  {fmtDate(t.purchaseDate)}
                </td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>
                  {fmtMoneyBRL(t.price)}
                </td>
                <td style={{ padding: '16px', borderTopRightRadius: 12, borderBottomRightRadius: 12, textAlign: 'right' }}>
                  <button
                    onClick={() => setSelectedTicketId(t.id)}
                    title="Ver Ticket e QR Code"
                    style={{
                      border: 'none', background: '#f3f4f6', cursor: 'pointer', color: '#374151',
                      width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedTicketId(null)}>
          <div style={{
            background: '#fff', padding: 32, borderRadius: 24, width: 'min(360px, 90%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>

            <button
              onClick={() => setSelectedTicketId(null)}
              style={{
                position: 'absolute', top: 16, right: 16, border: 'none', background: 'transparent',
                fontSize: 24, color: '#9ca3af', cursor: 'pointer', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >✕</button>

            <div style={{ transform: 'scale(0.9)' }}>
              <SevenEventsLogo size={48} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.4 }}>{selectedTicket.eventName}</h3>
              <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{selectedTicket.ticketTypeName}</p>
            </div>

            <div style={{
              background: '#fff', padding: 16, borderRadius: 16, border: '2px dashed #e5e7eb',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedTicket.code}`}
                alt="QR Code"
                style={{ width: 180, height: 180, borderRadius: 8, display: 'block' }}
              />
              <p style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', margin: 0 }}>{selectedTicket.code}</p>
            </div>

            <div style={{ width: '100%', textAlign: 'center' }}>
               <div style={{ display: 'inline-block', marginBottom: 12 }}>
                 <StatusBadge status={selectedTicket.status} />
               </div>
               <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                 Apresente este código na entrada do evento.
               </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
