import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
// palette removida: usamos variáveis CSS de modal.module.css
import { fmtDate, fmtMoneyBRL } from '../../utils/format'
import { useExpired } from '../../hooks/useExpired'
import type { EventDetail, TicketType } from '../../types'
import { API_URL } from '../../services/api'
import { createBulkOrder, payOrder } from '../../services/orders'
import styles from './modal.module.css'

type Step = 1 | 2 | 3
type PaymentMethod = 'CREDIT_CARD' | 'PAYPAL' | 'PIX' | 'BOLETO'
type FlowStatusKind = 'ok' | 'err' | ''
type FlowStatus = { text: string; kind: FlowStatusKind }

function errText(error: string) {
  if (error === 'insufficient_capacity') return 'Ingressos Esgotados'
  if (error === 'not_found') return 'Não encontrado'
  if (error) return 'Falha ao carregar'
  return ''
}

function publishedActive(data: EventDetail | null, expired: boolean) {
  return !!data && data.status === 'PUBLISHED' && !expired
}

function clampQty(n: number, max: number) {
  return Math.max(1, Math.min(max, Number(n) || 1))
}

function paymentLabel(m: PaymentMethod) {
  if (m === 'CREDIT_CARD') return 'Cartão de crédito'
  if (m === 'PAYPAL') return 'PayPal'
  if (m === 'PIX') return 'Pix'
  return 'Boleto'
}

function Stepper(step: Step) {
  return (
    <div className={styles.stepper}>
      {(() => {
        let pillClass = styles.pillInactive
        if (step === 1) pillClass = styles.pillActive
        else if (step > 1) pillClass = styles.pillDone
        return (
          <div className={`${styles.pill} ${pillClass}`}>
            <span className="mi" aria-hidden>shopping_cart</span>
            <span>Carrinho</span>
          </div>
        )
      })()}
      <span aria-hidden>→</span>
      {(() => {
        let pillClass = styles.pillInactive
        if (step === 2) pillClass = styles.pillActive
        else if (step > 2) pillClass = styles.pillDone
        return (
          <div className={`${styles.pill} ${pillClass}`}><span className="mi" aria-hidden>credit_card</span><span>Pagamento</span></div>
        )
      })()}
      <span aria-hidden>→</span>
      <div className={`${styles.pill} ${step===3 ? styles.pillActive : styles.pillInactive}`}><span className="mi" aria-hidden>check_circle</span><span>Confirmação</span></div>
    </div>
  )
}

function EventHeader(data: EventDetail) {
  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{data.title}</div>
      <div style={{ display:'flex', gap: 18 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="mi" aria-hidden>location_on</span><span>{data.location}</span></div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="mi" aria-hidden>calendar_month</span><span>{fmtDate(data.startDate)}</span></div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span className="mi" aria-hidden>attach_money</span><span>{fmtMoneyBRL(data.minPrice)}</span></div>
      </div>
      <div style={{ fontSize: 14, color: 'var(--gray)' }}>{data.description}</div>
    </>
  )
}

function TicketList(tickets: TicketType[], selectedTT: string, onSelectTT: (id: string) => void, highlightIds: string[]) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {tickets.map(tt => {
        const available = Number(tt.quantity || 0) > 0
        const changed = highlightIds.includes(tt.id)
        return (
          <label
            key={tt.id}
            aria-label={'Ingresso ' + tt.name + ' - ' + fmtMoneyBRL(tt.price) + ' - ' + (available ? 'Disponíveis: ' + tt.quantity : 'Esgotado')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              border: '1px solid ' + (changed ? '#60a5fa' : 'var(--border)'),
              background: changed ? '#e0f2fe' : '#ffffff',
              transition: 'all .2s ease-in-out',
              borderRadius: 12,
              padding: '10px 12px',
              boxShadow: changed ? '0 0 0 3px rgba(96,165,250,0.25)' : 'none'
            }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <input type="radio" name="tt" value={tt.id} checked={selectedTT===tt.id} onChange={() => onSelectTT(tt.id)} disabled={!available} />
              <div style={{ fontWeight:700 }}>{tt.name}</div>
              <div style={{ color: 'var(--gray)' }}>{fmtMoneyBRL(tt.price)}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color: available ? 'var(--gray)' : '#b91c1c' }}>{available ? `Disponíveis: ${tt.quantity}` : 'Esgotado'}</span>
            </div>
          </label>
        )
      })}
    </div>
  )
}

