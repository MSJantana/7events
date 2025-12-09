import { useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { ToastCtx } from '../context/toast'
import type { Toast } from '../context/toast'

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const show = useCallback((t: Toast) => {
    setToast(t)
    const hasActions = Array.isArray(t.actions) && t.actions.length > 0
    const ms = typeof t.duration === 'number' ? t.duration : 2500
    if (!hasActions && ms > 0) setTimeout(() => setToast(null), ms)
  }, [])
  const hide = useCallback(() => { setToast(null) }, [])
  const ctxValue = useMemo(() => ({ show, hide }), [show, hide])
  return (
    <ToastCtx.Provider value={ctxValue}>
      {children}
      {toast && (
        <div style={{ position:'fixed', top:16, right:16, background: toast.kind==='err' ? '#fee2e2' : '#dcfce7', color: toast.kind==='err' ? '#b91c1c' : '#065f46', borderRadius:12, padding:'10px 14px', boxShadow:'0 12px 28px rgba(0,0,0,0.18)', border:`1px solid ${toast.kind==='err' ? '#fecaca' : '#a7f3d0'}`, zIndex:60 }}>
          <div>{toast.text}</div>
          {Array.isArray(toast.actions) && toast.actions.length > 0 && (
            <div style={{ display:'flex', gap:8, marginTop:10, justifyContent:'flex-end' }}>
              {toast.actions.map((a) => {
                let bg = '#ffffff'
                let fg = 'var(--text)'
                if (a.kind === 'danger') { bg = '#b91c1c'; fg = '#ffffff' }
                else if (a.kind === 'primary') { bg = '#2563eb'; fg = '#ffffff' }
                return (
                  <button
                    key={`${a.label}-${a.kind || 'ghost'}`}
                    onClick={() => { Promise.resolve(a.onClick()).finally(() => hide()) }}
                    style={{
                      border:'1px solid #e5e7eb',
                      borderRadius:8,
                      padding:'6px 10px',
                      fontSize:13,
                      cursor:'pointer',
                      background: bg,
                      color: fg
                    }}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  )
}
