export default function Footer() {
  return (
    <footer style={{
      position: 'fixed',
      bottom: 0,
      left: -40,
      width: '100%',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: '16px 32px',
      background: '#fff',
      borderTop: '1px solid #e5e7eb',
      zIndex: 40
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: '#0F172A',
        padding: '12px 20px 12px 12px',
        borderRadius: 24,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Ícone / Logo */}
        <div style={{ display: 'flex' }}>
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="56" height="56" rx="16" fill="#1E293B" />
            <path d="M16 12 C 20 9.5, 24 8.5, 28 8.5" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="18" y="22" width="20" height="3.5" rx="1.75" fill="#38BDF8" />
            <rect x="18" y="30" width="18" height="3.5" rx="1.75" fill="#22C55E" />
            <rect x="18" y="38" width="14" height="3.5" rx="1.75" fill="#A5B4FC" />
            <path d="M30 18 H44 L36 44" fill="none" stroke="#F9FAFB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Textos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F9FAFB', lineHeight: 1 }}>
            <span style={{ color: '#818CF8' }}>7</span> Events
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Gestão inteligente de eventos
          </div>
        </div>
      </div>
    </footer>
  )
}
