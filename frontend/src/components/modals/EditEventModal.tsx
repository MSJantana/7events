import styles from './modal.module.css'
import { renderNotice } from '../common/Notice'
import type { NoticeStyles } from '../common/Notice'
import { useEffect, useRef, useState, Fragment, type Dispatch, type SetStateAction } from 'react'
import { updateEventBasic, uploadEventImage, getEventById, getTicketTypes, updateTicketType } from '../../services/events'
import { useToast } from '../../hooks/useToast'
import { api } from '../../services/api'
import type { Order } from '../../types'

function errorDetailsLower(e: unknown) {
  const o = e as Record<string, unknown>
  const d = String((o?.details as string) || (o?.message as string) || '')
  return d.toLowerCase()
}
function imageUploadErrorText(lower: string, maxMB?: number) {
  if (lower.includes('low_resolution')) return 'Imagem muito pequena (mín 600x400)'
  if (lower.includes('invalid_mime')) return 'Formato inválido (use PNG/JPEG/WebP)'
  if (lower.includes('invalid_signature')) return 'Arquivo inválido ou corrompido'
  if (lower.includes('file_required')) return 'Selecione uma imagem'
  if (lower.includes('limit_file_size')) {
    const suffix = typeof maxMB === 'number' ? ` (máx ${maxMB} MB)` : ''
    return 'Imagem muito grande' + suffix
  }
  return 'Falha no upload'
}

function hasPaidTicketsForEvent(orders: Order[], eventId: string): boolean {
  for (const o of orders) {
    if (o.status !== 'PAID') continue
    const tickets = o.tickets || []
    for (const t of tickets) {
      const price = Number(t.ticketType?.price || 0)
      if (t.eventId === eventId && price > 0) return true
    }
  }
  return false
}

const notice = (kind: 'ok' | 'err' | 'info', text: string, style?: Record<string, unknown>) => renderNotice(styles as unknown as NoticeStyles, kind, text, style)

function renderTicketItem(
  t: EditTTItem,
  i: number,
  orig: EditTTItem[],
  step: StepId,
  lockEdit: boolean,
  setTts: Dispatch<SetStateAction<EditTTItem[]>>
) {
  const old = orig.find(o => o.id === t.id)
  const changed = !!old && String(old.quantity) !== String(t.quantity)
  return (
    <div key={t.id} className={styles.item} style={changed ? { background:'#f0fdf4', borderColor:'var(--brand)' } : undefined}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', width:'100%' }}>
        <div style={{ flex:'1 1 auto', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
          <span>{t.name}</span>
          {changed ? (
            <span style={{ fontSize:12, color:'#065f46', background:'#d1fae5', border:'1px solid var(--border)', borderRadius:999, padding:'2px 8px' }}>Alterado</span>
          ) : null}
        </div>
        <input type="number" min={0} value={t.quantity} onChange={e=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], quantity: e.target.value }; return copy })} className={styles.inputSm} style={{ width:120 }} disabled={lockEdit || step === 3} />
        <input type="number" min={0} step="0.01" value={t.price} onChange={e=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], price: e.target.value }; return copy })} className={styles.inputSm} style={{ width:120 }} disabled={lockEdit || step === 3} />
      </div>
      {changed ? (
        <div style={{ fontSize:12, color:'#6b7280' }}>Qtd: {String(old?.quantity || '0')} → {t.quantity || '0'}</div>
      ) : null}
    </div>
  )
}

function renderSummaryItem(t: EditTTItem, orig: EditTTItem[]) {
  const old = orig.find(o => o.id === t.id)
  const qtyChanged = !!old && String(old.quantity) !== String(t.quantity)
  const priceChanged = !!old && String(old.price) !== String(t.price)
  return (
    <div key={t.id} style={qtyChanged || priceChanged ? { display:'flex', alignItems:'center', gap:8, background:'#f0fdf4', border:'1px solid var(--brand)', borderRadius:12, padding:'6px 8px' } : { display:'flex', alignItems:'center', gap:8 }}>
      <span aria-hidden>🎟️</span>
      <span style={{ color:'#111827', fontWeight:700 }}>{t.name}</span>
      <span style={{ color:'#6b7280' }}>Qtd: {qtyChanged ? `${String(old?.quantity || '0')} → ${t.quantity || '0'}` : `${t.quantity || '0'}`}</span>
      <span style={{ color: priceChanged ? '#065f46' : '#6b7280' }}>Preço: {priceChanged ? `${brlFmt.format(Number(old?.price || 0))} → ${brlFmt.format(Number(t.price || 0))}` : `${brlFmt.format(Number(t.price || 0))}`}</span>
    </div>
  )
}

type Props = { open: boolean; onClose: () => void; eventId?: string; initial?: { title: string; location: string; startDate: string; endDate: string; description: string }; currentImageUrl?: string | null; onUpdated?: (patch: { id: string; imageUrl?: string | null; thumbUrl?: string | null }) => void }
type StepId = 1 | 2 | 3
type EditTTItem = { id: string; name: string; quantity: string; price: string }

