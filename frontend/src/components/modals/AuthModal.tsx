import { useEffect, useState } from 'react'
import { API_URL, translateError } from '../../services/api'
import type { User } from '../../types'
import { isValidEmail, isStrongPassword } from '../../utils/validation'
import styles from './modal.module.css'

type Props = {
  open: boolean
  onClose: () => void
  onLoggedIn: (u: User) => void
}

export default function AuthModal({ open, onClose, onLoggedIn }: Readonly<Props>) {
  const [showEmailForm, setShowEmailForm] = useState(false)
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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

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
  async function loadWhoami(): Promise<User | null> {
    const w = await fetch(`${API_URL}/auth/whoami`, { credentials: 'include' })
    if (!w.ok) return null
    type WhoamiBody = { accessToken?: string; user?: { id: string; name: string; email?: string; role: User['role'] } }
    const j: WhoamiBody = await w.json()
    if (j?.accessToken) {
      try { globalThis.localStorage.setItem('access_token', j.accessToken) } catch { void 0 }
    }
    if (j?.user) return { id: j.user.id, name: j.user.name, email: j.user.email, role: j.user.role }
    return null
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
      const r = await fetch(`${API_URL}/auth/local/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, name, password })
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setStatusText(translateError(j?.error || 'local_register_failed'), 'err')
        return
      }
      const login = await fetch(`${API_URL}/auth/local/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password })
      })
      if (!login.ok) {
        const je = await login.json().catch(() => ({}))
        setStatusText(translateError(je?.error || 'local_login_failed'), 'err')
        return
      }
      const u = await loadWhoami()
      if (u) { onLoggedIn(u); onClose() }
      setStatusText('Conta criada e logado', 'ok')
    } catch {
      setStatusText('Erro de rede', 'err')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Entrar</div>
          <button className={styles.close} onClick={onClose}><span className="mi">close</span></button>
        </div>
        <div className={styles.section}>

        {status.text && (
          <div className={`${styles.notice} ${status.kind==='ok' ? styles.noticeOk : styles.noticeErr}`} style={{ marginBottom: 10 }}>
            <span aria-hidden>{status.kind==='ok' ? '✅' : '⛔'}</span>
            <span>{status.text}</span>
          </div>
        )}

        <a href={`${API_URL}/auth/google`} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, textAlign:'center', padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'#ffffff', color: 'var(--text)', textDecoration:'none', fontWeight:700 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6s4.1 9.2 9.2 9.2c5.3 0 8.7-3.7 8.7-9 0-.6-.1-1.1-.2-1.6H12z"/>
            <path fill="#34A853" d="M3.1 7.3l3.2 2.3C7.1 7.1 9.3 5.6 12 5.6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 8 2.4 4.6 4.7 3.1 7.3z" opacity="0"/>
            <path fill="#4285F4" d="M21.9 12c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2 5.3 0 8.7-3.7 8.7-9z"/>
            <path fill="#FBBC05" d="M6.1 14.4c-.3-.8-.5-1.6-.5-2.5s.2-1.7.5-2.5L2.9 7.1C2.3 8.3 2 9.6 2 11s.3 2.7.9 3.9l3.2-2.5z"/>
            <path fill="#34A853" d="M12 20.8c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.8.5-1.9.9-3.3.9-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2z"/>
          </svg>
          Continuar com Google
        </a>

        <button onClick={() => setShowEmailForm(v=>!v)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, textAlign:'center', padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'#ffffff', color: 'var(--text)', textDecoration:'none', fontWeight:700 }}>Continuar com Email</button>
        {showEmailForm && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {showRegister && (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label htmlFor="name" style={{ fontSize:12, color: 'var(--gray)' }}>Nome</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" style={{ border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px' }} />
                {nameError && <div className={`${styles.notice} ${styles.noticeErr}`}>{nameError}</div>}
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label htmlFor="email" style={{ fontSize:12, color: 'var(--gray)' }}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" style={{ border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px' }} />
              {emailError && <div className={`${styles.notice} ${styles.noticeErr}`}>{emailError}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label htmlFor="password" style={{ fontSize:12, color: 'var(--gray)' }}>Senha</label>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input value={password} onChange={e=>setPassword(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="••••••••" style={{ border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', flex:1 }} />
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ border:'none', background:'#fff', color: 'var(--gray)', cursor:'pointer' }}>{showPass ? 'Ocultar' : 'Mostrar'}</button>
              </div>
              {passwordError && <div className={`${styles.notice} ${styles.noticeErr}`}>{passwordError}</div>}
            </div>
            <div className={styles.actions}>
              {showRegister ? (
                <button disabled={loading} onClick={onLocalRegister} style={{ border:'none', background: 'var(--brand)', color:'#fff', borderRadius:8, padding:'10px 12px', fontWeight:700 }}>{loading ? 'Cadastrando...' : 'Cadastrar'}</button>
              ) : (
                <button disabled={loading} onClick={onLocalLogin} style={{ border:'none', background: 'var(--brand)', color:'#fff', borderRadius:8, padding:'10px 12px', fontWeight:700 }}>{loading ? 'Entrando...' : 'Entrar'}</button>
              )}
            </div>
            <div style={{ fontSize:12, color: 'var(--gray)', textAlign:'center' }}>Não possui uma conta? <button type="button" onClick={() => setShowRegister(true)} style={{ background:'transparent', border:'none', color: 'var(--brand)', textDecoration:'none', fontWeight:700, cursor:'pointer' }}>Cadastre-se</button></div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
