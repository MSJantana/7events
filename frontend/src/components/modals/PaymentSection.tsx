import { useEffect, useState } from 'react'
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

export default function PaymentSection(p: Readonly<{
  paymentMethod: PaymentMethod | ''
  setPaymentMethod: (m: PaymentMethod) => void
  flowStatus: { text: string; kind: 'ok' | 'err' | '' }
  setFlowStatus: (s: { text: string; kind: 'ok' | 'err' | '' }) => void
  orderId: string
  onBack: () => void
  onPay: (pm: PaymentMethod) => Promise<void>
  selected?: TicketType
  qty: number
  maxQty: number
  onValidityChange?: (ok: boolean) => void
}>) {
  const total = (p.selected?.price || 0) * Math.min(p.qty, p.maxQty)
  const isFree = total === 0

  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' })
  const [paypal, setPaypal] = useState({ email: '' })
  const [pix, setPix] = useState({ key: '' })
  const [boleto, setBoleto] = useState({ name: '' })

  const disabled = isFree || p.paymentMethod === 'FREE'
  const method = p.paymentMethod as PaymentMethod
  const { onValidityChange } = p

  function onlyDigits(s: string) { return String(s).replace(/\D+/g, '') }

  function luhnCheck(s: string) {
    const d = onlyDigits(s)
    if (d.length < 13 || d.length > 19) return false
    let sum = 0
    let dbl = false
    for (let i = d.length - 1; i >= 0; i--) {
      let n = Number(d[i])
      if (dbl) { n *= 2; if (n > 9) n -= 9 }
      sum += n
      dbl = !dbl
    }
    return sum % 10 === 0
  }

  function fmtCardNumber(s: string) {
    const d = onlyDigits(s).slice(0, 16)
    const parts = []
    for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4))
    return parts.join(' ')
  }

  function fmtExpiry(s: string) {
    const d = onlyDigits(s).slice(0, 4)
    if (d.length <= 2) return d
    const mm = d.slice(0, 2)
    const yy = d.slice(2)
    return `${mm}/${yy}`
  }

  function validMonth(mm: string) {
    const n = Number(mm)
    return mm.length === 2 && n >= 1 && n <= 12
  }

  function validateExpiry(s: string) {
    const v = fmtExpiry(s)
    const [mm, yy] = v.split('/')
    if (!validMonth(mm || '')) return false
    if (!yy || yy.length !== 2) return false
    const m = Number(mm)
    const y = 2000 + Number(yy)
    const now = new Date()
    const cy = now.getFullYear()
    const cm = now.getMonth() + 1
    if (y < cy) return false
    if (y === cy && m < cm) return false
    return true
  }

  const cardNumberValid = disabled || (card.number ? luhnCheck(card.number) : false)
  const cardExpiryValid = disabled || (card.expiry ? validateExpiry(card.expiry) : false)
  const cardCvvValid = disabled || (card.cvv ? /^[0-9]{3,4}$/.test(card.cvv) : false)
  const cardNameValid = disabled || (card.name ? card.name.trim().length >= 3 : false)
  const paypalEmailValid = disabled || (!paypal.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypal.email))
  const pixKeyValid = disabled || (!pix.key || pix.key.trim().length >= 5)
  const boletoNameValid = disabled || (!boleto.name || boleto.name.trim().length >= 3)

  const methodValid = disabled || (
    method === 'CREDIT_CARD' ? (cardNameValid && cardNumberValid && cardExpiryValid && cardCvvValid)
      : method === 'PAYPAL' ? paypalEmailValid
      : method === 'PIX' ? pixKeyValid
      : method === 'BOLETO' ? boletoNameValid
      : false
  )

  useEffect(() => {
    if (onValidityChange) onValidityChange(!!method && methodValid)
  }, [method, methodValid, onValidityChange])

  return (
    // wrapper que o grid de fora enxerga como UM item
    <div className={styles.paymentRow}>
      {/* grid interno só da área de pagamento */}
      <div
        className={styles.content}
        style={{ position: 'relative', gridTemplateColumns: '350px 1fr', alignItems: 'start' }}
      >
        {/* Checkout do pedido (coluna esquerda) */}
        <div
          className={`${styles.card} ${styles.checkoutCard}`}
          style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
        >
          <div className={styles.sectionTitle}>
            <span className="mi" aria-hidden>shopping_cart</span>
            <span>Checkout do pedido</span>
          </div>

          <div className={styles.checkoutMethods}>
            {(['FREE', 'CREDIT_CARD', 'PAYPAL', 'PIX', 'BOLETO'] as const).map(m => (
              <button
                key={m}
                type="button"
                className={`${styles.checkoutMethod} ${p.paymentMethod === m ? styles.checkoutMethodActive : ''}`}
                onClick={async () => {
                  p.setPaymentMethod(m)
                  const lbl = paymentLabel(m)
                  p.setFlowStatus({ text: `${lbl} selecionado — desbloqueado`, kind: 'ok' })
                }}
                aria-pressed={p.paymentMethod === m}
                disabled={isFree ? m !== 'FREE' : m === 'FREE'}
              >
                <span className="mi" aria-hidden>{methodIcon(m)}</span>
                <span>{paymentLabel(m)}</span>
              </button>
            ))}
          </div>

          {p.flowStatus.text ? (
            <div
              className={`${styles.notice} ${p.flowStatus.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`}
              style={{ marginTop: 8 }}
            >
              <span className="mi" aria-hidden>{p.flowStatus.kind === 'ok' ? 'check_circle' : 'block'}</span>
              <span>{p.flowStatus.text}</span>
            </div>
          ) : (
            <div className={`${styles.notice} ${styles.noticeInfo}`} style={{ marginTop: 8 }}>
              <span className="mi" aria-hidden>info</span>
              <span>Escolha a forma de pagamento</span>
            </div>
          )}

          <div className={styles.checkoutInfo}>
            <span style={{ fontWeight: 700 }}>Valor a ser pago:</span>
            <span>{fmtMoneyBRL(total)}</span>
            <span style={{ color: 'var(--gray)' }}>Qtd: {Math.min(p.qty, p.maxQty)}</span>
          </div>

          <div
            style={{
              marginTop: 8,
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '8px 12px',
              background: '#fff',
            }}
          >
            <div className={styles.summaryRow} style={{ gap: 12 }}>
              <span style={{ flex: 1, fontWeight: 700 }}>Ingresso</span>
              <span style={{ fontWeight: 700 }}>Valor</span>
              <span style={{ fontWeight: 700 }}>Qtd</span>
            </div>
            <div className={styles.summaryRow} style={{ gap: 12 }}>
              <span style={{ flex: 1 }}>{p.selected?.name || '—'}</span>
              <span>{fmtMoneyBRL(Number(p.selected?.price || 0))}</span>
              <span>{Math.min(p.qty, p.maxQty)}</span>
            </div>
          </div>
        </div>

        {/* Detalhes do pagamento (coluna direita) */}
        <div
          className={`${styles.card} ${styles.paymentDetails}`}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '120%' }}
        >
          <div className={styles.sectionTitle}>
            <span className="mi" aria-hidden>{method ? methodIcon(method) : 'payment'}</span>
            <span>Detalhes do pagamento</span>
          </div>

          {!method ? (
            <div className={`${styles.notice} ${styles.noticeInfo}`}>
              <span className="mi" aria-hidden>info</span>
              <span>Selecione um método de pagamento</span>
            </div>
          ) : null}

          {method === 'FREE' ? (
            <div className={`${styles.notice} ${styles.noticeInfo}`}>
              <span className="mi" aria-hidden>card_giftcard</span>
              <span>Pedido gratuito — campos desabilitados</span>
            </div>
          ) : null}

          {method === 'CREDIT_CARD' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className={styles.field}>
                <span className={styles.label}>Nome no cartão</span>
                <input
                  className={`${styles.input} ${card.name && !cardNameValid ? styles.invalid : ''}`}
                  placeholder="NOME IGUAL DO CARTÃO"
                  value={card.name}
                  onChange={e => setCard({ ...card, name: e.target.value })}
                  disabled={disabled}
                />
                {card.name && !cardNameValid ? (
                  <span className={styles.errorText}>Nome inválido</span>
                ) : null}
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Número do cartão</span>
                <input
                  className={`${styles.input} ${card.number && !cardNumberValid ? styles.invalid : ''}`}
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  onChange={e => setCard({ ...card, number: fmtCardNumber(e.target.value) })}
                  disabled={disabled}
                />
                {card.number && !cardNumberValid ? (
                  <span className={styles.errorText}>Número inválido</span>
                ) : null}
              </div>

              <div className={styles.field}>
                <span className={styles.label}>Validade (MM/AA)</span>
                <input
                  className={`${styles.input} ${card.expiry && !cardExpiryValid ? styles.invalid : ''}`}
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="MM/AA"
                  value={fmtExpiry(card.expiry)}
                  onChange={e => setCard({ ...card, expiry: fmtExpiry(e.target.value) })}
                  disabled={disabled}
                />
                {card.expiry && !cardExpiryValid ? (
                  <span className={styles.errorText}>Validade inválida</span>
                ) : null}
              </div>

              <div className={styles.field}>
                <span className={styles.label}>CVV</span>
                <input
                  className={`${styles.input} ${card.cvv && !cardCvvValid ? styles.invalid : ''}`}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="123"
                  value={card.cvv.replace(/\D+/g, '')}
                  onChange={e =>
                    setCard({ ...card, cvv: onlyDigits(e.target.value).slice(0, 4) })
                  }
                  disabled={disabled}
                />
                {card.cvv && !cardCvvValid ? (
                  <span className={styles.errorText}>CVV inválido</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {method === 'PAYPAL' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.label}>E-mail do PayPal</span>
                <input
                  className={`${styles.input} ${paypal.email && !paypalEmailValid ? styles.invalid : ''}`}
                  type="email"
                  placeholder="seu@email.com"
                  value={paypal.email}
                  onChange={e => setPaypal({ email: e.target.value })}
                  disabled={disabled}
                />
                {paypal.email && !paypalEmailValid ? (
                  <span className={styles.errorText}>E-mail inválido</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {method === 'PIX' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.label}>Chave PIX</span>
                <input
                  className={`${styles.input} ${pix.key && !pixKeyValid ? styles.invalid : ''}`}
                  placeholder="CPF, CNPJ, e-mail ou aleatória"
                  value={pix.key}
                  onChange={e => setPix({ key: e.target.value })}
                  disabled={disabled}
                />
                {pix.key && !pixKeyValid ? (
                  <span className={styles.errorText}>Chave inválida</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {method === 'BOLETO' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.label}>Nome do boleto</span>
                <input
                  className={`${styles.input} ${boleto.name && !boletoNameValid ? styles.invalid : ''}`}
                  placeholder="Nome completo"
                  value={boleto.name}
                  onChange={e => setBoleto({ name: e.target.value })}
                  disabled={disabled}
                />
                {boleto.name && !boletoNameValid ? (
                  <span className={styles.errorText}>Nome inválido</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
