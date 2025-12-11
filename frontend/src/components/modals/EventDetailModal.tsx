import { useEffect } from 'react'
import { renderNotice } from '../common/Notice'
import type { NoticeStyles } from '../common/Notice'
import { palette } from '../../theme/palette'
import EventHeader from './EventHeader'
import { useExpired } from '../../hooks/useExpired'
import type { EventDetail } from '../../types'
import { fmtMoneyBRL } from '../../utils/format'
import styles from './modal.module.css'


function errText(error: string){
  if (error === 'insufficient_capacity') return 'Ingressos Esgotados'
  if (error === 'not_found') return 'Não encontrado'
  if (error) return 'Falha ao carregar'
  return ''
}
const notice = (kind: 'ok' | 'err' | 'info', text: string, style?: Record<string, unknown>) => renderNotice(styles as unknown as NoticeStyles, kind, text, style)
function priceBounds(data: EventDetail | null){
  const min = typeof data?.minPrice === 'number' ? data?.minPrice : undefined
  const prices = (data?.ticketTypes||[]).map(t=> Number(t.price||0)).filter(n=> Number.isFinite(n))
  const max = prices.length ? Math.max(...prices) : min
  return { min, max }
}
function availability(data: EventDetail | null, expired: boolean){
  const canBuy = !expired && (data?.ticketTypes||[]).some(t=> (t.quantity??0) > 0)
  const soldOut = !expired && (data?.ticketTypes||[]).length > 0 && (data?.ticketTypes||[]).every(t=> Number(t.quantity||0) <= 0)
  return { canBuy, soldOut }
}
 
function Hero(imageUrl: string){
  return (
    <div style={{ flex:'0 0 360px', width:360, minWidth:280, height:200, borderRadius:16, background:imageUrl?`url(${imageUrl})`:'#111827', backgroundSize:'cover', backgroundPosition:'center', boxShadow:'0 10px 24px rgba(0,0,0,0.28)' }} />
  )
}
function PriceRow(d: EventDetail, canBuy: boolean, soldOut: boolean, onBuy?: (ev: EventDetail)=>void){
  const { min, max } = priceBounds(d)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:12, padding:'8px 12px', color:'#0b1220', fontWeight:700 }}>
        <span aria-hidden>💲</span>
        <span>Ingressos entre {fmtMoneyBRL(min)} e {fmtMoneyBRL(max)}</span>
      </div>
      <button type="button" disabled={!canBuy} onClick={() => { if (onBuy) onBuy(d) }} style={{ border:'none', background: canBuy ? '#16a34a' : '#9ca3af', color:'#ffffff', padding:'10px 16px', borderRadius:12, cursor: canBuy ? 'pointer' : 'not-allowed', boxShadow: canBuy ? '0 10px 20px rgba(22,163,74,0.35)' : 'none', fontWeight:800 }}>
        Comprar ingressos
      </button>
      {!canBuy && soldOut && notice('err', 'Ingressos Esgotados', { display:'inline-flex', alignItems:'center', gap:8 })}
    </div>
  )
}
function LocalTimeNote(){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, color:'#0b1220' }}>
      <span aria-hidden>🕘</span>
      <span style={{ color: palette.gray }}>Horários referentes ao local do evento</span>
    </div>
  )
}
function InstallmentBanner(d: EventDetail){
  const { min } = priceBounds(d)
  if (!(min && min>0)) return null
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#ffffff', color:'#0b1220', border:'1px solid #e5e7eb', borderRadius:12, padding:'6px 10px', boxShadow:'0 6px 16px rgba(0,0,0,0.12)', fontWeight:700, fontSize:12, width:'fit-content' }}>
      <span aria-hidden>💳</span>
      <span>Parcele em até 12x</span>
    </div>
  )
}
function renderSection(p: Readonly<{ loading: boolean; error: string; data: EventDetail | null; expired: boolean; onBuy?: (ev: EventDetail)=>void }>){
  if (p.loading) return notice('info', 'Carregando...')
  if (p.error) return notice('err', errText(p.error))
  if (!p.data) return null
  const { canBuy, soldOut } = availability(p.data, p.expired)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', gap:28, alignItems:'stretch', flexWrap:'wrap' }}>
        {Hero(p.data.imageUrl || '')}
        <div style={{ flex:'1 1 420px', minWidth: 280, display:'flex', flexDirection:'column', gap:10, marginLeft:20 }}>
          <EventHeader data={p.data} showRange showBadge boxedDescription descLabel="Detalhes do evento" />
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {LocalTimeNote()}
            {InstallmentBanner(p.data)}
            {p.expired ? notice('info', 'Evento finalizado — ingressos indisponíveis') : null}
          </div>
        </div>
      </div>
      {PriceRow(p.data, canBuy, soldOut, p.onBuy)}
    </div>
  )
}

type Props = {
  open: boolean
  loading: boolean
  error: string
  data: EventDetail | null
  onClose: () => void
  onBuy?: (ev: EventDetail) => void
}

export default function EventDetailModal({ open, loading, error, data, onClose, onBuy }: Readonly<Props>) {
  const expired = useExpired(data?.endDate, data?.status)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const section = renderSection({ loading, error, data, expired, onBuy })
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Detalhes do evento</div>
          <button className={styles.close} onClick={onClose}><span className="mi">close</span></button>
        </div>
        <div className={styles.section}>{section}</div>
      </div>
    </div>
  )
}
