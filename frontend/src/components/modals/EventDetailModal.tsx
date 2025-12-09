import { useEffect } from 'react'
import { palette } from '../../theme/palette'
import FinalizadoBadge from '../FinalizadoBadge'
import { useExpired } from '../../hooks/useExpired'
import type { EventDetail } from '../../types'
import { fmtMoneyBRL } from '../../utils/format'
import styles from './modal.module.css'

const MONTH_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'] as const
function formatRange(start?: string, end?: string){
  try{
    if(!start || !end) return ''
    const ds = new Date(start); const de = new Date(end)
    const d1 = ds.getDate(); const d2 = de.getDate(); const m = MONTH_PT[de.getMonth()] || ''
    return `${d1} a ${d2} de ${m.charAt(0).toUpperCase()+m.slice(1)}`
  }catch{ return '' }
}

type Props = {
  open: boolean
  loading: boolean
  error: string
  data: EventDetail | null
  onClose: () => void
  onBuy?: (ev: EventDetail) => void
}

export default function EventDetailModal({ open, loading, error, data, onClose, onBuy }: Props) {
  const expired = useExpired(data?.endDate, data?.status)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const title = data?.title || 'Evento'
  const imageUrl = data?.imageUrl || ''
  
  const minPrice = typeof data?.minPrice === 'number' ? data!.minPrice : undefined
  const prices = (data?.ticketTypes||[]).map(t=> Number(t.price||0)).filter(n=> Number.isFinite(n))
  const maxPrice = prices.length ? Math.max(...prices) : minPrice
  const canBuy = !expired && (data?.ticketTypes||[]).some(t=> (t.quantity??0) > 0)
  const soldOut = !expired && (data?.ticketTypes||[]).length > 0 && (data?.ticketTypes||[]).every(t=> Number(t.quantity||0) <= 0)
  const errMsg = error === 'insufficient_capacity' ? 'Ingressos Esgotados' : (error === 'not_found' ? 'Não encontrado' : (error ? 'Falha ao carregar' : ''))
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Detalhes do evento</div>
          <button className={styles.close} onClick={onClose}><span className="mi">close</span></button>
        </div>
        <div className={styles.section}>
        {loading ? (
          <div className={`${styles.notice} ${styles.noticeInfo}`}>Carregando...</div>
        ) : error ? (
          <div className={`${styles.notice} ${styles.noticeErr}`}>{errMsg}</div>
        ) : data ? (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', gap:18, alignItems:'stretch', flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 420px', minWidth: 280, display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:28, fontWeight:800, color: palette.text, textTransform:'uppercase', letterSpacing:0.3 }}>{title}</div>
                  <FinalizadoBadge endDate={data.endDate} status={data.status} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, color:'#e5e7eb' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, color:'#ffffff', background:'#111827', borderRadius:12, padding:'8px 12px', boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
                    <span className="mi" aria-hidden>calendar_month</span>
                    <span style={{ color:'#ffffff' }}>{formatRange(data.startDate, data.endDate)}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, color:'#0b1220' }}>
                    <span aria-hidden>🕘</span>
                    <span style={{ color: palette.gray }}>Horários referentes ao local do evento</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, color:'#0b1220' }}>
                    <span aria-hidden>📍</span>
                    <span style={{ color: palette.gray }}>{data.location}</span>
                  </div>
                  {minPrice && minPrice>0 ? (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#ffffff', color:'#0b1220', border:'1px solid #e5e7eb', borderRadius:12, padding:'6px 10px', boxShadow:'0 6px 16px rgba(0,0,0,0.12)', fontWeight:700, fontSize:12, width:'fit-content' }}>
                      <span aria-hidden>💳</span>
                      <span>Parcele em até 12x</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div style={{ flex:'0 0 360px', width:360, minWidth:280, height:200, borderRadius:16, background:imageUrl?`url(${imageUrl})`:'#111827', backgroundSize:'cover', backgroundPosition:'center', boxShadow:'0 10px 24px rgba(0,0,0,0.28)' }} />
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>              
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:12, padding:'8px 12px', color:'#0b1220', fontWeight:700 }}>
                <span aria-hidden>💲</span>
                <span>Ingressos entre {fmtMoneyBRL(minPrice)} e {fmtMoneyBRL(maxPrice)}</span>
              </div>
              <button type="button" disabled={!canBuy} onClick={() => { if (data && onBuy) onBuy(data) }} style={{ border:'none', background: canBuy ? '#16a34a' : '#9ca3af', color:'#ffffff', padding:'10px 16px', borderRadius:12, cursor: canBuy ? 'pointer' : 'not-allowed', boxShadow: canBuy ? '0 10px 20px rgba(22,163,74,0.35)' : 'none', fontWeight:800 }}>
                Comprar ingressos
              </button>
              {!canBuy && soldOut && (
                <div className={`${styles.notice} ${styles.noticeErr}`} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                  <span aria-hidden>⛔</span>
                  <span>Ingressos Esgotados</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize:18, fontWeight:800, color: palette.text, marginBottom:6 }}>Descrição do evento</div>
              <div style={{ color: palette.gray }}>{data.description}</div>
              {expired ? (
                <div className={`${styles.notice} ${styles.noticeInfo}`} style={{ marginTop:10 }}>Evento finalizado — ingressos indisponíveis</div>
              ) : null}
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  )
}
