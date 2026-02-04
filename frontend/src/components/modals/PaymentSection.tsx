import { useEffect, useState } from 'react'
import styles from './modal.module.css'
import type { TicketType } from '../../types'
import { fmtMoneyBRL } from '../../utils/format'

type PaymentMethod = 'FREE' | 'CREDIT_CARD' | 'PAYPAL' | 'PIX' | 'BOLETO'

type CardState = { name: string; number: string; expiry: string; cvv: string }
type PayPalState = { email: string }
type PixState = { key: string }
type BoletoState = { name: string }

type FlowStatus = { text: string; kind: 'ok' | 'err' | '' }

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

function onlyDigits(s: string) { return String(s).replaceAll(/\D+/g, '') }

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
  if (yy?.length !== 2) return false
  const m = Number(mm)
  const y = 2000 + Number(yy)
  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth() + 1
  if (y < cy) return false
  if (y === cy && m < cm) return false
  return true
}

export default function PaymentSection(p: Readonly<{
  paymentMethod: PaymentMethod | ''
  setPaymentMethod: (m: PaymentMethod) => void
  flowStatus: FlowStatus
  setFlowStatus: (s: FlowStatus) => void
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

  const cardNumberValid = disabled || (card.number ? luhnCheck(card.number) : false)
  const cardExpiryValid = disabled || (card.expiry ? validateExpiry(card.expiry) : false)
  const cardCvvValid = disabled || (card.cvv ? /^[0-9]{3,4}$/.test(card.cvv) : false)
  const cardNameValid = disabled || (card.name ? card.name.trim().length >= 3 : false)
  const paypalEmailValid = disabled || (!paypal.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypal.email))
  const pixKeyValid = disabled || (!pix.key || pix.key.trim().length >= 5)
  const boletoNameValid = disabled || (!boleto.name || boleto.name.trim().length >= 3)

  const methodValid = disabled || (() => {
    if (method === 'CREDIT_CARD') return cardNameValid && cardNumberValid && cardExpiryValid && cardCvvValid
    if (method === 'PAYPAL') return paypalEmailValid
    if (method === 'PIX') return pixKeyValid
    if (method === 'BOLETO') return boletoNameValid
    return false
  })()

  useEffect(() => {
    if (onValidityChange) onValidityChange(!!method && methodValid)
  }, [method, methodValid, onValidityChange])

  return (
    <div className={styles.paymentRow}>
      <div className={styles.content} style={{ position: 'relative', gridTemplateColumns: '350px 1fr' }}>
        
        {/* Left Column: Checkout Summary */}
        <div className={`${styles.card} ${styles.checkoutCard}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div className={styles.sectionTitle}>
            <span className="mi" aria-hidden>shopping_cart</span>
            <span>Checkout do pedido</span>
          </div>

          <PaymentMethodSelector 
            paymentMethod={p.paymentMethod} 
            setPaymentMethod={p.setPaymentMethod} 
            setFlowStatus={p.setFlowStatus} 
            isFree={isFree} 
          />

          <StatusNotice flowStatus={p.flowStatus} />

          <CheckoutInfo total={total} qty={p.qty} maxQty={p.maxQty} />
          
          <TicketSummary selected={p.selected} qty={p.qty} maxQty={p.maxQty} />
        </div>

        {/* Right Column: Payment Details */}
        <div className={`${styles.card} ${styles.paymentDetails}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <div className={styles.sectionTitle}>
            <span className="mi" aria-hidden>{method ? methodIcon(method) : 'payment'}</span>
            <span>Detalhes do pagamento</span>
          </div>

          <PaymentFormContent 
            method={method}
            disabled={disabled}
            card={card} setCard={setCard}
            cardValid={{ name: cardNameValid, number: cardNumberValid, expiry: cardExpiryValid, cvv: cardCvvValid }}
            paypal={paypal} setPaypal={setPaypal}
            paypalValid={{ email: paypalEmailValid }}
            pix={pix} setPix={setPix}
            pixValid={{ key: pixKeyValid }}
            boleto={boleto} setBoleto={setBoleto}
            boletoValid={{ name: boletoNameValid }}
          />

          <ActionButtons 
            onBack={p.onBack} 
            onPay={() => p.onPay(method)} 
            flowStatus={p.flowStatus} 
            disabled={!method || !methodValid} 
          />
        </div>
      </div>
    </div>
  )
}

// --- Subcomponents ---

function PaymentMethodSelector({ paymentMethod, setPaymentMethod, setFlowStatus, isFree }: Readonly<{
  paymentMethod: PaymentMethod | '',
  setPaymentMethod: (m: PaymentMethod) => void,
  setFlowStatus: (s: FlowStatus) => void,
  isFree: boolean
}>) {
  return (
    <div className={styles.checkoutMethods}>
      {(['FREE', 'CREDIT_CARD', 'PAYPAL', 'PIX', 'BOLETO'] as const).map(m => (
        <button
          key={m}
          type="button"
          className={`${styles.checkoutMethod} ${paymentMethod === m ? styles.checkoutMethodActive : ''}`}
          onClick={async () => {
            setPaymentMethod(m)
            const lbl = paymentLabel(m)
            setFlowStatus({ text: `${lbl} selecionado — desbloqueado`, kind: 'ok' })
          }}
          aria-pressed={paymentMethod === m}
          disabled={isFree ? m !== 'FREE' : m === 'FREE'}
        >
          <span className="mi" aria-hidden>{methodIcon(m)}</span>
          <span>{paymentLabel(m)}</span>
        </button>
      ))}
    </div>
  )
}

function StatusNotice({ flowStatus }: Readonly<{ flowStatus: FlowStatus }>) {
  if (flowStatus.text) {
    return (
      <div
        className={`${styles.notice} ${flowStatus.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`}
        style={{ marginTop: 8 }}
      >
        <span className="mi" aria-hidden>{flowStatus.kind === 'ok' ? 'check_circle' : 'block'}</span>
        <span>{flowStatus.text}</span>
      </div>
    )
  }
  return (
    <div className={`${styles.notice} ${styles.noticeInfo}`} style={{ marginTop: 8 }}>
      <span className="mi" aria-hidden>info</span>
      <span>Escolha a forma de pagamento</span>
    </div>
  )
}

function CheckoutInfo({ total, qty, maxQty }: Readonly<{ total: number, qty: number, maxQty: number }>) {
  return (
    <div className={styles.checkoutInfo}>
      <span style={{ fontWeight: 700 }}>Valor a ser pago:</span>
      <span>{fmtMoneyBRL(total)}</span>
      <span style={{ color: 'var(--gray)' }}>Qtd: {Math.min(qty, maxQty)}</span>
    </div>
  )
}

function TicketSummary({ selected, qty, maxQty }: Readonly<{ selected?: TicketType, qty: number, maxQty: number }>) {
  return (
    <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', background: '#fff' }}>
      <div className={styles.summaryRow} style={{ gap: 12 }}>
        <span style={{ flex: 1, fontWeight: 700 }}>Ingresso</span>
        <span style={{ fontWeight: 700 }}>Valor</span>
        <span style={{ fontWeight: 700 }}>Qtd</span>
      </div>
      <div className={styles.summaryRow} style={{ gap: 12 }}>
        <span style={{ flex: 1 }}>{selected?.name || '—'}</span>
        <span>{fmtMoneyBRL(Number(selected?.price || 0))}</span>
        <span>{Math.min(qty, maxQty)}</span>
      </div>
    </div>
  )
}

function ActionButtons({ onBack, onPay, flowStatus, disabled }: Readonly<{ onBack: () => void, onPay: () => void, flowStatus: FlowStatus, disabled: boolean }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
      <button
        className={`${styles.btn} ${styles.ghost}`}
        onClick={onBack}
        disabled={flowStatus.kind === 'ok' && flowStatus.text.includes('Processando')}
      >
        Voltar
      </button>
      <button
        className={`${styles.btn} ${styles.primary}`}
        onClick={onPay}
        disabled={disabled || (flowStatus.kind === 'ok' && flowStatus.text.includes('Processando'))}
      >
        {flowStatus.kind === 'ok' && flowStatus.text.includes('Processando') ? 'Processando...' : 'Finalizar Pagamento'}
      </button>
    </div>
  )
}

