import styles from './modal.module.css'
import type { User } from '../../types'
import { useEffect, useState, Fragment } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
type StepId = 1 | 2 | 3

function stepIconClass(s: StepId, id: StepId) {
  if (s === id) return styles.stepIconActive
  if (s > id) return styles.stepIconDone
  return styles.stepIconInactive
}
function stepLabelClass(s: StepId, id: StepId) {
  return s === id ? styles.stepLabelActive : ''
}
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
function StepperUI(s: StepId) {
  const steps: Array<{ id: StepId; icon: string; text: string }> = [
    { id: 1, icon: 'calendar_month', text: 'Criar evento' },
    { id: 2, icon: 'confirmation_number', text: 'Adicionar ingresso' },
    { id: 3, icon: 'rocket_launch', text: 'Finalizar' },
  ]
  return (
    <div className={styles.stepper}>
      {steps.map((st, idx) => (
        <Fragment key={st.id}>
          <div className={styles.stepGroup}>
            <span className={`${styles.stepIconCircle} ${stepIconClass(s, st.id)}`} aria-hidden><span className="mi">{st.icon}</span></span>
            <span className={`${styles.stepLabel} ${stepLabelClass(s, st.id)}`}>{stepLabelValue(s, st.id)} {st.text}</span>
          </div>
          {idx < steps.length - 1 ? <span className={styles.stepConnector} aria-hidden></span> : null}
        </Fragment>
      ))}
    </div>
  )
}
type TicketItem = { id: string; name: string; paid: boolean; price: string; quantity: string }
function makeTempId() { return 'tt-' + Math.random().toString(36).slice(2) + Date.now().toString(36) }
function Step1Section(p: Readonly<{ preview: string | null; hint: string; title: string; description: string; location: string; startDate: string; endDate: string; capacity: string; onTitleChange: (v: string) => void; onDescriptionChange: (v: string) => void; onLocationChange: (v: string) => void; onStartDateChange: (v: string) => void; onEndDateChange: (v: string) => void; onCapacityChange: (v: string) => void; handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void; loading: boolean; user: User | null; onClose: () => void; onSubmit: () => void }>): ReactNode {
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width: 140, height: 94, border:'1px solid #e5e7eb', borderRadius:12, background:'#f3f4f6', overflow:'hidden' }}>
          {p.preview ? (
            <img src={p.preview} alt="Prévia" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          ) : null}
        </div>
        <input type="file" accept="image/*" onChange={p.handleImageChange} />
      </div>
      <div style={{ fontSize:12, color:'#6b7280', marginTop:6 }}>{p.hint}</div>
      <div className={styles.field}><label htmlFor="title" className={styles.label}>Título</label><input id="title" className={styles.input} value={p.title} onChange={e=>p.onTitleChange(e.target.value)} /></div>
      <div className={styles.field}><label htmlFor="description" className={styles.label}>Descrição</label><textarea id="description" className={styles.input} value={p.description} onChange={e=>p.onDescriptionChange(e.target.value)} /></div>
      <div className={styles.field}><label htmlFor="location" className={styles.label}>Local</label><input id="location" className={styles.input} value={p.location} onChange={e=>p.onLocationChange(e.target.value)} /></div>
      <div className={styles.row}>
        <div className={`${styles.field} ${styles.col}`}><label htmlFor="startDate" className={styles.label}>Início</label><input id="startDate" className={styles.inputSm} type="date" placeholder="dd/mm/aaaa" value={p.startDate} onChange={e=>p.onStartDateChange(e.target.value)} /></div>
        <div className={`${styles.field} ${styles.col}`}><label htmlFor="endDate" className={styles.label}>Fim</label><input id="endDate" className={styles.inputSm} type="date" placeholder="dd/mm/aaaa" value={p.endDate} onChange={e=>p.onEndDateChange(e.target.value)} /></div>
        <div className={styles.field} style={{ flex:'0 0 120px' }}><label htmlFor="capacity" className={styles.label}>Capacidade</label><input id="capacity" className={styles.inputSm} type="number" min={0} placeholder="0" value={p.capacity} onChange={e=>p.onCapacityChange(e.target.value)} /></div>
      </div>
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onClose}>Cancelar</button>
        <button disabled={p.loading || !p.user} className={`${styles.btn} ${styles.primary}`} onClick={p.onSubmit}>{p.loading ? 'Criando...' : 'Continuar'}</button>
      </div>
    </>
  )
}
function Step2Section(p: Readonly<{ tts: TicketItem[]; onChangePaid: (i: number, paid: boolean) => void; onChangeQty: (i: number, qty: string) => void; onChangePrice: (i: number, price: string) => void; onRemove: (i: number) => void; onAdd: () => void; onBack: () => void; onNext: () => void }>): ReactNode {
  return (
    <>
      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
        <div className={styles.sectionTitle}><span aria-hidden>🎟️</span><span>Ingressos</span></div>
        {p.tts.map((t, i) => (
          <div key={t.id} className={styles.item}>
            <div style={{ display:'grid', gridTemplateColumns:'140px 120px 1fr auto', gap:10, alignItems:'center', width:'100%' }}>
              <select value={t.paid ? 'paid' : 'free'} onChange={e=>p.onChangePaid(i, e.target.value==='paid')} className={styles.inputSm}>
                <option value="free">Grátis</option>
                <option value="paid">Pago</option>
              </select>
              <select value={t.quantity} onChange={e=>p.onChangeQty(i, e.target.value)} className={styles.inputSm}>
                {Array.from({ length: 50 }).map((_, q)=> (
                  <option key={q+1} value={String(q+1)}>{q+1}</option>
                ))}
              </select>
              {t.paid ? (
                <div className={styles.summaryRow}>
                  <span>Valor unitário</span>
                  <input placeholder="R$ 0,00" type="number" min={0} step="0.01" value={t.price} onChange={e=>p.onChangePrice(i, e.target.value)} className={styles.inputSm} style={{ width:140 }} />
                </div>
              ) : <div />}
              <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={()=>p.onRemove(i)}>Remover</button>
            </div>
          </div>
        ))}
        <div>
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={p.onAdd}>Adicionar ingresso</button>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onBack}>Voltar</button>
        <button className={`${styles.btn} ${styles.primary}`} onClick={p.onNext}>Avançar</button>
      </div>
    </>
  )
}
function Step3Section(p: Readonly<{ tts: TicketItem[]; loading: boolean; user: User | null; onBack: () => void; onFinalize: () => void; onFinalizeAndPublish: () => void }>): ReactNode {
  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ fontSize:16, fontWeight:800, color:'#111827' }}>Resumo</div>
        <div style={{ color:'#6b7280' }}>Evento criado. Finalize para salvar os ingressos.</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {p.tts.map((t) => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span aria-hidden>🎟️</span>
              <span style={{ color:'#6b7280' }}>{t.paid ? `Pago — R$ ${Number(t.price||0).toFixed(2)}` : 'Grátis'}</span>
              <span style={{ color:'#6b7280' }}>Qtd: {t.quantity || '0'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.actions} style={{ marginTop:8 }}>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onBack}>Voltar</button>
        <button disabled={p.loading || !p.user} className={`${styles.btn} ${styles.primary}`} onClick={p.onFinalize}>{p.loading ? 'Salvando...' : 'Finalizar'}</button>
        <button disabled={p.loading || !p.user} className={`${styles.btn} ${styles.primary}`} onClick={p.onFinalizeAndPublish}>{p.loading ? '...' : 'Finalizar e publicar'}</button>
      </div>
    </>
  )
}
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
  return 'Falha no upload de imagem'
}
function eventCreateErrorText(e: unknown) {
  const obj = (e ?? {}) as Record<string, unknown>
  const code = String((obj['code'] as string) || (obj['message'] as string) || '')
  const status = Number((obj['status'] as number) || 0) || 0
  const details = Array.isArray(obj['details']) ? (obj['details'] as Array<{ path?: Array<string | number>; message?: string; code?: string }>) : []
  if (status === 401 || code === 'unauthorized') return 'Você precisa estar autenticado'
  if (code === 'invalid_capacity') return 'Capacidade inválida'
  if (details.length > 0) {
    const msgs = details.map((it) => {
      const field = String((it?.path?.[0] as string | number | undefined) || '')
      switch (field) {
        case 'title': return 'Campo título é obrigatório (mín 3)'
        case 'description': return 'Campo descrição é obrigatório (mín 10)'
        case 'location': return 'Campo local é obrigatório (mín 3)'
        case 'startDate': return 'Data de início inválida'
        case 'endDate': return 'Data de fim inválida'
        case 'capacity': return 'Capacidade deve ser um inteiro positivo'
        case 'imageUrl': return 'URL de imagem inválida'
        default: return `${field || 'Campo'} inválido`
      }
    })
    const uniq = Array.from(new Set(msgs))
    return uniq.join(' • ')
  }
  return 'Dados inválidos para criar evento'
}
function ticketTypeCreateErrorText(e: unknown) {
  const obj = (e ?? {}) as Record<string, unknown>
  const code = String((obj['code'] as string) || (obj['message'] as string) || '')
  const status = Number((obj['status'] as number) || 0) || 0
  const details = Array.isArray(obj['details']) ? (obj['details'] as Array<{ path?: Array<string | number>; message?: string; code?: string }>) : []
  if (status === 401 || code === 'unauthorized') return 'Você precisa estar autenticado'
  if (status === 403 || code === 'forbidden') return 'Você não tem acesso para criar ingressos'
  if (code === 'event_not_found') return 'Evento não encontrado'
  if (details.length > 0) {
    const msgs = details.map((it) => {
      const field = String((it?.path?.[0] as string | number | undefined) || '')
      switch (field) {
        case 'name': return 'Nome do ingresso é obrigatório'
        case 'price': return 'Preço deve ser maior ou igual a 0'
        case 'quantity': return 'Quantidade deve ser um inteiro positivo'
        default: return `${field || 'Campo'} inválido`
      }
    })
    const uniq = Array.from(new Set(msgs))
    return uniq.join(' • ')
  }
  return 'Falha ao criar ingresso'
}
function publishErrorText(e: unknown) {
  const obj = (e ?? {}) as Record<string, unknown>
  const code = String((obj['code'] as string) || (obj['message'] as string) || '')
  if (code === 'invalid_capacity') return 'Capacidade inválida para publicar'
  return 'Falha ao publicar evento'
}
import { createEvent, uploadEventImage, createTicketType, publishEvent } from '../../services/events'
import { useToast } from '../../hooks/useToast'
import { api } from '../../services/api'

