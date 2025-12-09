import styles from './modal.module.css'
import { useEffect, useState } from 'react'
import { updateEventBasic, uploadEventImage, getEventById } from '../../services/events'
import { useToast } from '../../hooks/useToast'
import { api } from '../../services/api'

type Props = { open: boolean; onClose: () => void; eventId?: string; initial?: { title: string; location: string; startDate: string; endDate: string; description: string }; currentImageUrl?: string | null; onUpdated?: (patch: { id: string; imageUrl?: string | null; thumbUrl?: string | null }) => void }

export default function EditEventModal({ open, onClose, eventId, initial, currentImageUrl, onUpdated }: Props) {
  const { show } = useToast()
  const [form, setForm] = useState(initial || { title: '', location: '', startDate: '', endDate: '', description: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imgCfg, setImgCfg] = useState<{ uploadMaxMB: number; allowedMimes: string[]; minWidth: number; minHeight: number; mainMaxWidth: number } | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(currentImageUrl || null)
  const [loading, setLoading] = useState(false)

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
      } catch { setForm(f => f) }
      finally { setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [open, eventId])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function onSave() {
    try {
      if (eventId) {
        await updateEventBasic(eventId, form)
        if (file) {
          try {
            const r = await uploadEventImage(eventId, file)
            show({ text: 'Imagem atualizada', kind: 'ok' })
            onUpdated?.({ id: eventId, imageUrl: r?.imageUrl || null, thumbUrl: r?.thumbUrl || null })
          } catch (e: unknown) {
            const o = e as Record<string, unknown>
            const d = String((o?.details as string) || (o?.message as string) || '')
            const c = d.toLowerCase()
            let msg = 'Falha no upload'
            if (c.includes('low_resolution')) msg = 'Imagem muito pequena (mín 600x400)'
            else if (c.includes('invalid_mime')) msg = 'Formato inválido (use PNG/JPEG/WebP)'
            else if (c.includes('invalid_signature')) msg = 'Arquivo inválido ou corrompido'
            else if (c.includes('file_required')) msg = 'Selecione uma imagem'
            else if (c.includes('limit_file_size')) msg = `Imagem muito grande${imgCfg?.uploadMaxMB ? ` (máx ${imgCfg.uploadMaxMB} MB)` : ''}`
            show({ text: msg, kind: 'err' })
          }
        }
        show({ text: 'Evento atualizado', kind: 'ok' })
        onClose()
      }
    }
    catch { show({ text: 'Falha ao atualizar', kind: 'err' }) }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>     
        <div className={styles.section}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width: 140, height: 94, border:'1px solid #e5e7eb', borderRadius:12, background:'#f3f4f6', backgroundImage: (preview ? `url(${preview})` : (existingImageUrl ? `url(${existingImageUrl.endsWith('.webp') ? existingImageUrl.replace(/\.webp$/, '-thumb.webp') : existingImageUrl})` : undefined)), backgroundSize: 'cover', backgroundPosition: 'center' }} />
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
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div className={styles.field}><label className={styles.label} htmlFor="edit-event-title">Título</label><input id="edit-event-title" className={styles.inputSm} value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} disabled={loading} /></div>
            <div className={styles.field}><label className={styles.label} htmlFor="edit-event-location">Local</label><input id="edit-event-location" className={styles.inputSm} value={form.location} onChange={e=>setForm(f=>({ ...f, location: e.target.value }))} disabled={loading} /></div>
            <div className={styles.row}>
              <div className={`${styles.field} ${styles.col}`}><label className={styles.label} htmlFor="edit-event-start-date">Início</label><input id="edit-event-start-date" className={styles.inputSm} type="date" value={form.startDate} onChange={e=>setForm(f=>({ ...f, startDate: e.target.value }))} disabled={loading} /></div>
              <div className={`${styles.field} ${styles.col}`}><label className={styles.label} htmlFor="edit-event-end-date">Fim</label><input id="edit-event-end-date" className={styles.inputSm} type="date" value={form.endDate} onChange={e=>setForm(f=>({ ...f, endDate: e.target.value }))} disabled={loading} /></div>
            </div>
            <div className={styles.field}><label className={styles.label} htmlFor="edit-event-description">Descrição</label><textarea id="edit-event-description" className={styles.inputSm} rows={3} value={form.description} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} disabled={loading} /></div>
          </div>
          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}>Cancelar</button>
            <button className={`${styles.btn} ${styles.primary}`} onClick={onSave}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
