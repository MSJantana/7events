import styles from './modal.module.css'
import { renderNotice } from '../common/Notice'
import type { NoticeStyles } from '../common/Notice'
import { getMyOrders } from '../../services/orders'
import { useEffect, useState } from 'react'
import type { Order } from '../../types'
import { fmtMoneyBRL, fmtDate } from '../../utils/format'

type TicketItem = NonNullable<Order['tickets']>[number]

function renderTicketOfOrder(orderId: string, t: TicketItem) {
  const key = t.id ?? `${orderId}-${t.eventId||''}-${t.ticketType?.name||''}-${t.status||''}`
  return (
    <div key={key} style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span>{t.ticketType?.name || 'Ingresso'}</span>
        <span>{fmtMoneyBRL(Number(t.ticketType?.price||0))} • {t.status}</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', color:'#6b7280', fontSize:12 }}>
        <span>Criado: {fmtDate(t.ticketType?.createdAt)}</span>
        <span>Atualizado: {fmtDate(t.ticketType?.updatedAt)}</span>
      </div>
    </div>
  )
}

const notice = (kind: 'ok' | 'err' | 'info', text: string, style?: Record<string, unknown>) => renderNotice(styles as unknown as NoticeStyles, kind, text, style)

export default function MyTicketsModal({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const [orders, setOrders] = useState<Order[]>([])
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
  return (
    <div className={styles.overlay} onPointerDown={(e)=>{ if (e.currentTarget===e.target) onClose() }}>
      <div className={styles.modal}>     
        <div className={styles.section}>
          {orders.length === 0 ? (
            notice('info', 'Nenhum pedido encontrado')
          ) : orders.map(o => (
            <div key={o.id} className={styles.item}>
              <div style={{ fontWeight:700 }}>Pedido {o.id.slice(0,8)}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>{o.status}</div>
              <div style={{ width:'100%', marginTop:6, color:'#6b7280' }}>Criado em {fmtDate(o.createdAt)}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
                {(o.tickets||[]).map((t) => renderTicketOfOrder(o.id, t))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