function stepIconClass(s: StepId, id: StepId) {
  if (s === id) return styles.stepIconActive
  if (s > id) return styles.stepIconDone
  return styles.stepIconInactive
}
function stepLabelClass(s: StepId, id: StepId) { return s === id ? styles.stepLabelActive : '' }
function stepLabelValue(s: StepId, id: StepId) {
  let label: string
  if (s === id) {
    label = String(id)
  } else if (s > id) {
    label = '✓'
  } else {
    label = String(id)
  }
  return label
}
const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
function StepperUI({ step }: Readonly<{ step: StepId }>) {
  const steps: Array<{ id: StepId; icon: string; text: string }> = [
    { id: 1, icon: 'edit', text: 'Editar evento' },
    { id: 2, icon: 'confirmation_number', text: 'Ingressos' },
    { id: 3, icon: 'save', text: 'Salvar' },
  ]
  return (
    <div className={styles.stepper}>
      {steps.map((st, idx) => (
        <Fragment key={st.id}>
          <div className={styles.stepGroup}>
            <span className={`${styles.stepIconCircle} ${stepIconClass(step, st.id)}`} aria-hidden><span className="mi">{st.icon}</span></span>
            <span className={`${styles.stepLabel} ${stepLabelClass(step, st.id)}`}>{stepLabelValue(step, st.id)} {st.text}</span>
          </div>
          {idx < steps.length - 1 ? <span className={styles.stepConnector} aria-hidden></span> : null}
        </Fragment>
      ))}
    </div>
  )
}

