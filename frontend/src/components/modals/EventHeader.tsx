import { fmtDate, fmtMoneyBRL } from '../../utils/format'
import type { CSSProperties } from 'react'
import type { EventDetail, TicketType } from '../../types'
import FinalizadoBadge from '../FinalizadoBadge'

function formatRange(start?: string, end?: string){
  try{
    if(!start || !end) return ''
    const ds = new Date(start); const de = new Date(end)
    const MONTH_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'] as const
    const d1 = ds.getDate(); const d2 = de.getDate(); const m = MONTH_PT[de.getMonth()] || ''
    return `${d1} a ${d2} de ${m.charAt(0).toUpperCase()+m.slice(1)}`
  }catch{ return '' }
}

export default function EventHeader({ data, selected, showRange, showBadge, alignRight, boxedDescription, descMaxWidth, descLabel }: Readonly<{ data: EventDetail; selected?: TicketType; showRange?: boolean; showBadge?: boolean; alignRight?: boolean; boxedDescription?: boolean; descMaxWidth?: number; descLabel?: string }>) {
  const dateText = showRange ? formatRange(data.startDate, data.endDate) : fmtDate(data.startDate)
  const justify = alignRight ? 'flex-end' as const : 'flex-start' as const
  const descStyle: CSSProperties = boxedDescription ? {
    fontSize: 14,
    color: '#0b1220',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '12px 14px',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    maxWidth: (descMaxWidth ?? 520),
    marginLeft: alignRight ? 'auto' : undefined,
    textAlign: alignRight ? 'right' : 'left',
  } : { fontSize: 14, color: '#0b1220', textAlign: alignRight ? 'right' : 'left' }
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent: justify }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{data.title}</div>
        {showBadge ? <FinalizadoBadge endDate={data.endDate} status={data.status} /> : null}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems: alignRight ? 'flex-end' : 'flex-start' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="mi" aria-hidden>calendar_month</span><span>{dateText}</span></div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="mi" aria-hidden>location_on</span><span>{data.location}</span></div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span className="mi" aria-hidden>attach_money</span>
          <span>{fmtMoneyBRL(data.minPrice)}</span>
          {selected ? (
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:12, padding:'6px 10px', color:'#0b1220', fontWeight:700 }}>
              <span className="mi" aria-hidden>sell</span>
              <span>Selecionado: {fmtMoneyBRL(selected.price)}</span>
            </div>
          ) : null}
        </div>
      </div>
      {boxedDescription ? (
        <div style={{ display:'flex', justifyContent: justify }}>
          <div style={{ fontSize: 14, fontWeight: 800, color:'#0b1220', marginBottom: 6, maxWidth: (descMaxWidth ?? 520) }}>{descLabel || 'Detalhes do evento'}</div>
        </div>
      ) : null}
      <div style={descStyle}>{data.description}</div>
    </>
  )
}
