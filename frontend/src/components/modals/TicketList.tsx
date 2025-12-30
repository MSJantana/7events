import { fmtDate, fmtMoneyBRL } from '../../utils/format'

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

function StatusBadge({ status }: { status: string }) {
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

export default function TicketList({ tickets }: { tickets: TicketRowData[] }) {
  if (!tickets || tickets.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>Nenhum ingresso encontrado.</div>
  }

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', minWidth: 600 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <th style={{ padding: '0 16px', fontWeight: 600 }}>Evento</th>
            <th style={{ padding: '0 16px', fontWeight: 600 }}>Ingresso / ID</th>
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
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{t.code}</span>
                  </div>
                </div>
              </td>
              <td style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{t.ticketTypeName}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>ID: {t.id.slice(0, 8)}...</span>
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
                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}>
                  ⋮
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
