import { createContext } from 'react'

export type Toast = {
  text: string
  kind: 'ok' | 'err'
  actions?: Array<{ label: string; onClick: () => void | Promise<void>; kind?: 'primary' | 'ghost' | 'danger' }>
  duration?: number
}
export const ToastCtx = createContext<{ show: (t: Toast) => void; hide: () => void } | null>(null)
