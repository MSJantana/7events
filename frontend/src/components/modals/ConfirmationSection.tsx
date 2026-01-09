import styles from './modal.module.css'
import type { TicketType } from '../../types'
type PaymentMethod = 'FREE' | 'CREDIT_CARD' | 'PAYPAL' | 'PIX' | 'BOLETO'

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

export default function ConfirmationSection({ onClose, selected, qty, maxQty, paymentMethod, finalized }: Readonly<{ onClose: ()=>void; selected?: TicketType; qty: number; maxQty: number; paymentMethod: PaymentMethod | ''; finalized: boolean }>) {
  const getStatusInfo = () => {
    if (paymentMethod === 'FREE') {
      if (finalized) {
        return {
          icon: 'check_circle',
          title: 'Compra finalizada',
          message: 'Seu pedido gratuito foi finalizado.'
        }
      }
      return {
        icon: 'hourglass_top',
        title: 'Processando compra gratuita',
        message: 'Seu pedido gratuito está sendo processado. Em até 5 minutos será finalizado automaticamente.'
      }
    }
    return {
      icon: 'hourglass_top',
      title: 'Aguardando pagamento',
      message: 'Seu pedido foi criado e está aguardando confirmação de pagamento. Você receberá a confirmação assim que o provedor aprovar.'
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className={styles.content}>
      <div className={styles.card}>
        <div className={styles.sectionTitle}><span className="mi" aria-hidden>{statusInfo.icon}</span><span>{statusInfo.title}</span></div>
        <div style={{ fontSize:14, color:'var(--text)' }}>{statusInfo.message}</div>
        <div className={styles.actions}><button className={`${styles.btn} ${styles.primary}`} onClick={onClose}>Fechar</button></div>
      </div>
      <aside className={styles.sidebar}>
        <div className={styles.summaryTitle}>Resumo</div>
        {SummaryBox(selected, qty, maxQty)}
      </aside>
    </div>
  )
}
