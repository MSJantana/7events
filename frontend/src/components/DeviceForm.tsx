import type { EventSummary, User } from '../types'

interface DeviceFormProps {
  readonly newName: string
  readonly setNewName: (name: string) => void
  readonly newEventId: string
  readonly setNewEventId: (id: string) => void
  readonly events: readonly EventSummary[]
  readonly creating: boolean
  readonly user: User | null
  readonly onCreate: () => void
}

export function DeviceForm({ 
  newName, 
  setNewName, 
  newEventId, 
  setNewEventId, 
  events, 
  creating, 
  user, 
  onCreate 
}: DeviceFormProps) {
  return (
    <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ marginBottom: '1rem', marginTop: 0, fontSize: '1.25rem', color: '#111827' }}>Novo Dispositivo</h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Nome do Dispositivo" 
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
        />
        <select
          value={newEventId}
          onChange={e => setNewEventId(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white' }}
        >
          <option value="">{user?.role === 'ADMIN' ? '-- Todos os Eventos (Global) --' : '-- Selecione um Evento --'}</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id} disabled={ev.status === 'FINALIZED' || ev.status === 'CANCELED'}>
              {ev.title} ({ev.status})
            </option>
          ))}
        </select>
        <button 
          onClick={onCreate} 
          disabled={creating || !newName || (user?.role !== 'ADMIN' && !newEventId)}
          style={{ 
            padding: '10px 20px', 
            background: '#2563eb', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: 600,
            opacity: (creating || !newName || (user?.role !== 'ADMIN' && !newEventId)) ? 0.6 : 1,
            whiteSpace: 'nowrap'
          }}
        >
          {creating ? 'Criando...' : 'Adicionar'}
        </button>
      </div>
      {user?.role !== 'ADMIN' && !newEventId && (
        <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.75rem', marginBottom: 0 }}>
          * Selecione um evento para adicionar o dispositivo.
        </p>
      )}
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.75rem', marginBottom: 0 }}>
        {user?.role === 'ADMIN' 
          ? 'Dispositivos globais funcionam para qualquer evento. Dispositivos vinculados funcionam apenas para o evento específico.'
          : 'Dispositivos devem ser vinculados a um evento específico.'}
      </p>
    </div>
  )
}