function PaymentFormContent(p: Readonly<{
  method: PaymentMethod,
  disabled: boolean,
  card: CardState, setCard: (c: CardState) => void, cardValid: { name: boolean, number: boolean, expiry: boolean, cvv: boolean },
  paypal: PayPalState, setPaypal: (p: PayPalState) => void, paypalValid: { email: boolean },
  pix: PixState, setPix: (p: PixState) => void, pixValid: { key: boolean },
  boleto: BoletoState, setBoleto: (b: BoletoState) => void, boletoValid: { name: boolean }
}>) {
  if (!p.method) {
    return (
      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <span className="mi" aria-hidden>info</span>
        <span>Selecione um método de pagamento</span>
      </div>
    )
  }

  if (p.method === 'FREE') {
    return (
      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <span className="mi" aria-hidden>card_giftcard</span>
        <span>Pedido gratuito — campos desabilitados</span>
      </div>
    )
  }

  if (p.method === 'CREDIT_CARD') return <CreditCardForm card={p.card} setCard={p.setCard} valid={p.cardValid} disabled={p.disabled} />
  if (p.method === 'PAYPAL') return <PayPalForm paypal={p.paypal} setPaypal={p.setPaypal} valid={p.paypalValid} disabled={p.disabled} />
  if (p.method === 'PIX') return <PixForm pix={p.pix} setPix={p.setPix} valid={p.pixValid} disabled={p.disabled} />
  if (p.method === 'BOLETO') return <BoletoForm boleto={p.boleto} setBoleto={p.setBoleto} valid={p.boletoValid} disabled={p.disabled} />

  return null
}

