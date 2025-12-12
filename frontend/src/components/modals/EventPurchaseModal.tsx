import { useEffect, useRef, useState } from 'react'
// palette removida: usamos variáveis CSS de modal.module.css
import { useExpired } from '../../hooks/useExpired'
import type { EventDetail, TicketType } from '../../types'
import { API_URL, fetchJSON } from '../../services/api'
import { createBulkOrder } from '../../services/orders'
import styles from './modal.module.css'
import type { NoticeStyles } from '../common/Notice'
import { renderNotice } from '../common/Notice'
import Stepper from './Stepper'
import TicketList from './TicketList'
import PaymentSection from './PaymentSection'
import ConfirmationSection from './ConfirmationSection'
import QuantityInput from './QuantityInput'
import EventHeader from './EventHeader'
import ContinueButton from './ContinueButton'
import SoldOutNotices from './SoldOutNotices'

type Step = 1 | 2 | 3
type PaymentMethod = 'FREE' | 'CREDIT_CARD' | 'PAYPAL' | 'PIX' | 'BOLETO'
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

type PurchaseProps = {
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
  finalized: boolean
}

function FlowStatusBox({ flowStatus }: Readonly<{ flowStatus: FlowStatus }>) {
  if (!flowStatus.text) return null
  const cls = `${styles.notice} ${flowStatus.kind === 'ok' ? styles.noticeOk : styles.noticeErr}`
  return (
    <div className={cls} style={{ marginTop:8 }}>
      <span className="mi" aria-hidden>{flowStatus.kind==='ok' ? 'check_circle' : 'block'}</span>
      <span>{flowStatus.text}</span>
    </div>
  )
}

function TicketsPanel(p: Readonly<PurchaseProps>) {
  const hasTickets = Array.isArray(p.tickets) && p.tickets.length > 0
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight:700, marginBottom:8 }}>Ingressos</div>
      {hasTickets ? (
        <TicketList tickets={p.tickets} selectedTT={p.selectedTT} onSelectTT={p.onSelectTT} highlightIds={p.highlightIds} />
      ) : (
        notice('info', 'Nenhum ingresso disponível para este evento')
      )}
      <div className={styles.actions} style={{ marginTop:10 }}>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onClose} style={{ marginRight:'auto' }}>Fechar</button>
        {hasTickets ? <QuantityInput qty={p.qty} maxQty={p.maxQty} onChangeQty={p.onChangeQty} /> : null}
        {hasTickets ? (
          <ContinueButton
            disabled={!p.selectedAvailable}
            dataId={p.data?.id}
            selectedTT={p.selectedTT}
            qty={p.qty}
            maxQty={p.maxQty}
            onCreateOrder={async (dataId, selectedTT, qty, maxQty) => {
              const r = await createBulkOrder(dataId, [{ ticketTypeId: selectedTT, quantity: Math.min(qty, maxQty) }])
              return String(r?.id || '')
            }}
            setOrderId={p.setOrderId}
            setFlowStatus={p.setFlowStatus}
            setStep={p.setStep}
          />
        ) : null}
      </div>
      {hasTickets && <SoldOutNotices show={!!p.selected && !p.selectedAvailable} />}
      {hasTickets && p.selected && Number(p.selected.quantity || 0) > 0 && (
        <div style={{ fontSize:12, color: 'var(--gray)' }}>Disponíveis para este evento: {p.selected.quantity}</div>
      )}
      <FlowStatusBox flowStatus={p.flowStatus} />
    </div>
  )
}

function StepSwitcher(p: Readonly<PurchaseProps>) {
  if (p.step === 2) {
    return (
      <PaymentSection
        paymentMethod={p.paymentMethod}
        setPaymentMethod={p.setPaymentMethod as (m: 'FREE'|'CREDIT_CARD'|'PAYPAL'|'PIX'|'BOLETO')=>void}
        flowStatus={p.flowStatus}
        setFlowStatus={p.setFlowStatus}
        orderId={p.orderId}
        onBack={() => p.setStep(1)}
        onPay={async (pm) => {
          let id = p.orderId
          if (!id && p.data?.id && p.selectedTT) {
            try {
              p.setFlowStatus({ text: pm==='FREE' ? 'Criando pedido — aguardando confirmação...' : 'Criando pedido e aguardando pagamento...', kind: 'ok' })
              const r = await createBulkOrder(p.data.id, [{ ticketTypeId: p.selectedTT, quantity: Math.min(p.qty, p.maxQty) }])
              id = String(r?.id || '')
              p.setOrderId(id)
            } catch { p.setFlowStatus({ text: 'Falha ao criar pedido', kind: 'err' }); return }
          }
          await payAndProceed(String(id || ''), pm, p.setFlowStatus, p.setStep)
        }}
        selected={p.selected}
        qty={p.qty}
        maxQty={p.maxQty}
      />
    )
  }
  if (p.step === 3) {
    return <ConfirmationSection onClose={p.onClose} selected={p.selected} qty={p.qty} maxQty={p.maxQty} paymentMethod={p.paymentMethod} finalized={p.finalized} />
  }
  return null
}

