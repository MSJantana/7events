import { useEffect, useState } from 'react'
import styles from './modal.module.css'

type Props = {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: Readonly<Props>) {
  const [onlyFree, setOnlyFree] = useState(() => {
    return localStorage.getItem('pref_only_free_tickets') === 'true'
  })

  useEffect(() => {
    const handler = () => {
      setOnlyFree(localStorage.getItem('pref_only_free_tickets') === 'true')
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
      <div className={styles.modal} style={{ maxWidth: 400 }}>
        <div className={styles.header}>
          <div className={styles.title}>Configurações</div>
          <button onClick={onClose} className={styles.closeBtn}><span className="mi">close</span></button>
        </div>
        
        <div className={styles.body}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>Modo Simplificado</div>
              <div style={{ fontSize: 13, color: 'var(--gray)' }}>Habilitar cadastro de ingressos somente grátis</div>
            </div>
            
            <button 
              onClick={handleToggle}
              style={{
                width: 56, height: 26, borderRadius: 99, position: 'relative',
                background: onlyFree ? 'var(--brand)' : '#e5e7eb',
                border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                padding: 0
              }}
              role="switch"
              aria-checked={onlyFree}
            >
              <span style={{
                position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)',
                fontSize: 10, fontWeight: 700, color: '#fff',
                opacity: onlyFree ? 1 : 0, transition: 'opacity 0.2s'
              }}>ON</span>
              
              <span style={{
                position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                fontSize: 10, fontWeight: 700, color: '#6b7280',
                opacity: onlyFree ? 0 : 1, transition: 'opacity 0.2s'
              }}>OFF</span>

              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: onlyFree ? 33 : 3,
                transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                zIndex: 2
              }} />
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={onClose}>Concluído</button>
        </div>
      </div>
    </div>
  )
}