function QuantityInput(qty: number, maxQty: number, onChangeQty: (n: number) => void) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ color: 'var(--gray)' }}>Quantidade</span>
      <input type="number" min={1} max={maxQty} value={Math.min(qty, maxQty)} onChange={(e) => { onChangeQty(clampQty(Number(e.target.value), maxQty)) }} style={{ width:80, padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)' }} />
    </label>
  )
}

function ContinueButton(p: Readonly<{ disabled: boolean; dataId?: string; selectedTT: string; qty: number; maxQty: number; setOrderId: (id: string)=>void; setFlowStatus: (s: FlowStatus)=>void; setStep: (s: Step)=>void }>) {
  return (
    <button className={`${styles.btn} ${styles.primary}`} onClick={async () => {
      if (!p.dataId || !p.selectedTT) { p.setFlowStatus({ text: 'Selecione um ingresso', kind: 'err' }); return }
      try { await createOrderAndProceed(p.dataId, p.selectedTT, p.qty, p.maxQty, p.setOrderId, p.setFlowStatus, p.setStep) }
      catch { p.setFlowStatus({ text: 'Falha ao comprar', kind: 'err' }) }
    }} disabled={p.disabled}>Continuar</button>
  )
}

function SoldOutNotices(showSoldOut: boolean) {
  if (!showSoldOut) return null
  return (
    <div className={`${styles.notice} ${styles.noticeErr}`} style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:8 }}>
      <span aria-hidden>⛔</span>
      <span>Ingressos Esgotados</span>
    </div>
  )
}

function SummaryBox(selected: TicketType | undefined, qty: number, maxQty: number) {
  return (
    <div className={styles.summaryBox}>
      <div className={styles.summaryRow}><span>Ingresso</span><span>{selected?.name || '—'}</span></div>
      <div className={styles.summaryRow}><span>Qtd</span><span>{Math.min(qty, maxQty)}</span></div>
      <div className={styles.summaryRow}><span>Total</span><span>{fmtMoneyBRL((selected?.price || 0) * Math.min(qty, maxQty))}</span></div>
    </div>
  )
}