type Props = { open: boolean; onClose: () => void; user: User | null; onCreated?: (id: string) => void }

export default function CreateEventModal({ open, onClose, user, onCreated }: Readonly<Props>) {
  const { show } = useToast()
  const [form, setForm] = useState({ title: '', description: '', location: '', startDate: '', endDate: '', capacity: '0' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imgCfg, setImgCfg] = useState<{ uploadMaxMB: number; allowedMimes: string[]; minWidth: number; minHeight: number; mainMaxWidth: number } | null>(null)
  const [tts, setTts] = useState<Array<TicketItem>>([])
  const [step, setStep] = useState<StepId>(1)
  const [createdEventId, setCreatedEventId] = useState<string>('')
  const [ticketsSaved, setTicketsSaved] = useState(false)
  const totalQty = tts.reduce((s, t) => s + (Number(t.quantity || 0) || 0), 0)
  const totalRevenue = tts.reduce((s, t) => {
    const q = Number(t.quantity || 0) || 0
    const p = t.paid ? (Number(t.price || 0) || 0) : 0
    return s + q * p
  }, 0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { const cfg = await api.imageConfig(); if (!cancelled) setImgCfg(cfg) } catch { setImgCfg(c => c) }
    })()
    return () => { cancelled = true }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function imageHint(cfg: typeof imgCfg) {
    return cfg ? `Máx ${cfg.uploadMaxMB} MB, mín ${cfg.minWidth}x${cfg.minHeight}, formatos PNG/JPEG/WebP` : `Mín 600x400, formatos PNG/JPEG/WebP`
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    const clear = () => { setFile(null); setPreview(null); e.currentTarget.value = '' }
    if (f && imgCfg) {
      const okType = imgCfg.allowedMimes.includes(f.type)
      const maxBytes = imgCfg.uploadMaxMB * 1024 * 1024
      const okSize = f.size <= maxBytes
      if (!okType) { show({ text: 'Formato inválido (use PNG/JPEG/WebP)', kind: 'err' }); clear(); return }
      if (!okSize) { show({ text: `Imagem muito grande (máx ${imgCfg.uploadMaxMB} MB)`, kind: 'err' }); clear(); return }
    }
    if (!f) { clear(); return }
    const url = URL.createObjectURL(f)
    const minW = imgCfg?.minWidth || 600
    const minH = imgCfg?.minHeight || 400
    const img = new Image()
    img.onload = () => {
      const ok = img.naturalWidth >= minW && img.naturalHeight >= minH
      if (!ok) { show({ text: `Imagem muito pequena (mín ${minW}x${minH})`, kind: 'err' }); URL.revokeObjectURL(url); clear(); return }
      setFile(f)
      setPreview(url)
    }
    img.onerror = () => { show({ text: 'Arquivo de imagem inválido', kind: 'err' }); URL.revokeObjectURL(url); clear() }
    img.src = url
  }


  const hint = imageHint(imgCfg)

  async function onSubmit() {
    setLoading(true)
    try {
      const payload = { ...form, capacity: Number(form.capacity || 0) }
      const r = await createEvent(payload)
      const id = String(r?.id || '')
      setCreatedEventId(id)
      if (file && id) {
        try { await uploadEventImage(id, file); show({ text: 'Imagem enviada', kind: 'ok' }) }
        catch (e: unknown) {
          const c = errorDetailsLower(e)
          const msg = imageUploadErrorText(c, imgCfg?.uploadMaxMB)
          show({ text: msg, kind: 'err' })
        }
      }
      show({ text: 'Evento criado', kind: 'ok' })
      setStep(2)
    } catch (e: unknown) { const msg = eventCreateErrorText(e); show({ text: msg, kind: 'err' }) }
    finally { setLoading(false) }
  }

  async function onFinalize() {
    if (!createdEventId) { show({ text: 'Evento não criado', kind: 'err' }); return }
    if (!ticketsSaved && Array.isArray(tts) && tts.length > 0) {
      setLoading(true)
      try {
        const payloads = tts.map((t, i) => {
          const name = String(t.name || '').trim()
          const qty = Number(t.quantity || 0)
          const price = t.paid ? Number(t.price || 0) : 0
          if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return null
          const finalName = name || (t.paid ? `Ingresso Pago ${i+1}` : `Ingresso Grátis ${i+1}`)
          return { name: finalName, price, quantity: qty }
        }).filter(Boolean) as Array<{ name: string; price: number; quantity: number }>
        const createdIds: string[] = []
        for (const p of payloads) {
          try { const j = await createTicketType(createdEventId, p); createdIds.push(String(j?.id || '')) }
          catch (e: unknown) { const msg = ticketTypeCreateErrorText(e); show({ text: msg, kind: 'err' }) }
        }
        if (createdIds.length > 0) { show({ text: 'Ingressos criados', kind: 'ok' }); setTicketsSaved(true) }
      } finally { setLoading(false) }
    }
    onCreated?.(createdEventId)
    onClose()
  }

  async function onFinalizeAndPublish() {
    if (!createdEventId) { show({ text: 'Evento não criado', kind: 'err' }); return }
    await onFinalize()
    try {
      await publishEvent(createdEventId)
      show({ text: 'Evento publicado', kind: 'ok' })
    } catch (e: unknown) {
      const msg = publishErrorText(e)
      show({ text: msg, kind: 'err' })
    }
  }

  let section: ReactNode = null
  if (step === 1) {
    section = Step1Section({
      preview,
      hint,
      title: form.title,
      description: form.description,
      location: form.location,
      startDate: form.startDate,
      endDate: form.endDate,
      capacity: form.capacity,
      onTitleChange: (v)=>setForm(f=>({ ...f, title: v })),
      onDescriptionChange: (v)=>setForm(f=>({ ...f, description: v })),
      onLocationChange: (v)=>setForm(f=>({ ...f, location: v })),
      onStartDateChange: (v)=>setForm(f=>({ ...f, startDate: v })),
      onEndDateChange: (v)=>setForm(f=>({ ...f, endDate: v })),
      onCapacityChange: (v)=>setForm(f=>({ ...f, capacity: v })),
      handleImageChange,
      loading,
      user,
      onClose,
      onSubmit: () => { onSubmit() },
    })
  } else if (step === 2) {
    section = Step2Section({
      tts,
      onChangePaid: (i, paid) => setTts(list => {
        const copy = list.slice()
        copy[i] = { ...copy[i], paid }
        if (!paid) copy[i].price = '0'
        return copy
      }),
      onChangeQty: (i, qty)=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], quantity: qty }; return copy }),
      onChangePrice: (i, price)=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], price }; return copy }),
      onRemove: (i)=>setTts(list=>list.filter((_, idx)=> idx!==i)),
      onAdd: ()=>setTts(list=>[...list, { id: makeTempId(), name:'', paid:false, price:'0', quantity:'1' }]),
      onBack: ()=>setStep(1),
      onNext: ()=>setStep(3),
    })
  } else if (step === 3) {
    section = Step3Section({
      tts,
      loading,
      user,
      onBack: ()=>setStep(2),
      onFinalize: () => { onFinalize() },
      onFinalizeAndPublish: () => { void onFinalizeAndPublish() },
    })
  }
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>      
        {StepperUI(step)}
        <div className={styles.section}>
          <div className={styles.content}>
            <div className={styles.card}>
              {section}
            </div>
            <aside className={styles.sidebar}>
              <div className={styles.summaryTitle}>Resumo</div>
              <div className={styles.summaryBox}>
                <div className={styles.summaryRow}><span>Evento</span><span>{form.title || '—'}</span></div>
                <div className={styles.summaryRow}><span>Status</span><span>{createdEventId ? 'Criado' : 'Rascunho'}</span></div>
                <div className={styles.summaryRow}><span>Ingressos</span><span>{totalQty}</span></div>
                <div className={styles.summaryRow}><span>Receita potencial</span><span>{`R$ ${totalRevenue.toFixed(2)}`}</span></div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
