import styles from './modal.module.css'
import { useEffect, useState, useCallback } from 'react'
import type { Device, EventSummary } from '../../types'
import { getDevices, createDevice, deleteDevice } from '../../services/devices'
import { getEventsByStatus } from '../../services/events'
import { useToast } from '../../hooks/useToast'
import { renderNotice, type NoticeStyles } from '../common/Notice'

import { useAuth } from '../../hooks/useAuth'

export default function DevicesModal({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const { user } = useAuth()
  const { show } = useToast()
  const [devices, setDevices] = useState<Device[]>([])
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const PAGE_SIZE = 4
  
  // New Device Form
  const [newName, setNewName] = useState('')
  const [newEventId, setNewEventId] = useState('')
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [devs, pub, draft, canc, fin] = await Promise.all([
        getDevices(),
        getEventsByStatus('PUBLISHED').catch(() => []),
        getEventsByStatus('DRAFT').catch(() => []),
        getEventsByStatus('CANCELED').catch(() => []),
        getEventsByStatus('FINALIZED').catch(() => [])
      ])
      
      setDevices(devs)
      
      // Merge events
      const map = new Map<string, EventSummary>()
      for (const e of pub) map.set(e.id, e)
      for (const e of draft) map.set(e.id, e)
      for (const e of canc) map.set(e.id, e)
      for (const e of fin) map.set(e.id, e)
      setEvents(Array.from(map.values()))

    } catch (e) {
      console.error(e)
      show({ text: 'Falha ao carregar dados', kind: 'err' })
    } finally {
      setLoading(false)
    }
  }, [show])

  // Load Data
  useEffect(() => {
    if (!open) return
    loadData()
  }, [open, loadData])

  useEffect(() => {
    const totalPages = Math.ceil(devices.length / PAGE_SIZE)
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages)
    }
  }, [devices, page])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createDevice({
        name: newName,
        eventId: newEventId || undefined
      })
      show({ text: 'Dispositivo criado!', kind: 'ok' })
      setNewName('')
      setNewEventId('')
      await loadData()
    } catch (e: unknown) {
        console.error(e)
      const msg = (e as { code?: string })?.code || 'Erro ao criar dispositivo'
      show({ text: msg, kind: 'err' })
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este dispositivo?')) return
    try {
      await deleteDevice(id)
      show({ text: 'Dispositivo removido', kind: 'ok' })
      setDevices(list => list.filter(d => d.id !== id))
    } catch (e) {
        console.error(e)
      show({ text: 'Erro ao remover dispositivo', kind: 'err' })
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    show({ text: 'Copiado!', kind: 'ok' })
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <header className={styles.header}>
          <h2>Gerenciar Dispositivos</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </header>
        
        <div className={styles.body}>
            {/* Create Form */}
            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem' }}>Novo Dispositivo</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input 
                        type="text" 
                        placeholder="Nome do Dispositivo" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <select
                        value={newEventId}
                        onChange={e => setNewEventId(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">{user?.role === 'ADMIN' ? '-- Todos os Eventos (Global) --' : '-- Selecione um Evento --'}</option>
                        {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title} ({ev.status})</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleCreate} 
                        disabled={creating || !newName || (user?.role !== 'ADMIN' && !newEventId)}
                        style={{ 
                            padding: '8px 16px', 
                            background: '#007bff', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            opacity: (creating || !newName || (user?.role !== 'ADMIN' && !newEventId)) ? 0.6 : 1
                        }}
                    >
                        {creating ? 'Criando...' : 'Adicionar'}
                    </button>
                </div>
                {user?.role !== 'ADMIN' && !newEventId && (
                    <p style={{ fontSize: '0.85rem', color: '#d32f2f', marginTop: '0.5rem' }}>
                        * Selecione um evento para adicionar o dispositivo.
                    </p>
                )}
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                     {user?.role === 'ADMIN' 
                        ? 'Dispositivos globais funcionam para qualquer evento. Dispositivos vinculados funcionam apenas para o evento específico.'
                        : 'Dispositivos devem ser vinculados a um evento específico.'}
                </p>
            </div>

            {/* List */}
            {loading ? (
                <p>Carregando...</p>
            ) : devices.length === 0 ? (
                renderNotice(styles as unknown as NoticeStyles, 'info', 'Nenhum dispositivo encontrado.')
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {devices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(dev => {
                        const isExpanded = expandedId === dev.id
                        return (
                            <div key={dev.id} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                                {/* Header */}
                                <div 
                                    onClick={() => setExpandedId(isExpanded ? null : dev.id)}
                                    style={{ 
                                        padding: '1rem', 
                                        background: isExpanded ? '#f9f9f9' : 'white', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center' 
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h4 style={{ margin: 0 }}>{dev.name}</h4>
                                        <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                            • {dev.event?.title || 'Global'}
                                        </span>
                                    </div>
                                    <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                        ▼
                                    </span>
                                </div>

                                {/* Body */}
                                {isExpanded && (
                                    <div style={{ padding: '1rem', borderTop: '1px solid #eee' }}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#555' }}>API Key:</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <code style={{ background: '#eee', padding: '6px 8px', borderRadius: '4px', fontSize: '0.9rem', flex: 1, wordBreak: 'break-all' }}>
                                                    {dev.apiKey}
                                                </code>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(dev.apiKey) }}
                                                    style={{ background: 'none', border: '1px solid #007bff', color: '#007bff', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}
                                                >
                                                    Copiar
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(dev.id) }}
                                                style={{ 
                                                    background: '#dc3545', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    padding: '8px 16px', 
                                                    borderRadius: '4px', 
                                                    cursor: 'pointer' 
                                                }}
                                            >
                                                Excluir Dispositivo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Pagination */}
                    {Math.ceil(devices.length / PAGE_SIZE) > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{ padding: '4px 12px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                            >
                                Anterior
                            </button>
                            <span style={{ fontSize: '0.9rem' }}>
                                Página {page} de {Math.ceil(devices.length / PAGE_SIZE)}
                            </span>
                            <button 
                                onClick={() => setPage(p => Math.min(Math.ceil(devices.length / PAGE_SIZE), p + 1))}
                                disabled={page === Math.ceil(devices.length / PAGE_SIZE)}
                                style={{ padding: '4px 12px', cursor: page === Math.ceil(devices.length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: page === Math.ceil(devices.length / PAGE_SIZE) ? 0.5 : 1 }}
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
