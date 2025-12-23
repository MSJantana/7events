import { fmtDate, fmtMoneyBRL, fmtEventDuration } from '../../utils/format'
import type { CSSProperties } from 'react'
import type { EventDetail, TicketType } from '../../types'
import FinalizadoBadge from '../FinalizadoBadge'

function justifyValue(alignRight?: boolean) { return alignRight ? 'flex-end' as const : 'flex-start' as const }
function descStyleOf(boxed?: boolean, alignRight?: boolean, maxW?: number): CSSProperties {
  return boxed ? {
    fontSize: 14,
    color: '#0b1220',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '12px 14px',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    maxWidth: (maxW ?? 520),
    marginLeft: alignRight ? 'auto' : undefined,
    textAlign: alignRight ? 'right' : 'left',
  } : { fontSize: 14, color: '#0b1220', textAlign: alignRight ? 'right' : 'left' }
}
function TitleRow({ data, showBadge, justify }: Readonly<{ data: EventDetail; showBadge?: boolean; justify: 'flex-end' | 'flex-start' }>) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent: justify }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{data.title}</div>
      {showBadge ? <FinalizadoBadge startDate={data.startDate} status={data.status} /> : null}
    </div>
  )
}
function MetaRows({ dateText, location, alignRight }: Readonly<{ dateText: string; location: string; alignRight?: boolean }>) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems: alignRight ? 'flex-end' : 'flex-start' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="mi" aria-hidden>calendar_month</span><span>{dateText}</span></div>
      <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="mi" aria-hidden>location_on</span><span>{location}</span></div>
    </div>
  )
}
function PriceBlock({ data, selected, selectedQty }: Readonly<{ data: EventDetail; selected?: TicketType; selectedQty?: number }>) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span className="mi" aria-hidden>attach_money</span>
      <span>
        {(() => {
          const allFree = (data.ticketTypes || []).every(tt => Number(tt.price || 0) === 0)
          if (allFree) return fmtMoneyBRL(0)
          if (selected) return fmtMoneyBRL(selected.price)
          return 'Selecione um ingresso'
        })()}
      </span>
      {selected ? (
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:12, padding:'6px 10px', color:'#0b1220', fontWeight:700 }}>
          <span className="mi" aria-hidden>sell</span>
          <span>Selecionado: {fmtMoneyBRL(selected.price)}</span>
          {typeof selectedQty === 'number' && selectedQty > 0 ? (
            <>
              <span style={{ color:'#6b7280' }}>• Qtd: {selectedQty}</span>
              <span style={{ color:'#111827' }}>• Total: {fmtMoneyBRL((selected.price||0) * selectedQty)}</span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
function DescriptionHeader({ justify, label, maxWidth }: Readonly<{ justify: 'flex-end' | 'flex-start'; label?: string; maxWidth?: number }>) {
  return (
    <div style={{ display:'flex', justifyContent: justify }}>
      <div style={{ fontSize: 14, fontWeight: 800, color:'#0b1220', marginBottom: 6, maxWidth: (maxWidth ?? 520) }}>{label || 'Detalhes do evento'}</div>
    </div>
  )
}

export default function EventHeader({ data, selected, selectedQty, showRange, showBadge, alignRight, boxedDescription, descMaxWidth, descLabel }: Readonly<{ data: EventDetail; selected?: TicketType; selectedQty?: number; showRange?: boolean; showBadge?: boolean; alignRight?: boolean; boxedDescription?: boolean; descMaxWidth?: number; descLabel?: string }>) {
  const dateText = showRange ? fmtEventDuration(data.startDate, data.endDate) : fmtDate(data.startDate)
  const justify = justifyValue(alignRight)
  const descStyle = descStyleOf(boxedDescription, alignRight, descMaxWidth)
  return (
    <>
      {TitleRow({ data, showBadge, justify })}
      {MetaRows({ dateText, location: data.location, alignRight })}
      {PriceBlock({ data, selected, selectedQty })}
      {boxedDescription ? (
        DescriptionHeader({ justify, label: descLabel, maxWidth: descMaxWidth })
      ) : null}
      <div style={descStyle}>{data.description}</div>
    </>
  )
}
