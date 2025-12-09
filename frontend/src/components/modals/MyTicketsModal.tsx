import styles from './modal.module.css'
import { getMyOrders } from '../../services/orders'
import { useEffect, useState } from 'react'
import type { Order } from '../../types'
import { fmtMoneyBRL, fmtDate } from '../../utils/format'

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
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          {/* <div className={styles.title}>Meus ingressos</div> */}
          <button className={styles.close} onClick={onClose}><span className="mi">close</span></button>
        </div>
        <div className={styles.section}>
          {orders.length === 0 ? (
            <div className={`${styles.notice} ${styles.noticeInfo}`}>Nenhum pedido encontrado</div>
          ) : orders.map(o => (
            <div key={o.id} className={styles.item}>
              <div style={{ fontWeight:700 }}>Pedido {o.id.slice(0,8)}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>{o.status}</div>
              <div style={{ width:'100%', marginTop:6, color:'#6b7280' }}>Criado em {fmtDate(o.createdAt)}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
                {(o.tickets||[]).map((t) => (
                  <div key={t.id ?? `${o.id}-${t.eventId||''}-${t.ticketType?.name||''}-${t.status||''}`} style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>{t.ticketType?.name || 'Ingresso'}</span>
                    <span>{fmtMoneyBRL(Number(t.ticketType?.price||0))} • {t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
