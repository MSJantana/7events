import { useEffect, useState, useCallback } from 'react'
import type { Device, EventSummary } from '../types'
import { getDevices, createDevice, deleteDevice } from '../services/devices'
import { getEventsByStatus } from '../services/events'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuth'
import { DeviceForm } from './DeviceForm'
import { DeviceItem } from './DeviceItem'
import { PaginationControls } from './PaginationControls'

// Reusing modal styles partially but adapting for page view
import styles from './modals/modal.module.css'

async function fetchAllData() {
  const [devs, pub, draft, canc, fin] = await Promise.all([
    getDevices(),
    getEventsByStatus('PUBLISHED').catch(() => []),
    getEventsByStatus('DRAFT').catch(() => []),
    getEventsByStatus('CANCELED').catch(() => []),
    getEventsByStatus('FINALIZED').catch(() => [])
  ])
  
  const map = new Map<string, EventSummary>()
  const allEvents = [...pub, ...draft, ...canc, ...fin]
  for (const e of allEvents) map.set(e.id, e)
  
  return {
    devices: devs,
    events: Array.from(map.values())
  }
}

export default function DevicesView() {
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
      const { devices: devs, events: evs } = await fetchAllData()
      setDevices(devs)
      setEvents(evs)
    } catch (e) {
      console.error(e)
      show({ text: 'Falha ao carregar dados', kind: 'err' })
    } finally {
      setLoading(false)
    }
  }, [show])

  // Load Data
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const totalPages = Math.ceil(devices.length / PAGE_SIZE)
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages)
    }
  }, [devices, page])

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

  const renderList = () => {
    if (loading && devices.length === 0) {
      return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
    }

    if (devices.length === 0) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 12 }}>
            Nenhum dispositivo encontrado.
        </div>
      )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {devices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(dev => (
                <DeviceItem 
                  key={dev.id}
                  device={dev}
                  isExpanded={expandedId === dev.id}
                  onToggleExpand={() => setExpandedId(expandedId === dev.id ? null : dev.id)}
                  onDelete={handleDelete}
                  onCopy={copyToClipboard}
                />
            ))}

            {/* Pagination */}
            <PaginationControls 
              page={page} 
              totalPages={Math.ceil(devices.length / PAGE_SIZE)} 
              setPage={setPage} 
            />
        </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Gerenciar Dispositivos</h2>
        <button 
            onClick={loadData}
            title="Atualizar lista"
            disabled={loading}
            style={{ 
              border: 'none', background: 'transparent', cursor: loading ? 'wait' : 'pointer', 
              color: '#6b7280', display: 'flex', alignItems: 'center', opacity: loading ? 0.7 : 1 
            }}>
            <span className={`mi ${loading ? 'spin' : ''}`} style={{ fontSize: 24 }}>refresh</span>
        </button>
      </div>
      
      <div className={styles.body} style={{ padding: 0 }}>
        <DeviceForm 
          newName={newName}
          setNewName={setNewName}
          newEventId={newEventId}
          setNewEventId={setNewEventId}
          events={events}
          creating={creating}
          user={user}
          onCreate={handleCreate}
        />

        {/* List */}
        {renderList()}
      </div>
    </div>
  )
}