function PurchaseContent(p: Readonly<PurchaseProps>) {
  if (p.loading) { return notice('info', 'Carregando...') }
  if (p.error) { return notice('err', p.errMsg) }
  if (!p.data) { return null }
  if (p.data.status !== 'PUBLISHED') {
    if (p.data.status === 'CANCELED' && !p.expiredEvent) {
      const imageUrl = p.data.imageUrl || ''
      return (
        <div style={{ display:'flex', gap:28, color: 'var(--text)' }}>
          <div style={{ flex:'0 0 360px', width:360, minWidth:280, position:'relative' }}>
            <div style={{ height:200, borderRadius:16, background: imageUrl ? `url(${imageUrl})` : '#111827', backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center', boxShadow:'0 10px 24px rgba(0,0,0,0.28)' }} />
            <div style={{ position:'absolute', top:300, left:75, display:'inline-block', padding:'8px 12px', border:'3px solid #ea580c', color:'#ea580c', background:'#fff', borderRadius:8, fontWeight:900, textTransform:'uppercase', letterSpacing:1, transform:'rotate(-12deg)', boxShadow:'0 6px 16px rgba(0,0,0,0.12)' }} aria-label="Evento cancelado carimbo">
              CANCELADO
            </div>
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, alignItems:'flex-start', marginLeft:20 }}>
            <EventHeader data={p.data} selected={p.selected} selectedQty={p.qty} boxedDescription descLabel="Detalhes do evento" />
            <div style={{ marginTop: 10, color:'#b91c1c', fontWeight:700 }}>Evento cancelado — ingressos indisponíveis</div>
          </div>
        </div>
      )
    }
    return notice('info', 'Evento encontrado, porém não ativo')
  }
  if (p.step === 1) {
    const imageUrl = p.data.imageUrl || ''
    const isFree = Number(p.selected?.price || 0) === 0
    return (
      <div style={{ display:'flex', gap:28, color: 'var(--text)' }}>
        <div style={{ flex:'0 0 360px', width:360, minWidth:280, position:'relative' }}>
          <div style={{ height:200, borderRadius:16, background: imageUrl ? `url(${imageUrl})` : '#111827', backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center', boxShadow:'0 10px 24px rgba(0,0,0,0.28)' }} />
          {isFree && (
            <div style={{ position:'absolute', top:300, left:75, display:'inline-block', padding:'8px 12px', border:'3px solid #166534', color:'#166534', background:'#fff', borderRadius:8, fontWeight:900, textTransform:'uppercase', letterSpacing:1, transform:'rotate(-12deg)', boxShadow:'0 6px 16px rgba(0,0,0,0.12)' }} aria-label="Evento grátis carimbo">
              EVENTO GRÁTIS
            </div>
          )}
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, alignItems:'flex-start', marginLeft:20 }}>
          <EventHeader data={p.data} selected={p.selected} selectedQty={p.qty} boxedDescription descLabel="Detalhes do evento" />
          {p.expiredEvent ? (
            <div style={{ marginTop: 10, color:'#b91c1c', fontWeight:700 }}>Evento finalizado — ingressos indisponíveis</div>
          ) : <TicketsPanel {...p} />}
        </div>
      </div>
    )
  }
  if (p.step === 2) {
    const imageUrl = p.data.imageUrl || ''
    return (
      <div style={{ display:'flex', gap:28, color: 'var(--text)', position:'relative' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, alignItems:'flex-start', marginRight:20 }}>
          <EventHeader data={p.data} selected={p.selected} selectedQty={p.qty} />
          <StepSwitcher {...p} />
        </div>
        <div style={{ flex:'0 0 360px', width:320, minWidth:280, height:160, borderRadius:16, background: imageUrl ? `url(${imageUrl})` : '#111827', backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center', boxShadow:'0 10px 24px rgba(0,0,0,0.28)' }} />
        <div className={styles.actions} style={{ position:'absolute', right:28, bottom:18, justifyContent:'flex-end', gap:12 }}>
          <button className={`${styles.btn} ${styles.ghost}`} onClick={() => p.setStep(1)} style={{ padding:'12px 18px', borderRadius:12 }}>Voltar</button>
          <button
            className={`${styles.btn} ${styles.primary}`}
            disabled={!p.paymentMethod}
            onClick={async ()=>{
              try {
                let id = p.orderId
                if (!id && p.data?.id && p.selectedTT) {
                  p.setFlowStatus({ text: p.paymentMethod==='FREE' ? 'Criando pedido — aguardando confirmação...' : 'Criando pedido e aguardando pagamento...', kind: 'ok' })
                  const r = await createBulkOrder(p.data.id, [{ ticketTypeId: p.selectedTT, quantity: Math.min(p.qty, p.maxQty) }])
                  id = String(r?.id || '')
                  p.setOrderId(id)
                }
                await payAndProceed(String(id || ''), p.paymentMethod as PaymentMethod, p.setFlowStatus, p.setStep)
              } catch { p.setFlowStatus({ text:'Falha no pagamento', kind:'err' }) }
            }}
            style={{ padding:'12px 18px', borderRadius:12 }}
          >{p.paymentMethod==='FREE' ? 'Confirmar' : 'Pagar'}</button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 10, color: 'var(--text)' }}>
      <EventHeader data={p.data} selected={p.selected} selectedQty={p.qty} />
      <StepSwitcher {...p} />
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
): Promise<string | void> {
  try {
    const next = await fetchJSON<TicketType[]>(`${API_URL}/events/${dataId}/ticket-types`)
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
  } catch (e: unknown) {
    const err = (e as Error & { status?: number; code?: string })
    const status = Number(err?.status || 0) || 0
    const code = String(err?.code || '')
    if (status === 401 || code === 'unauthorized') return 'Você precisa estar autenticado'
    if (status === 403 || code === 'forbidden') return 'Você não tem acesso aos ingressos deste evento'
    if (status === 404 || code === 'event_not_found') return 'Evento não encontrado'
    return 'Falha ao carregar ingressos'
  }
}

 

async function payAndProceed(
  _orderId: string,
  _paymentMethod: PaymentMethod | '',
  setFlowStatus: (s: FlowStatus) => void,
  setStep: (s: Step) => void
) {
  const msg = _paymentMethod === 'FREE' ? 'Compra confirmada (grátis)' : 'Pedido criado. Aguardando pagamento...'
  setFlowStatus({ text: msg, kind: 'ok' })
  if (_paymentMethod !== 'FREE') setStep(3)
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
  const expiredEvent = useExpired(data?.startDate, data?.status)
  const [tickets, setTickets] = useState((data?.ticketTypes || []).slice())
  const lastTicketsRef = useRef<TicketType[]>(tickets)
  const [highlightIds, setHighlightIds] = useState<string[]>([])
  const [step, setStep] = useState<Step>(1)
  const [orderId, setOrderId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [flowStatus, setFlowStatus] = useState<FlowStatus>({ text: '', kind: '' })
  const finalizeTimerRef = useRef<number | null>(null)
  const [finalized, setFinalized] = useState(false)
  useEffect(() => {
    if (!open || !data?.id) return
    const next = (data.ticketTypes || []).slice()
    setTimeout(() => setTickets(next), 0)
    lastTicketsRef.current = next
    if (!selectedTT) {
      const first = next.find(tt => Number(tt.quantity || 0) > 0)
      if (first) onSelectTT(first.id)
    }
  }, [open, data?.id, data?.ticketTypes, selectedTT, onSelectTT])
useEffect(() => {
  if (!open || !data?.id || data.status !== 'PUBLISHED') { return }
  const runOnce = async () => {
    try {
      const msg = await refreshTickets(data.id, selectedTT, onSelectTT, setTickets, lastTicketsRef, setHighlightIds)
      if (msg) setFlowStatus({ text: msg, kind: 'err' })
    } catch { setTickets(ts => ts) }
  }
  runOnce()
  const id = setInterval(runOnce, 15000)
  return () => { clearInterval(id) }
}, [open, data?.id, data?.status, selectedTT, onSelectTT])
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setStep(1)
        setOrderId('')
        setPaymentMethod('')
        setFlowStatus({ text: '', kind: '' })
        setFinalized(false)
        if (finalizeTimerRef.current) { clearTimeout(finalizeTimerRef.current); finalizeTimerRef.current = null }
      }, 0)
      return () => clearTimeout(t)
    }
  }, [open, data?.id])
  useEffect(() => {
    if (!open) return
    if (step === 3 && paymentMethod === 'FREE' && !finalized) {
      if (finalizeTimerRef.current) { clearTimeout(finalizeTimerRef.current) }
      finalizeTimerRef.current = setTimeout(() => {
        setFinalized(true)
        setFlowStatus({ text: 'Compra finalizada', kind: 'ok' })
      }, 300000) as unknown as number
    } else {
      if (finalizeTimerRef.current) { clearTimeout(finalizeTimerRef.current); finalizeTimerRef.current = null }
    }
  }, [open, step, paymentMethod, finalized])
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
  const contentProps: PurchaseProps = {
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
    finalized,
  }
  return (
    <div className={styles.overlay} onPointerDown={(e)=>{ if (e.currentTarget===e.target && step!==2) onClose() }}>
      <div className={styles.modal}>     
        {publishedActive(data, expiredEvent) ? <Stepper step={step} /> : null}
        <div className={styles.section}><PurchaseContent {...contentProps} /></div>
      </div>
    </div>
  )
}
const notice = (kind: 'ok' | 'err' | 'info', text: string, style?: Record<string, unknown>) => renderNotice(styles as unknown as NoticeStyles, kind, text, style)
