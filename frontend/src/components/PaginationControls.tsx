interface PaginationControlsProps {
  readonly page: number
  readonly totalPages: number
  readonly setPage: (page: number | ((p: number) => number)) => void
}

export function PaginationControls({ page, totalPages, setPage }: PaginationControlsProps) {
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
      <button 
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        style={{ padding: '8px 16px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', color: '#374151' }}
      >
        Anterior
      </button>
      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        Página {page} de {totalPages}
      </span>
      <button 
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        style={{ padding: '8px 16px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', color: '#374151' }}
      >
        Próxima
      </button>
    </div>
  )
}
