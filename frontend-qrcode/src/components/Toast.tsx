import { useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { ToastCtx, type Toast } from '../context/toast'

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const show = useCallback((t: Toast) => {
    setToast(t)
    const hasActions = Array.isArray(t.actions) && t.actions.length > 0
    const ms = typeof t.duration === 'number' ? t.duration : 4000
    if (!hasActions && ms > 0) {
      setTimeout(() => setToast(null), ms)
    }
  }, [])

  const hide = useCallback(() => {
    setToast(null)
  }, [])

  const ctxValue = useMemo(() => ({ show, hide }), [show, hide])

  const getToastStyles = (kind?: 'ok' | 'err' | 'warn') => {
    switch (kind) {
      case 'err':
        return {
          container: 'bg-red-50 border-red-100',
          icon: 'bg-red-100 text-red-600',
          title: 'text-red-800',
          text: 'text-red-700',
          iconSvg: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      case 'warn':
        return {
          container: 'bg-yellow-50 border-yellow-100',
          icon: 'bg-yellow-100 text-yellow-600',
          title: 'text-yellow-800',
          text: 'text-yellow-700',
          iconSvg: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        }
      case 'ok':
      default:
        return {
          container: 'bg-green-50 border-green-100',
          icon: 'bg-green-100 text-green-600',
          title: 'text-green-800',
          text: 'text-green-700',
          iconSvg: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        }
    }
  }

  const getActionStyles = (kind?: 'primary' | 'ghost' | 'danger') => {
    switch (kind) {
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700'
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700'
      default:
        return 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
    }
  }

  const getToastTitle = (kind?: 'ok' | 'err' | 'warn') => {
    switch (kind) {
      case 'err':
        return 'Erro'
      case 'warn':
        return 'Atenção'
      case 'ok':
      default:
        return 'Sucesso'
    }
  }

  const styles = toast ? getToastStyles(toast.kind) : null

  return (
    <ToastCtx.Provider value={ctxValue}>
      {children}
      {toast && styles && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-fade-in">
          <div className={`rounded-xl shadow-lg border p-4 flex gap-4 ${styles.container}`}>
            <div className={`p-2 rounded-full shrink-0 ${styles.icon}`}>
              {styles.iconSvg}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className={`font-semibold ${styles.title}`}>
                  {getToastTitle(toast.kind)}
                </h3>
                <button
                  onClick={hide}
                  className={`text-sm hover:opacity-70 transition-opacity ${styles.text}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className={`mt-1 text-sm ${styles.text}`}>
                {toast.text}
              </p>

              {Array.isArray(toast.actions) && toast.actions.length > 0 && (
                <div className="mt-4 flex gap-2 justify-end">
                  {toast.actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        Promise.resolve(action.onClick()).finally(() => {
                          setToast(null)
                        })
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${getActionStyles(action.kind)}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}
