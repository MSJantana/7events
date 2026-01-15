import { useState, useEffect, Fragment } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuth'
import { createEvent, uploadEventImage, createTicketType, publishEvent } from '../services/events'
import { api } from '../services/api'
import type { User } from '../types'
import styles from './create-event.module.css'

// --- Helper Functions & Types ---

type StepId = 1 | 2 | 3
type TicketItem = { id: string; name: string; paid: boolean; price: string; quantity: string }

function makeTempId() { return 'tt-' + Math.random().toString(36).slice(2) + Date.now().toString(36) }

function parseCurrencyBR(text: string) {
  const digits = String(text || '').replaceAll(/\D/g, '')
  const n = digits ? Number(digits) : 0
  const v = (n / 100).toFixed(2)
  return v
}

function formatCurrencyBR(value: string) {
  const n = Number(value || 0)
  const cents = Math.round(n * 100)
  const s = String(Math.max(0, cents))
  const int = s.slice(0, -2) || '0'
  const dec = s.slice(-2).padStart(2, '0')
  const intDots = int.replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${intDots},${dec}`
}

function parseYMD(s: string) {
  const parts = String(s || '').split('-')
  const y = Number(parts[0] || 0)
  const m = Number(parts[1] || 0)
  const d = Number(parts[2] || 0)
  return { y, m, d }
}

function todayYMD() {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function validateDates(startD: string, startT: string, endD: string, endT: string): string | null {
  const sObj = parseYMD(startD || todayYMD())
  const [sh, sm] = String(startT || '00:00').split(':').map(Number)
  const start = new Date(sObj.y, sObj.m - 1, sObj.d, sh || 0, sm || 0)
  
  const now = new Date()
  if (start < now) return 'Data e hora inválida'

  const eObj = parseYMD(endD || todayYMD())
  const [eh, em] = String(endT || '00:00').split(':').map(Number)
  const end = new Date(eObj.y, eObj.m - 1, eObj.d, eh || 0, em || 0)

  if (end <= start) return 'Data de término deve ser posterior ao início'
  
  return null
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
      const field = String(it?.path?.[0] || '')
      const msg = String(it?.message || '')
      switch (field) {
        case 'title': return 'Campo título é obrigatório (mín 3)'
        case 'description': return 'Campo descrição é obrigatório (mín 10)'
        case 'location': return 'Campo local é obrigatório (mín 3)'
        case 'startDate': 
          if (msg === 'date_in_past' || msg === 'start_in_past') return 'Não foi possível criar o evento: data e hora inválidas'
          return 'Data de início inválida'
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
      const field = String(it?.path?.[0] || '')
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

// --- Components ---

function StepperUI(step: StepId) {
  const steps = [
    { id: 1, label: 'Detalhes' },
    { id: 2, label: 'Ingressos' },
    { id: 3, label: 'Publicar' },
  ]

  const getStepClass = (sId: number) => {
    if (step === sId) return styles.stepIconActive
    if (step > sId) return styles.stepIconDone
    return styles.stepIconInactive
  }

  return (
    <div className={styles.stepper}>
      {steps.map((s, idx) => (
        <Fragment key={s.id}>
          <div className={styles.stepGroup}>
            <div className={`${styles.stepIconCircle} ${getStepClass(s.id)}`}>
              {step > s.id ? '✓' : s.id}
            </div>
            <div className={`${styles.stepLabel} ${step === s.id ? styles.stepLabelActive : ''}`}>{s.label}</div>
          </div>
          {idx < steps.length - 1 ? <span className={styles.stepConnector} aria-hidden></span> : null}
        </Fragment>
      ))}
    </div>
  )
}

function Step1Section(p: Readonly<{ preview: string | null; hint: string; title: string; description: string; location: string; startDate: string; startTime: string; endDate: string; endTime: string; capacity: string; onTitleChange: (v: string) => void; onDescriptionChange: (v: string) => void; onLocationChange: (v: string) => void; onStartDateChange: (v: string) => void; onStartTimeChange: (v: string) => void; onEndDateChange: (v: string) => void; onEndTimeChange: (v: string) => void; onCapacityChange: (v: string) => void; handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void; loading: boolean; user: User | null; onCancel: () => void; onSubmit: () => void }>): ReactNode {
  const titleInvalid = String(p.title || '').trim() === ''
  const descriptionInvalid = String(p.description || '').trim() === ''
  const locationInvalid = String(p.location || '').trim() === ''
  const startInvalid = String(p.startDate || '').trim() === ''
  const endInvalid = String(p.endDate || '').trim() === ''
  const capacityInvalid = !Number(p.capacity || 0) || Number(p.capacity) <= 0
  const filled = !(titleInvalid || descriptionInvalid || locationInvalid || startInvalid || endInvalid || capacityInvalid)
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
      <div className={styles.field}><label htmlFor="title" className={styles.label}>Título</label><input id="title" className={`${styles.input} ${titleInvalid ? styles.invalid : ''}`} value={p.title} onChange={e=>p.onTitleChange(e.target.value)} /></div>
      <div className={styles.field}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <label htmlFor="description" className={styles.label}>Descrição</label>
          <span style={{ fontSize: 10, color: '#6b7280' }}>{p.description.length}/2500 (mín 10)</span>
        </div>
        <textarea
          id="description"
          className={`${styles.input} ${descriptionInvalid ? styles.invalid : ''}`}
          value={p.description}
          maxLength={2500}
          onChange={e => p.onDescriptionChange(e.target.value)}
          style={{ minHeight: 100, resize: 'vertical' }}
        />
      </div>
      <div className={styles.field}><label htmlFor="location" className={styles.label}>Local</label><input id="location" className={`${styles.input} ${locationInvalid ? styles.invalid : ''}`} value={p.location} onChange={e=>p.onLocationChange(e.target.value)} /></div>
      <div className={styles.row}>
        <div className={`${styles.field} ${styles.col}`}><label htmlFor="startDate" className={styles.label}>Início</label><input id="startDate" className={`${styles.inputSm} ${startInvalid ? styles.invalid : ''}`} type="date" placeholder="dd/mm/aaaa" value={p.startDate} onChange={e=>p.onStartDateChange(e.target.value)} /></div>
        <div className={styles.field} style={{ flex:'0 0 100px' }}><label htmlFor="startTime" className={styles.label}>Hora</label><input id="startTime" className={styles.inputSm} type="time" value={p.startTime} onChange={e=>p.onStartTimeChange(e.target.value)} /></div>
        <div className={`${styles.field} ${styles.col}`}><label htmlFor="endDate" className={styles.label}>Fim</label><input id="endDate" className={`${styles.inputSm} ${endInvalid ? styles.invalid : ''}`} type="date" placeholder="dd/mm/aaaa" value={p.endDate} onChange={e=>p.onEndDateChange(e.target.value)} /></div>
        <div className={styles.field} style={{ flex:'0 0 100px' }}><label htmlFor="endTime" className={styles.label}>Hora</label><input id="endTime" className={styles.inputSm} type="time" value={p.endTime} onChange={e=>p.onEndTimeChange(e.target.value)} /></div>
      </div>
      <div className={styles.row} style={{ marginTop:10 }}>
        <div className={styles.field} style={{ flex:'0 0 120px' }}><label htmlFor="capacity" className={styles.label}>Capacidade</label><input id="capacity" className={`${styles.inputSm} ${capacityInvalid ? styles.invalid : ''}`} type="number" min={0} placeholder="0" value={p.capacity} onChange={e=>p.onCapacityChange(e.target.value)} /></div>
      </div>
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onCancel}>Cancelar</button>
        <button disabled={p.loading || !p.user || !filled} className={`${styles.btn} ${styles.primary}`} onClick={p.onSubmit}>{p.loading ? 'Criando...' : 'Continuar'}</button>
      </div>
    </>
  )
}

function Step2Section(p: Readonly<{ tts: TicketItem[]; onChangePaid: (i: number, paid: boolean) => void; onChangePrice: (i: number, price: string) => void; onBack: () => void; onNext: () => void }>): ReactNode {
  return (
    <>
      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
        <div className={styles.sectionTitle}><span aria-hidden>🎟️</span><span>Ingressos</span></div>
        {p.tts.map((t, i) => (
          <div key={t.id} className={styles.item}>
            <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 260px', gap:6, alignItems:'center', width:'100%' }}>
              <select value={t.paid ? 'paid' : 'free'} onChange={e=>p.onChangePaid(i, e.target.value==='paid')} className={styles.inputSm}>
                <option value="free">Grátis</option>
                <option value="paid">Pago</option>
              </select>
              <div className={styles.qtyWrap}>
                <span className={styles.qtyLabel}>Quantidade</span>
                <span className={styles.qtyBox}>{t.quantity}</span>
              </div>
              {t.paid ? (
                <div className={`${styles.summaryRow} ${styles.priceRow}`}>
                  <span className={styles.priceLabel}>Valor unitário</span>
                  <input placeholder="R$ 0,00" type="text" inputMode="decimal" value={formatCurrencyBR(t.price)} onChange={e=>p.onChangePrice(i, parseCurrencyBR(e.target.value))} className={styles.inputSm} style={{ width:220 }} />
                </div>
              ) : <div />}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={p.onBack}>Voltar</button>
        <button className={`${styles.btn} ${styles.primary}`} onClick={p.onNext}>Avançar</button>
      </div>
    </>
  )
}

function Step3Section(p: Readonly<{ tts: TicketItem[]; loading: boolean; user: User | null; onBack: () => void; onFinalizeAndPublish: () => void }>): ReactNode {
  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ fontSize:16, fontWeight:800, color:'#111827' }}>Resumo</div>
        <div style={{ color:'#6b7280' }}>Este evento só será criado e publicado ao clicar em “Finalizar e publicar”.</div>
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
        <button disabled={p.loading || !p.user} className={`${styles.btn} ${styles.primary}`} onClick={p.onFinalizeAndPublish}>{p.loading ? '...' : 'Finalizar e publicar'}</button>
      </div>
    </>
  )
}

export default function CreateEventPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { show } = useToast()
  
  const [form, setForm] = useState({ title: '', description: '', location: '', startDate: todayYMD(), startTime: '08:00', endDate: todayYMD(), endTime: '10:00', capacity: '0' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imgCfg, setImgCfg] = useState<{ uploadMaxMB: number; allowedMimes: string[]; minWidth: number; minHeight: number; mainMaxWidth: number } | null>(null)
  const [tts, setTts] = useState<Array<TicketItem>>([])
  const [step, setStep] = useState<StepId>(1)
  const [createdEventId, setCreatedEventId] = useState<string>('')
  
  const totalQty = tts.reduce((s, t) => s + (Number(t.quantity || 0) || 0), 0)
  const totalRevenue = tts.reduce((s, t) => {
    const q = Number(t.quantity || 0) || 0
    const p = t.paid ? (Number(t.price || 0) || 0) : 0
    return s + q * p
  }, 0)

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
        // You might want to redirect to login or show a message
        // For now, let's just stay here or maybe redirect home
    }
  }, [user, navigate])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { const cfg = await api.imageConfig(); if (!cancelled) setImgCfg(cfg) } catch { setImgCfg(c => c) }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (step !== 2) return
    setTts(list => {
      const qty = String(Number(form.capacity || 0))
      const first = list[0] ? { ...list[0], quantity: qty } : { id: makeTempId(), name:'', paid:false, price:'0', quantity: qty }
      return [first]
    })
  }, [step, form.capacity])

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

  async function onSubmitStep1() {
    setLoading(true)
    try {
      const err = validateDates(form.startDate, form.startTime, form.endDate, form.endTime)
      if (err) { show({ text: err, kind: 'err' }); return }
      setStep(2)
    } finally { setLoading(false) }
  }

  async function onFinalizeAndPublish() {
    setLoading(true)
    try {
      const payload = { title: form.title, description: form.description, location: form.location, startDate: form.startDate, startTime: form.startTime, endDate: form.endDate, endTime: form.endTime, capacity: Number(form.capacity || 0) }
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
      if (Array.isArray(tts) && tts.length > 0) {
        const payloads = tts.map((t, i) => {
          const name = String(t.name || '').trim()
          const qty = Number(t.quantity || 0)
          const price = t.paid ? Number(t.price || 0) : 0
          if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return null
          const finalName = name || (t.paid ? `Ingresso Pago ${i+1}` : `Ingresso Grátis ${i+1}`)
          return { name: finalName, price, quantity: qty }
        }).filter(Boolean) as Array<{ name: string; price: number; quantity: number }>
        for (const p of payloads) {
          try { await createTicketType(id, p) }
          catch (e: unknown) { const msg = ticketTypeCreateErrorText(e); show({ text: msg, kind: 'err' }) }
        }
        /* no-op */
      }
      await publishEvent(id)
      show({ text: 'Evento publicado', kind: 'ok' })
      navigate('/') // Go back to home
    } catch (e: unknown) {
      const msg = eventCreateErrorText(e)
      show({ text: msg, kind: 'err' })
    } finally { setLoading(false) }
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
      startTime: form.startTime,
      endDate: form.endDate,
      endTime: form.endTime,
      capacity: form.capacity,
      onTitleChange: (v)=>setForm(f=>({ ...f, title: v })),
      onDescriptionChange: (v)=>setForm(f=>({ ...f, description: v })),
      onLocationChange: (v)=>setForm(f=>({ ...f, location: v })),
      onStartDateChange: (v)=>setForm(f=>({ ...f, startDate: v })),
      onStartTimeChange: (v)=>setForm(f=>({ ...f, startTime: v })),
      onEndDateChange: (v)=>setForm(f=>({ ...f, endDate: v })),
      onEndTimeChange: (v)=>setForm(f=>({ ...f, endTime: v })),
      onCapacityChange: (v)=>setForm(f=>({ ...f, capacity: v })),
      handleImageChange,
      loading,
      user,
      onCancel: () => { navigate('/') },
      onSubmit: () => { onSubmitStep1() },
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
      onChangePrice: (i, price)=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], price }; return copy }),
      onBack: ()=>setStep(1),
      onNext: ()=>setStep(3),
    })
  } else if (step === 3) {
    section = Step3Section({
      tts,
      loading,
      user,
      onBack: ()=>setStep(2),
      onFinalizeAndPublish: () => { void onFinalizeAndPublish() },
    })
  }

  return (
    <div className={styles.page}>
      <Header
        user={user}
        onCreate={() => {}} // Already on create page
        onOpenMyEvents={() => navigate('/?view=my-events')}
        onOpenMyTickets={() => navigate('/?view=my-tickets')}
        onOpenDevices={() => navigate('/?view=devices')}
        onLoginOpen={() => { /* Handle login if needed, or redirect */ }}
        onLogout={() => { /* Handle logout */ }}
        onMakeOrder={() => {}}
        onGoHome={() => navigate('/')}
      />
      
      <main className={styles.container}>
        <h1 className={styles.title}>Criar Novo Evento</h1>
        
        {StepperUI(step)}
        
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
      </main>

      <Footer />
    </div>
  )
}