function CreditCardForm({ card, setCard, valid, disabled }: Readonly<{ card: CardState, setCard: (c: CardState) => void, valid: { name: boolean, number: boolean, expiry: boolean, cvv: boolean }, disabled: boolean }>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <CreditCardField
        label="Nome no cartão"
        value={card.name}
        onChange={e => setCard({ ...card, name: e.target.value })}
        isValid={valid.name}
        disabled={disabled}
        placeholder="NOME IGUAL DO CARTÃO"
        errorMessage="Nome inválido"
      />
      
      <CreditCardField
        label="Número do cartão"
        value={card.number}
        onChange={e => setCard({ ...card, number: fmtCardNumber(e.target.value) })}
        isValid={valid.number}
        disabled={disabled}
        placeholder="0000 0000 0000 0000"
        inputMode="numeric"
        maxLength={19}
        errorMessage="Número inválido"
      />

      <CreditCardField
        label="Validade (MM/AA)"
        value={fmtExpiry(card.expiry)}
        onChange={e => setCard({ ...card, expiry: fmtExpiry(e.target.value) })}
        isValid={valid.expiry}
        disabled={disabled}
        placeholder="MM/AA"
        inputMode="numeric"
        maxLength={5}
        errorMessage="Validade inválida"
      />

      <CreditCardField
        label="CVV"
        value={card.cvv.replaceAll(/\D+/g, '')}
        onChange={e => setCard({ ...card, cvv: onlyDigits(e.target.value).slice(0, 4) })}
        isValid={valid.cvv}
        disabled={disabled}
        placeholder="123"
        inputMode="numeric"
        maxLength={4}
        errorMessage="CVV inválido"
      />
    </div>
  )
}

function CreditCardField({
  label, value, onChange, isValid, disabled, placeholder, errorMessage, inputMode, maxLength
}: Readonly<{
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isValid: boolean
  disabled: boolean
  placeholder: string
  errorMessage: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
}>) {
  const isInvalid = !!(value && !isValid)
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={`${styles.input} ${isInvalid ? styles.invalid : ''}`}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      {isInvalid ? <span className={styles.errorText}>{errorMessage}</span> : null}
    </div>
  )
}

function PayPalForm({ paypal, setPaypal, valid, disabled }: Readonly<{ paypal: PayPalState, setPaypal: (p: PayPalState) => void, valid: { email: boolean }, disabled: boolean }>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
        <span className={styles.label}>E-mail do PayPal</span>
        <input
          className={`${styles.input} ${paypal.email && !valid.email ? styles.invalid : ''}`}
          type="email"
          placeholder="seu@email.com"
          value={paypal.email}
          onChange={e => setPaypal({ email: e.target.value })}
          disabled={disabled}
        />
        {paypal.email && !valid.email ? <span className={styles.errorText}>E-mail inválido</span> : null}
      </div>
    </div>
  )
}

function PixForm({ pix, setPix, valid, disabled }: Readonly<{ pix: PixState, setPix: (p: PixState) => void, valid: { key: boolean }, disabled: boolean }>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
        <span className={styles.label}>Chave PIX</span>
        <input
          className={`${styles.input} ${pix.key && !valid.key ? styles.invalid : ''}`}
          placeholder="CPF, CNPJ, e-mail ou aleatória"
          value={pix.key}
          onChange={e => setPix({ key: e.target.value })}
          disabled={disabled}
        />
        {pix.key && !valid.key ? <span className={styles.errorText}>Chave inválida</span> : null}
      </div>
    </div>
  )
}

function BoletoForm({ boleto, setBoleto, valid, disabled }: Readonly<{ boleto: BoletoState, setBoleto: (b: BoletoState) => void, valid: { name: boolean }, disabled: boolean }>) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
        <span className={styles.label}>Nome do boleto</span>
        <input
          className={`${styles.input} ${boleto.name && !valid.name ? styles.invalid : ''}`}
          placeholder="Nome completo"
          value={boleto.name}
          onChange={e => setBoleto({ name: e.target.value })}
          disabled={disabled}
        />
        {boleto.name && !valid.name ? <span className={styles.errorText}>Nome inválido</span> : null}
      </div>
    </div>
  )
}
