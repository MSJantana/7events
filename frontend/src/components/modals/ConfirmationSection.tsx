import styles from './modal.module.css'
import type { TicketType } from '../../types'

function SummaryBox(selected: TicketType | undefined, qty: number, maxQty: number) {
  const fmtMoneyBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  return (
    <div className={styles.summaryBox}>
      <div className={styles.summaryRow}><span>Ingresso</span><span>{selected?.name || '—'}</span></div>
      <div className={styles.summaryRow}><span>Qtd</span><span>{Math.min(qty, maxQty)}</span></div>
      <div className={styles.summaryRow}><span>Total</span><span>{fmtMoneyBRL((selected?.price || 0) * Math.min(qty, maxQty))}</span></div>
    </div>
  )
}

export default function ConfirmationSection({ onClose, selected, qty, maxQty }: Readonly<{ onClose: ()=>void; selected?: TicketType; qty: number; maxQty: number }>) {
  return (
    <div className={styles.content}>
      <div className={styles.card}>
        <div className={styles.sectionTitle}><span className="mi" aria-hidden>check_circle</span><span>Compra concluída</span></div>
        <div style={{ fontSize:14, color:'var(--text)' }}>Seu pagamento foi confirmado. Os ingressos estão disponíveis em Meus ingressos.</div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.ghost}`} onClick={() => { globalThis.dispatchEvent(new Event('openMyTickets')); onClose() }}>Ver meus ingressos</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={onClose}>Fechar</button>
        </div>
      </div>
      <aside className={styles.sidebar}>
        <div className={styles.summaryTitle}>Resumo</div>
        {SummaryBox(selected, qty, maxQty)}
      </aside>
    </div>
  )
}

