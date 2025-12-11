import styles from './modal.module.css'
import type { TicketType } from '../../types'

type PaymentMethod = 'CREDIT_CARD' | 'PAYPAL' | 'PIX' | 'BOLETO'

function paymentLabel(m: PaymentMethod) {
  if (m === 'CREDIT_CARD') return 'Cartão de crédito'
  if (m === 'PAYPAL') return 'PayPal'
  if (m === 'PIX') return 'Pix'
  return 'Boleto'
}

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

export default function PaymentSection(p: Readonly<{ paymentMethod: PaymentMethod | ''; setPaymentMethod: (m: PaymentMethod)=>void; flowStatus: { text: string; kind: 'ok' | 'err' | '' }; setFlowStatus: (s: { text: string; kind: 'ok' | 'err' | '' })=>void; orderId: string; onBack: ()=>void; onPay: (pm: PaymentMethod)=>Promise<void>; selected?: TicketType; qty: number; maxQty: number }>) {
  return (
    <div className={styles.content}>
      <div className={styles.card}>
        <div className={styles.sectionTitle}><span className="mi" aria-hidden>credit_card</span><span>Pagamento</span></div>
        {(['CREDIT_CARD','PAYPAL','PIX','BOLETO'] as const).map(m => (
          <label key={m} style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}>
            <input type="radio" name="pm" value={m} checked={p.paymentMethod===m} onChange={()=>p.setPaymentMethod(m)} />
            <span style={{ fontWeight:700 }}>{paymentLabel(m)}</span>
          </label>
        ))}
        {p.flowStatus.text && (
          <div className={`${styles.notice} ${p.flowStatus.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`} style={{ marginTop:8 }}>
            <span className="mi" aria-hidden>{p.flowStatus.kind==='ok' ? 'check_circle' : 'block'}</span>
            <span>{p.flowStatus.text}</span>
          </div>
        )}
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onBack}>Voltar</button>
          <button className={`${styles.btn} ${styles.primary}`} disabled={!p.orderId || !p.paymentMethod} onClick={async ()=>{ try { await p.onPay(p.paymentMethod as PaymentMethod) } catch { p.setFlowStatus({ text:'Falha no pagamento', kind:'err' }) } }}>Pagar</button>
        </div>
      </div>
      <aside className={styles.sidebar}>
        <div className={styles.summaryTitle}>Resumo</div>
        {SummaryBox(p.selected, p.qty, p.maxQty)}
      </aside>
    </div>
  )
}

