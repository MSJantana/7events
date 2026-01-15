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
  const palette = toast?.kind === 'err'
    ? { accent: '#dc2626', icon: '✕' as const }
    : toast?.kind === 'warn'
      ? { accent: '#f59e0b', icon: '!' as const }
      : { accent: '#16a34a', icon: '✓' as const }
  return (
    <ToastCtx.Provider value={ctxValue}>
      {children}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              background: '#f3f4f6',
              borderRadius: 4,
              boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
              border: '1px solid #d1d5db',
              minWidth: 260,
              maxWidth: 360,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: 56,
                background: palette.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ color: '#ffffff', fontSize: 24 }}>{palette.icon}</span>
            </div>
            <div
              style={{
                position: 'relative',
                padding: '10px 12px 10px 12px',
                flex: 1
              }}
            >
              <button
                type="button"
                onClick={hide}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#6b7280',
                  padding: 0,
                  lineHeight: 1
                }}
                aria-label="Fechar alerta"
              >
                ×
              </button>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 4
                }}
              >
                Alerta
              </div>
              <div style={{ fontSize: 13, color: '#111827' }}>{toast.text}</div>
              {Array.isArray(toast.actions) && toast.actions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                  {toast.actions.map((a) => {
                    let bg = '#ffffff'
                    let fg = '#111827'
                    if (a.kind === 'danger') { bg = '#b91c1c'; fg = '#ffffff' }
                    else if (a.kind === 'primary') { bg = '#2563eb'; fg = '#ffffff' }
                    return (
                      <button
                        key={`${a.label}-${a.kind || 'ghost'}`}
                        onClick={() => { Promise.resolve(a.onClick()).finally(() => setToast(prev => prev === toast ? null : prev)) }}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 13,
                          cursor: 'pointer',
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
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}
