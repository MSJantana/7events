import { useContext } from 'react'
import { ToastCtx } from '../context/toast'

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}

