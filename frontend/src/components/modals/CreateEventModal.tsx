import styles from './modal.module.css'
import type { User } from '../../types'
import { useEffect, useState } from 'react'
import { createEvent, uploadEventImage, createTicketType, publishEvent } from '../../services/events'
import { useToast } from '../../hooks/useToast'
import { api } from '../../services/api'

type Props = { open: boolean; onClose: () => void; user: User | null; onCreated?: (id: string) => void }

export default function CreateEventModal({ open, onClose, user, onCreated }: Props) {
  const { show } = useToast()
  const [form, setForm] = useState({ title: '', description: '', location: '', startDate: '', endDate: '', capacity: '0' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imgCfg, setImgCfg] = useState<{ uploadMaxMB: number; allowedMimes: string[]; minWidth: number; minHeight: number; mainMaxWidth: number } | null>(null)
  const [tts, setTts] = useState<Array<{ name: string; paid: boolean; price: string; quantity: string }>>([])
  const [step, setStep] = useState<1 | 2 | 3>(1)
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
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

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
          const o = e as Record<string, unknown>
          const d = String((o?.details as string) || (o?.message as string) || '')
          const c = d.toLowerCase()
          let msg = 'Falha no upload de imagem'
          if (c.includes('low_resolution')) msg = 'Imagem muito pequena (mín 600x400)'
          else if (c.includes('invalid_mime')) msg = 'Formato inválido (use PNG/JPEG/WebP)'
          else if (c.includes('invalid_signature')) msg = 'Arquivo inválido ou corrompido'
          else if (c.includes('file_required')) msg = 'Selecione uma imagem'
          else if (c.includes('limit_file_size')) msg = `Imagem muito grande${imgCfg?.uploadMaxMB ? ` (máx ${imgCfg.uploadMaxMB} MB)` : ''}`
          show({ text: msg, kind: 'err' })
        }
      }
      show({ text: 'Evento criado', kind: 'ok' })
      setStep(2)
    } catch { show({ text: 'Falha ao criar evento', kind: 'err' }) }
    finally { setLoading(false) }
  }

  async function onFinalize() {
    if (!createdEventId) { show({ text: 'Evento não criado', kind: 'err' }); return }
    if (!ticketsSaved && Array.isArray(tts) && tts.length > 0) {
      setLoading(true)
      try {
        const created: string[] = []
        for (const [i, t] of tts.entries()) {
          const name = String(t.name || '').trim()
          const qty = Number(t.quantity || 0)
          const price = t.paid ? Number(t.price || 0) : 0
          if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) continue
          try {
            const finalName = name || (t.paid ? `Ingresso Pago ${i+1}` : `Ingresso Grátis ${i+1}`)
            const j = await createTicketType(createdEventId, { name: finalName, price, quantity: qty })
            created.push(String(j?.id || ''))
          } catch {
            show({ text: 'Falha ao criar ingresso', kind: 'err' })
          }
        }
        if (created.length > 0) { show({ text: 'Ingressos criados', kind: 'ok' }); setTicketsSaved(true) }
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
    } catch {
      show({ text: 'Falha ao publicar evento', kind: 'err' })
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>      
        <div className={styles.stepper}>
          <div className={styles.stepGroup}>
            <span className={`${styles.stepIconCircle} ${step===1 ? styles.stepIconActive : step>1 ? styles.stepIconDone : styles.stepIconInactive}`} aria-hidden><span className="mi">calendar_month</span></span>
            <span className={`${styles.stepLabel} ${step===1 ? styles.stepLabelActive : ''}`}>{step === 1 ? '1' : step>1 ? '✓' : '1'} Criar evento</span>
          </div>
          <span className={styles.stepConnector} aria-hidden></span>
          <div className={styles.stepGroup}>
            <span className={`${styles.stepIconCircle} ${step===2 ? styles.stepIconActive : step>2 ? styles.stepIconDone : styles.stepIconInactive}`} aria-hidden><span className="mi">confirmation_number</span></span>
            <span className={`${styles.stepLabel} ${step===2 ? styles.stepLabelActive : ''}`}>{step === 2 ? '2' : step > 2 ? '✓' : '2'} Adicionar ingresso</span>
          </div>
          <span className={styles.stepConnector} aria-hidden></span>
          <div className={styles.stepGroup}>
            <span className={`${styles.stepIconCircle} ${step===3 ? styles.stepIconActive : styles.stepIconInactive}`} aria-hidden><span className="mi">rocket_launch</span></span>
            <span className={`${styles.stepLabel} ${step===3 ? styles.stepLabelActive : ''}`}>{step === 3 ? '3' : '3'} Finalizar</span>
          </div>
        </div>
        <div className={styles.section}>
          <div className={styles.content}>
            <div className={styles.card}>
          {step === 1 && (
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width: 140, height: 94, border:'1px solid #e5e7eb', borderRadius:12, background:'#f3f4f6', backgroundImage: preview ? `url(${preview})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <input
              type="file"
              accept="image/*"
              onChange={e=>{
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
              }}
            />
          </div>
          )}
          {step === 1 && (
          <div style={{ fontSize:12, color:'#6b7280', marginTop:6 }}>
            {imgCfg ? `Máx ${imgCfg.uploadMaxMB} MB, mín ${imgCfg.minWidth}x${imgCfg.minHeight}, formatos PNG/JPEG/WebP` : `Mín 600x400, formatos PNG/JPEG/WebP`}
          </div>
          )}
          {step === 1 && (
            <>
              <div className={styles.field}><label htmlFor="title" className={styles.label}>Título</label><input id="title" className={styles.input} value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} /></div>
              <div className={styles.field}><label htmlFor="description" className={styles.label}>Descrição</label><textarea id="description" className={styles.input} value={form.description} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} /></div>
              <div className={styles.field}><label htmlFor="location" className={styles.label}>Local</label><input id="location" className={styles.input} value={form.location} onChange={e=>setForm(f=>({ ...f, location: e.target.value }))} /></div>
              <div className={styles.row}>
                <div className={`${styles.field} ${styles.col}`}><label htmlFor="startDate" className={styles.label}>Início</label><input id="startDate" className={styles.inputSm} type="date" placeholder="dd/mm/aaaa" value={form.startDate} onChange={e=>setForm(f=>({ ...f, startDate: e.target.value }))} /></div>
                <div className={`${styles.field} ${styles.col}`}><label htmlFor="endDate" className={styles.label}>Fim</label><input id="endDate" className={styles.inputSm} type="date" placeholder="dd/mm/aaaa" value={form.endDate} onChange={e=>setForm(f=>({ ...f, endDate: e.target.value }))} /></div>
                <div className={styles.field} style={{ flex:'0 0 120px' }}><label htmlFor="capacity" className={styles.label}>Capacidade</label><input id="capacity" className={styles.inputSm} type="number" min={0} placeholder="0" value={form.capacity} onChange={e=>setForm(f=>({ ...f, capacity: e.target.value }))} /></div>
              </div>
              <div className={styles.actions}>
                <button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}>Cancelar</button>
                <button disabled={loading || !user} className={`${styles.btn} ${styles.primary}`} onClick={onSubmit}>{loading ? 'Criando...' : 'Continuar'}</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
                <div className={styles.sectionTitle}><span aria-hidden>🎟️</span><span>Ingressos</span></div>
                {tts.map((t, i) => (
                  <div key={i} className={styles.item}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <select value={t.paid ? 'paid' : 'free'} onChange={e=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], paid: e.target.value==='paid' }; if (e.target.value!=='paid') copy[i].price = '0'; return copy })} className={styles.input} style={{ flex:'1 1 140px' }}>
                        <option value="free">Grátis</option>
                        <option value="paid">Pago</option>
                      </select>
                      <select value={t.quantity} onChange={e=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], quantity: e.target.value }; return copy })} className={styles.input} style={{ flex:'1 1 140px' }}>
                        {Array.from({ length: 50 }).map((_, q)=> (
                          <option key={q+1} value={String(q+1)}>{q+1}</option>
                        ))}
                      </select>
                      <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={()=>setTts(list=>list.filter((_, idx)=> idx!==i))}>Remover</button>
                    </div>
                    {t.paid && (
                      <div className={styles.summaryBox} style={{ marginTop:8 }}>
                        <div className={styles.summaryRow}>
                          <span>Valor unitário</span>
                          <input placeholder="R$ 0,00" type="number" min={0} step="0.01" value={t.price} onChange={e=>setTts(list=>{ const copy = list.slice(); copy[i] = { ...copy[i], price: e.target.value }; return copy })} className={styles.inputSm} style={{ width:120 }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div>
                  <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={()=>setTts(list=>[...list, { name:'', paid:false, price:'0', quantity:'1' }])}>Adicionar ingresso</button>
                </div>
              </div>
              <div className={styles.actions}>
                <button className={`${styles.btn} ${styles.ghost}`} onClick={()=>setStep(1)}>Voltar</button>
                <button className={`${styles.btn} ${styles.primary}`} onClick={()=>setStep(3)}>Avançar</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#111827' }}>Resumo</div>
                <div style={{ color:'#6b7280' }}>Evento criado. Finalize para salvar os ingressos.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {tts.map((t, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span aria-hidden>🎟️</span>
                      <span style={{ color:'#6b7280' }}>{t.paid ? `Pago — R$ ${Number(t.price||0).toFixed(2)}` : 'Grátis'}</span>
                      <span style={{ color:'#6b7280' }}>Qtd: {t.quantity || '0'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.actions} style={{ marginTop:8 }}>
                <button className={`${styles.btn} ${styles.ghost}`} onClick={()=>setStep(2)}>Voltar</button>
                <button disabled={loading || !user} className={`${styles.btn} ${styles.primary}`} onClick={onFinalize}>{loading ? 'Salvando...' : 'Finalizar'}</button>
                <button disabled={loading || !user} className={`${styles.btn} ${styles.primary}`} onClick={onFinalizeAndPublish}>{loading ? '...' : 'Finalizar e publicar'}</button>
              </div>
            </>
          )}
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
