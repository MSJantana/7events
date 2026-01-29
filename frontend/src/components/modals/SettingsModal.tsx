import { useEffect, useState } from 'react'
import styles from './modal.module.css'

type Props = {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: Readonly<Props>) {
  const [onlyFree, setOnlyFree] = useState(() => {
    // Default to true if not set
    const val = localStorage.getItem('pref_only_free_tickets')
    return val === null ? true : val === 'true'
  })

  useEffect(() => {
    const handler = () => {
      const val = localStorage.getItem('pref_only_free_tickets')
      setOnlyFree(val === null ? true : val === 'true')
    }
    globalThis.addEventListener('storage', handler)
    return () => globalThis.removeEventListener('storage', handler)
  }, [])

  const handleToggle = () => {
    const newValue = !onlyFree
    setOnlyFree(newValue)
    localStorage.setItem('pref_only_free_tickets', String(newValue))
    // Dispara evento para que outros componentes possam reagir se necessário
    globalThis.dispatchEvent(new Event('storage'))
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} style={{ maxWidth: 440, borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        <div className={styles.header} style={{ borderBottom: '1px solid #f3f4f6', padding: '20px 24px' }}>
          <div className={styles.title} style={{ fontSize: 20, fontWeight: 700 }}>Configurações</div>
          <button 
            onClick={onClose} 
            className={styles.closeBtn}
            style={{ background: '#f3f4f6', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#6b7280' }}
          >
            <span className="mi" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        
        <div className={styles.body} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mi" style={{ color: 'var(--brand)', fontSize: 20 }}>local_activity</span>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>Modo Simplificado</div>
              </div>
              <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.4, maxWidth: 280, marginLeft: 28 }}>
                Habilitar cadastro de ingressos somente grátis. Ideal para eventos sem fins lucrativos.
              </div>
            </div>
            
            <button 
              onClick={handleToggle}
              style={{
                width: 52, height: 28, borderRadius: 99, position: 'relative',
                background: onlyFree ? 'var(--brand)' : '#e5e7eb',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                padding: 0, marginTop: 2, flexShrink: 0,
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
              }}
              role="switch"
              aria-checked={onlyFree}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: onlyFree ? 26 : 2,
                transition: 'left 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)', 
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {onlyFree && <span className="mi" style={{ fontSize: 14, color: 'var(--brand)', fontWeight: 'bold' }}>check</span>}
              </div>
            </button>
          </div>
        </div>

        <div className={styles.footer} style={{ borderTop: '1px solid #f3f4f6', padding: '16px 24px', background: '#fff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <button 
            className={styles.primary} 
            onClick={onClose}
            style={{ width: '100%', padding: '10px', fontSize: 15, fontWeight: 600, borderRadius: 8 }}
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