function PaymentSection(p: Readonly<{ paymentMethod: PaymentMethod | ''; setPaymentMethod: (m: PaymentMethod)=>void; flowStatus: FlowStatus; setFlowStatus: (s: FlowStatus)=>void; orderId: string; setStep: (s: Step)=>void; selected?: TicketType; qty: number; maxQty: number }>) {
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
            <span aria-hidden>{p.flowStatus.kind==='ok' ? '✅' : '⛔'}</span>
            <span>{p.flowStatus.text}</span>
          </div>
        )}
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.ghost}`} onClick={()=>p.setStep(1)}>Voltar</button>
          <button className={`${styles.btn} ${styles.primary}`} disabled={!p.orderId || !p.paymentMethod} onClick={async ()=>{
            try { await payAndProceed(p.orderId, p.paymentMethod, p.setFlowStatus, p.setStep) }
            catch { p.setFlowStatus({ text: 'Falha no pagamento', kind: 'err' }) }
          }}>Pagar</button>
        </div>
      </div>
      <aside className={styles.sidebar}>
        <div className={styles.summaryTitle}>Resumo</div>
        {SummaryBox(p.selected, p.qty, p.maxQty)}
      </aside>
    </div>
  )
}

function ConfirmationSection(onClose: () => void, selected: TicketType | undefined, qty: number, maxQty: number) {
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

function renderSection(p: Readonly<{
  loading: boolean
  error: string
  errMsg: string
  data: EventDetail | null
  expiredEvent: boolean
  tickets: TicketType[]
  selectedTT: string
  onSelectTT: (id: string) => void
  highlightIds: string[]
  onClose: () => void
  qty: number
  maxQty: number
  selected: TicketType | undefined
  selectedAvailable: boolean
  flowStatus: FlowStatus
  paymentMethod: PaymentMethod | ''
  setPaymentMethod: (m: PaymentMethod) => void
  orderId: string
  setOrderId: (id: string) => void
  setFlowStatus: (s: FlowStatus) => void
  setStep: (s: Step) => void
  onChangeQty: (n: number) => void
  step: Step
}>): ReactNode {
  if (p.loading) {
    return <div style={{ color: 'var(--gray)' }}>Carregando...</div>
  }
  if (p.error) {
    return <div className={`${styles.notice} ${styles.noticeErr}`}>{p.errMsg}</div>
  }
  if (!p.data) { return null }
  if (p.data.status !== 'PUBLISHED') {
    return <div className={`${styles.notice} ${styles.noticeInfo}`}>Evento encontrado, porém não ativo</div>
  }
  const hasTickets = Array.isArray(p.data.ticketTypes) && p.data.ticketTypes.length > 0
  const ticketsUI = hasTickets ? (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight:700, marginBottom:8 }}>Ingressos</div>
      {TicketList(p.tickets, p.selectedTT, p.onSelectTT, p.highlightIds)}
      <div className={styles.actions} style={{ marginTop:10 }}>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onClose} style={{ marginRight:'auto' }}>Fechar</button>
        {QuantityInput(p.qty, p.maxQty, p.onChangeQty)}
        {ContinueButton({ disabled: !p.selectedAvailable, dataId: p.data?.id, selectedTT: p.selectedTT, qty: p.qty, maxQty: p.maxQty, setOrderId: p.setOrderId, setFlowStatus: p.setFlowStatus, setStep: p.setStep })}
      </div>
      {SoldOutNotices(!!p.selected && !p.selectedAvailable)}
      {p.selected && Number(p.selected.quantity || 0) > 0 && (
        <div style={{ fontSize:12, color: 'var(--gray)' }}>Disponíveis para este ingresso: {p.selected.quantity}</div>
      )}
      {p.flowStatus.text && (
        <div className={`${styles.notice} ${p.flowStatus.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`} style={{ marginTop:8 }}>
          <span className="mi" aria-hidden>{p.flowStatus.kind==='ok' ? 'check_circle' : 'block'}</span>
          <span>{p.flowStatus.text}</span>
        </div>
      )}
      {p.step === 2 && PaymentSection({ paymentMethod: p.paymentMethod, setPaymentMethod: p.setPaymentMethod, flowStatus: p.flowStatus, setFlowStatus: p.setFlowStatus, orderId: p.orderId, setStep: p.setStep, selected: p.selected, qty: p.qty, maxQty: p.maxQty })}
      {p.step === 3 && ConfirmationSection(p.onClose, p.selected, p.qty, p.maxQty)}
    </div>
  ) : null
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 10, color: 'var(--text)' }}>
      {EventHeader(p.data)}
      {p.expiredEvent ? (
        <div style={{ marginTop: 10, color:'#b91c1c', fontWeight:700 }}>Evento finalizado — ingressos indisponíveis</div>
      ) : ticketsUI}
    </div>
  )
}

async function refreshTickets(
  dataId: string,
  selectedTT: string,
  onSelectTT: (id: string) => void,
  setTickets: (ts: TicketType[]) => void,
  lastTicketsRef: React.RefObject<TicketType[]>,
  setHighlightIds: (ids: string[]) => void
) {
  const r = await fetch(`${API_URL}/events/${dataId}/ticket-types`, { credentials: 'include' })
  const next: TicketType[] = await r.json().catch(() => [])
  const prev = lastTicketsRef.current || []
  const changed = next.filter(tt => {
    const old = prev.find(o => o.id === tt.id)
    return !!old && Number(old.quantity || 0) !== Number(tt.quantity || 0)
  }).map(tt => tt.id)
  setTickets(next)
  lastTicketsRef.current = next
  if (changed.length > 0) {
    setHighlightIds(changed)
    setTimeout(() => setHighlightIds([]), 1200)
  }
  const s: TicketType | undefined = next.find((tt) => tt.id === selectedTT)
  const available = Number(s?.quantity || 0) > 0
  if (s && !available) onSelectTT('')
}

async function createOrderAndProceed(
  dataId: string,
  selectedTT: string,
  qty: number,
  maxQty: number,
  setOrderId: (id: string) => void,
  setFlowStatus: (s: FlowStatus) => void,
  setStep: (s: Step) => void
) {
  const r = await createBulkOrder(dataId, [{ ticketTypeId: selectedTT, quantity: Math.min(qty, maxQty) }])
  setOrderId(String(r?.id || ''))
  setFlowStatus({ text: 'Pedido criado', kind: 'ok' })
  setStep(2)
}

async function payAndProceed(
  orderId: string,
  paymentMethod: PaymentMethod | '',
  setFlowStatus: (s: FlowStatus) => void,
  setStep: (s: Step) => void
) {
  await payOrder(orderId, paymentMethod as PaymentMethod)
  setFlowStatus({ text: 'Pagamento confirmado', kind: 'ok' })
  setStep(3)
}

type Props = {
  open: boolean
  loading: boolean
  error: string
  data: EventDetail | null
  selectedTT: string
  qty: number
  onClose: () => void
  onSelectTT: (id: string) => void
  onChangeQty: (n: number) => void
}

export default function EventPurchaseModal({ open, loading, error, data, selectedTT, qty, onClose, onSelectTT, onChangeQty }: Readonly<Props>) {
  const expiredEvent = useExpired(data?.endDate, data?.status)
  const [tickets, setTickets] = useState((data?.ticketTypes || []).slice())
  const lastTicketsRef = useRef<TicketType[]>(tickets)
  const [highlightIds, setHighlightIds] = useState<string[]>([])
  const [step, setStep] = useState<Step>(1)
  const [orderId, setOrderId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [flowStatus, setFlowStatus] = useState<FlowStatus>({ text: '', kind: '' })
  useEffect(() => {
    if (!open || !data?.id) { return }
    let cancelled = false
    const id = setInterval(async () => {
      try {
        if (!cancelled) await refreshTickets(data.id, selectedTT, onSelectTT, setTickets, lastTicketsRef, setHighlightIds)
      } catch { setTickets(ts => ts) }
    }, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [open, data?.id, selectedTT, onSelectTT])
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setStep(1)
        setOrderId('')
        setPaymentMethod('')
        setFlowStatus({ text: '', kind: '' })
      }, 0)
      return () => clearTimeout(t)
    }
  }, [open, data?.id])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step !== 2) onClose()
      }
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose, step])
  const selected = tickets.find(tt => tt.id === selectedTT)
  const maxQty = Math.max(1, Number(selected?.quantity || 1))
  const selectedAvailable = Number(selected?.quantity || 0) > 0
  const errMsg = errText(error)
  if (!open) return null
  const sectionContent: ReactNode = renderSection({
    loading,
    error,
    errMsg,
    data,
    expiredEvent,
    tickets,
    selectedTT,
    onSelectTT,
    highlightIds,
    onClose,
    qty,
    maxQty,
    selected,
    selectedAvailable,
    flowStatus,
    paymentMethod,
    setPaymentMethod: setPaymentMethod as (m: PaymentMethod) => void,
    orderId,
    setOrderId,
    setFlowStatus,
    setStep,
    onChangeQty,
    step,
  })
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>     
        {publishedActive(data, expiredEvent) ? Stepper(step) : null}
        <div className={styles.section}>{sectionContent}</div>
      </div>
    </div>
  )
}
