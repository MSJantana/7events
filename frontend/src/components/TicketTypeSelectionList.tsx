import { fmtMoneyBRL } from '../utils/format'
import type { TicketType } from '../types'

function renderTicketType(tt: TicketType, selectedTT: string, onSelectTT: (id: string) => void, highlightIds: string[]) {
  const available = Number(tt.quantity || 0) > 0
  const changed = highlightIds.includes(tt.id)
  return (
    <label
      key={tt.id}
      aria-label={'Ingresso ' + tt.name + ' - ' + fmtMoneyBRL(tt.price) + ' - ' + (available ? 'Disponíveis: ' + tt.quantity : 'Esgotado')}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        border: '1px solid ' + (changed ? '#60a5fa' : 'var(--border)'),
        background: changed ? '#e0f2fe' : '#ffffff',
        transition: 'all .2s ease-in-out',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: changed ? '0 0 0 3px rgba(96,165,250,0.25)' : 'none'
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <input type="radio" name="tt" value={tt.id} checked={selectedTT===tt.id} onChange={() => onSelectTT(tt.id)} disabled={!available} />
        <div style={{ fontWeight:700 }}>{tt.name}</div>
        <div style={{ color: 'var(--gray)' }}>{fmtMoneyBRL(tt.price)}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color: available ? 'var(--gray)' : '#b91c1c' }}>{available ? `Disponíveis: ${tt.quantity}` : 'Esgotado'}</span>
      </div>
    </label>
  )
}

export default function TicketTypeSelectionList({ tickets, selectedTT, onSelectTT, highlightIds }: Readonly<{ tickets: TicketType[]; selectedTT: string; onSelectTT: (id: string) => void; highlightIds: string[] }>) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {tickets.map(tt => renderTicketType(tt, selectedTT, onSelectTT, highlightIds))}
    </div>
  )
}
