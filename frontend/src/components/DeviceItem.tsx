import type { Device } from '../types'

interface DeviceItemProps {
  readonly device: Device
  readonly isExpanded: boolean
  readonly onToggleExpand: () => void
  readonly onDelete: (id: string) => void
  readonly onCopy: (text: string) => void
}

export function DeviceItem({ 
  device, 
  isExpanded, 
  onToggleExpand, 
  onDelete, 
  onCopy 
}: DeviceItemProps) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <button 
        type="button"
        onClick={onToggleExpand}
        style={{ 
          padding: '1.25rem', 
          background: isExpanded ? '#f9fafb' : 'white', 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          border: 'none',
          width: '100%',
          textAlign: 'left',
          font: 'inherit',
          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '1.125rem', color: '#111827' }}>{device.name}</h4>
          <span style={{ fontSize: '0.875rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '9999px' }}>
            {device.event?.title || 'Global'}
          </span>
        </div>
        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#9ca3af' }}>
          ▼
        </span>
      </button>

      {/* Body */}
      {isExpanded && (
        <div style={{ padding: '1.25rem', background: 'white' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>API Key:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ background: '#f3f4f6', padding: '10px 12px', borderRadius: '6px', fontSize: '0.875rem', flex: 1, wordBreak: 'break-all', fontFamily: 'monospace', color: '#111827', border: '1px solid #e5e7eb' }}>
                {device.apiKey}
              </code>
              <button 
                onClick={(e) => { e.stopPropagation(); onCopy(device.apiKey) }}
                style={{ background: 'white', border: '1px solid #d1d5db', color: '#374151', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer', fontWeight: 500 }}
              >
                Copiar
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(device.id) }}
              style={{ 
                background: '#fee2e2', 
                color: '#dc2626', 
                border: '1px solid #fecaca', 
                padding: '8px 16px', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Excluir Dispositivo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
