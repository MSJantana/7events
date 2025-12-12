import styles from './modal.module.css'
import type { TicketType } from '../../types'
import { fmtMoneyBRL } from '../../utils/format'

type PaymentMethod = 'FREE' | 'CREDIT_CARD' | 'PAYPAL' | 'PIX' | 'BOLETO'

function paymentLabel(m: PaymentMethod) {
  if (m === 'FREE') return 'Grátis'
  if (m === 'CREDIT_CARD') return 'Cartão de crédito'
  if (m === 'PAYPAL') return 'PayPal'
  if (m === 'PIX') return 'Pix'
  return 'Boleto'
}

function methodIcon(m: PaymentMethod) {
  if (m === 'FREE') return 'card_giftcard'
  if (m === 'CREDIT_CARD') return 'credit_card'
  if (m === 'PAYPAL') return 'account_balance_wallet'
  if (m === 'PIX') return 'qr_code_2'
  return 'receipt_long'
}

 

export default function PaymentSection(p: Readonly<{ paymentMethod: PaymentMethod | ''; setPaymentMethod: (m: PaymentMethod)=>void; flowStatus: { text: string; kind: 'ok' | 'err' | '' }; setFlowStatus: (s: { text: string; kind: 'ok' | 'err' | '' })=>void; orderId: string; onBack: ()=>void; onPay: (pm: PaymentMethod)=>Promise<void>; selected?: TicketType; qty: number; maxQty: number }>) {
  const total = (p.selected?.price || 0) * Math.min(p.qty, p.maxQty)
  const isFree = total === 0
  
  return (
    <div className={styles.content} style={{ position:'relative', gridTemplateColumns:'1fr' }}>
      <div className={styles.card} style={{ position:'relative', display:'flex', flexDirection:'column' }}>
        <div className={styles.sectionTitle}><span className="mi" aria-hidden>shopping_cart</span><span>Checkout do pedido</span></div>
        <div className={styles.checkoutMethods}>
          {(['FREE','CREDIT_CARD','PAYPAL','PIX','BOLETO'] as const).map(m => (
            <button
              key={m}
              type="button"
              className={`${styles.checkoutMethod} ${p.paymentMethod===m ? styles.checkoutMethodActive : ''}`}
              onClick={async ()=>{ p.setPaymentMethod(m); const lbl = paymentLabel(m); p.setFlowStatus({ text: `${lbl} selecionado — desbloqueado`, kind: 'ok' }); if (m !== 'FREE') { try { await p.onPay(m) } catch { p.setFlowStatus({ text:'Falha no pagamento', kind:'err' }) } } }}
              aria-pressed={p.paymentMethod===m}
              disabled={isFree ? m!=='FREE' : m==='FREE'}
            >
              <span className="mi" aria-hidden>{methodIcon(m)}</span>
              <span>{paymentLabel(m)}</span>
            </button>
          ))}
        </div>
        {p.flowStatus.text ? (
          <div className={`${styles.notice} ${p.flowStatus.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`} style={{ marginTop:8 }}>
            <span className="mi" aria-hidden>{p.flowStatus.kind==='ok' ? 'check_circle' : 'block'}</span>
            <span>{p.flowStatus.text}</span>
          </div>
        ) : (
          <div className={`${styles.notice} ${styles.noticeInfo}`} style={{ marginTop:8 }}>
            <span className="mi" aria-hidden>info</span>
            <span>Escolha a forma de pagamento</span>
          </div>
        )}
        <div className={styles.checkoutInfo}>
          <span style={{ fontWeight:700 }}>Valor a ser pago:</span>
          <span>{fmtMoneyBRL(total)}</span>
          <span style={{ color:'var(--gray)' }}>Qtd: {Math.min(p.qty, p.maxQty)}</span>
        </div>
        <div style={{ marginTop:8, border:'1px solid var(--border)', borderRadius:12, padding:'8px 12px', background:'#fff' }}>
          <div className={styles.summaryRow} style={{ gap:12 }}>
            <span style={{ flex:1, fontWeight:700 }}>Ingresso</span>
            <span style={{ fontWeight:700 }}>Valor</span>
            <span style={{ fontWeight:700 }}>Qtd</span>
          </div>
          <div className={styles.summaryRow} style={{ gap:12 }}>
            <span style={{ flex:1 }}>{p.selected?.name || '—'}</span>
            <span>{fmtMoneyBRL(Number(p.selected?.price || 0))}</span>
            <span>{Math.min(p.qty, p.maxQty)}</span>
          </div>
        </div>
      </div>
      
    </div>
  )
}
