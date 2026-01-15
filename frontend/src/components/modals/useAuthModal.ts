import { useState } from 'react'
import { API_URL, translateError } from '../../services/api'
import type { User } from '../../types'
import { isValidEmail, isStrongPassword } from '../../utils/validation'

export function useAuthModal(onLoggedIn: (u: User) => void, onClose: () => void) {
  const [showRegister, setShowRegister] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ text: string; kind: 'ok' | 'err' | '' }>({ text: '', kind: '' })

  function resetStatus() {
    setStatus({ text: '', kind: '' })
  }

  function setStatusText(text: string, kind: 'ok' | 'err') {
    setStatus({ text, kind })
  }

  function validateCredentials(): boolean {
    const eOk = isValidEmail(email)
    const pOk = isStrongPassword(password)
    setEmailError(eOk ? '' : 'Email inválido')
    setPasswordError(pOk ? '' : 'Senha deve ter 8+ e incluir maiúscula, minúscula e dígito')
    return eOk && pOk
  }

  async function performLogin(): Promise<{ ok: boolean; error?: string }> {
    const r = await fetch(`${API_URL}/auth/local/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password })
    })
    if (r.ok) return { ok: true }
    type LoginErrorBody = { error?: string }
    const j: LoginErrorBody = await r.json().catch(() => ({ }))
    return { ok: false, error: j.error ?? 'Falha ao entrar' }
  }

  async function performRegister(): Promise<{ ok: boolean; error?: string }> {
    const r = await fetch(`${API_URL}/auth/local/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, name, password })
    })
    if (r.ok) return { ok: true }
    type Err = { error?: string }
    const j: Err = await r.json().catch(() => ({}))
    return { ok: false, error: j.error ?? 'Falha ao registrar' }
  }

  async function onLocalLogin() {
    resetStatus()
    if (!validateCredentials()) { setStatusText('Corrija os campos', 'err'); return }
    setLoading(true)
    try {
      const res = await performLogin()
      if (!res.ok) { setStatusText(translateError(res.error || 'local_login_failed'), 'err'); return }
      const u = await loadWhoami()
      if (u) { onLoggedIn(u); onClose() }
      setStatusText('Logado', 'ok')
    } catch {
      setStatusText('Erro de rede', 'err')
    } finally { setLoading(false) }
  }

  async function onLocalRegister() {
    resetStatus()
    const eOk = isValidEmail(email)
    const pOk = isStrongPassword(password)
    const nOk = !!name
    setEmailError(eOk ? '' : 'Email inválido')
    setPasswordError(pOk ? '' : 'Senha deve ter 8+ e incluir maiúscula, minúscula e dígito')
    setNameError(nOk ? '' : 'Nome obrigatório')
    if (!(eOk && pOk && nOk)) { setStatusText('Corrija os campos', 'err'); return }
    
    setLoading(true)
    try {
      const reg = await performRegister()
      if (!reg.ok) {
        setStatusText(translateError(reg.error || 'local_register_failed'), 'err')
        return
      }
      const log = await performLogin()
      if (!log.ok) {
        setStatusText(translateError(log.error || 'local_login_failed'), 'err')
        return
      }
      const u = await loadWhoami()
      if (u) { onLoggedIn(u); onClose() }
      setStatusText('Conta criada e logado', 'ok')
    } catch {
      setStatusText('Erro de rede', 'err')
    } finally { setLoading(false) }
  }

  return {
    showRegister, setShowRegister,
    name, setName, nameError,
    email, setEmail, emailError,
    password, setPassword, passwordError,
    showPass, setShowPass,
    loading, status,
    onLocalLogin, onLocalRegister
  }
}

async function loadWhoami(): Promise<User | null> {
  const w = await fetch(`${API_URL}/auth/whoami`, { credentials: 'include' })
  if (!w.ok) return null
  type WhoamiBody = { accessToken?: string; user?: { id: string; name: string; email?: string; role: User['role']; eventsCount?: number } }
  const j: WhoamiBody = await w.json()
  if (j?.accessToken) {
    try { globalThis.localStorage.setItem('access_token', j.accessToken) } catch { void 0 }
  }
  if (j?.user) return { id: j.user.id, name: j.user.name, email: j.user.email, role: j.user.role, eventsCount: j.user.eventsCount }
  return null
}