export default function EditEventModal({ open, onClose, eventId, initial, currentImageUrl, onUpdated }: Readonly<Props>) {
  const { show } = useToast()
  const [form, setForm] = useState(initial || { title: '', location: '', startDate: '', endDate: '', description: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imgCfg, setImgCfg] = useState<{ uploadMaxMB: number; allowedMimes: string[]; minWidth: number; minHeight: number; mainMaxWidth: number } | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(currentImageUrl || null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<StepId>(1)
  const [tts, setTts] = useState<EditTTItem[]>([])
  const origTtsRef = useRef<EditTTItem[]>([])
  const [lockEdit, setLockEdit] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { const cfg = await api.imageConfig(); if (!cancelled) setImgCfg(cfg) } catch { setImgCfg(c => c) }
    })()
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!open || !eventId) return
      setLoading(true)
      try {
        const ev = await getEventById(eventId)
        if (cancelled) return
        setForm({
          title: ev.title || '',
          location: ev.location || '',
          startDate: ev.startDate ? String(ev.startDate).substring(0,10) : '',
          endDate: ev.endDate ? String(ev.endDate).substring(0,10) : '',
          description: ev.description || ''
        })
        setExistingImageUrl(ev.imageUrl || null)
        const list = await getTicketTypes(eventId)
        const mapped = (list||[]).map(t => ({ id: t.id, name: t.name, quantity: String(t.quantity||0), price: String(Number(t.price||0).toFixed(2)) }))
        setTts(mapped)
        origTtsRef.current = mapped
        try {
          const ordersMod = await import('../../services/orders')
          const orders = await ordersMod.getAllOrders()
          const hasPaid = hasPaidTicketsForEvent(orders, eventId)
          setLockEdit(hasPaid)
        } catch { setLockEdit(false) }
      } catch { setForm(f => f) }
      finally { setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [open, eventId])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])


  if (!open) return null

  const thumbUrl = existingImageUrl?.endsWith('.webp') ? existingImageUrl.replace(/\.webp$/, '-thumb.webp') : (existingImageUrl ?? null)
  const bgUrl = preview || thumbUrl
  const bgImage = bgUrl ? `url(${bgUrl})` : undefined

  async function uploadImageIfNeeded(id: string, f: File | null) {
    if (!f) return
    try {
      const r = await uploadEventImage(id, f)
      show({ text: 'Imagem atualizada', kind: 'ok' })
      onUpdated?.({ id, imageUrl: r?.imageUrl || null, thumbUrl: r?.thumbUrl || null })
    } catch (e: unknown) {
      const c = errorDetailsLower(e)
      const msg = imageUploadErrorText(c, imgCfg?.uploadMaxMB)
      show({ text: msg, kind: 'err' })
    }
  }

  async function onSave() {
    try {
      if (!eventId) return
      await updateEventBasic(eventId, form)
      await uploadImageIfNeeded(eventId, file)
      for (const ch of tts) {
        const old = origTtsRef.current.find(o => o.id === ch.id)
        if (!old) continue
        const payload: Partial<{ name: string; price: number; quantity: number }> = {}
        if (String(old.quantity) !== String(ch.quantity)) {
          payload.quantity = Number(ch.quantity || 0)
        }
        const oldPrice = Number(old.price || 0)
        const newPrice = Number(ch.price || 0)
        if (Number(oldPrice.toFixed(2)) !== Number(newPrice.toFixed(2))) {
          payload.price = newPrice
        }
        if (Object.keys(payload).length > 0) {
          await updateTicketType(eventId, ch.id, payload)
        }
      }
      show({ text: 'Evento atualizado', kind: 'ok' })
      onClose()
    } catch { show({ text: 'Falha ao atualizar', kind: 'err' }) }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>     
        <StepperUI step={step} />
        <div className={styles.section}>
          <div className={styles.content}>
            <div className={styles.card}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width: 140, height: 94, border:'1px solid #e5e7eb', borderRadius:12, background:'#f3f4f6', backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={e=>{
                    const f = e.target.files?.[0] || null
                    if (f && imgCfg) {
                      const okType = imgCfg.allowedMimes.includes(f.type)
                      const maxBytes = imgCfg.uploadMaxMB * 1024 * 1024
                      const okSize = f.size <= maxBytes
                      if (!okType) {
                        show({ text: 'Formato inválido (use PNG/JPEG/WebP)', kind: 'err' })
                        setFile(null)
                        setPreview(null)
                        e.currentTarget.value = ''
                        return
                      }
                      if (!okSize) {
                        show({ text: `Imagem muito grande (máx ${imgCfg.uploadMaxMB} MB)`, kind: 'err' })
                        setFile(null)
                        setPreview(null)
                        e.currentTarget.value = ''
                        return
                      }
                    }
                    setFile(f)
                    setPreview(f ? URL.createObjectURL(f) : null)
                  }}
                />
              </div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:6 }}>
                {imgCfg ? `Máx ${imgCfg.uploadMaxMB} MB, mín ${imgCfg.minWidth}x${imgCfg.minHeight}, formatos PNG/JPEG/WebP` : `Mín 600x400, formatos PNG/JPEG/WebP`}
              </div>
              {lockEdit ? notice('info', 'Edição bloqueada: já existem ingressos pagos', { background:'#fffbeb', borderColor:'var(--warn)', color:'#92400e' }) : null}
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:'600px', width:'100%', alignSelf:'center' }}>
                <div className={styles.field}><label className={styles.label} htmlFor="edit-event-title">Título</label><input id="edit-event-title" className={styles.inputSm} value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} disabled={loading || lockEdit} /></div>
                <div className={styles.field}><label className={styles.label} htmlFor="edit-event-location">Local</label><input id="edit-event-location" className={styles.inputSm} value={form.location} onChange={e=>setForm(f=>({ ...f, location: e.target.value }))} disabled={loading || lockEdit} /></div>
                <div className={styles.row}>
                  <div className={`${styles.field} ${styles.col}`}><label className={styles.label} htmlFor="edit-event-start-date">Início</label><input id="edit-event-start-date" className={styles.inputSm} type="date" value={form.startDate} onChange={e=>setForm(f=>({ ...f, startDate: e.target.value }))} disabled={loading || lockEdit} /></div>
                  <div className={`${styles.field} ${styles.col}`}><label className={styles.label} htmlFor="edit-event-end-date">Fim</label><input id="edit-event-end-date" className={styles.inputSm} type="date" value={form.endDate} onChange={e=>setForm(f=>({ ...f, endDate: e.target.value }))} disabled={loading || lockEdit} /></div>
                </div>
                <div className={styles.field}><label className={styles.label} htmlFor="edit-event-description">Descrição</label><textarea id="edit-event-description" className={styles.inputSm} rows={3} value={form.description} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} disabled={loading || lockEdit} /></div>
              </div>
              {step === 1 && (
                <div className={styles.actions}>
                  <button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}>Cancelar</button>
                  <button className={`${styles.btn} ${styles.primary}`} onClick={()=>setStep(2)} disabled={lockEdit}>Continuar</button>
                </div>
              )}
            </div>
            {(step === 2 || step === 3) && (
              <aside className={styles.sidebar}>
                <div className={styles.sectionTitle}><span aria-hidden>🎟️</span><span>Ingressos</span></div>
                {tts.length === 0 ? (
                  notice('info', 'Nenhum ingresso cadastrado')
                ) : tts.map((t, i) => renderTicketItem(t, i, origTtsRef.current, step, lockEdit, setTts))}
                {step === 2 && (
                  <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.ghost}`} onClick={()=>setStep(1)}>Voltar</button>
                    <button className={`${styles.btn} ${styles.primary}`} onClick={()=>setStep(3)}>Avançar</button>
                  </div>
                )}
              </aside>
            )}
          </div>
          {step === 3 && (
            <div className={styles.card} style={{ marginTop:8 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#111827' }}>Resumo</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {tts.map(t => renderSummaryItem(t, origTtsRef.current))}
              </div>
              <div className={styles.actions} style={{ marginTop:8 }}>
                <button className={`${styles.btn} ${styles.ghost}`} onClick={()=>setStep(2)}>Voltar</button>
                <button className={`${styles.btn} ${styles.primary}`} onClick={onSave}>{loading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
