// palette removida: usamos variáveis CSS
import { useEffect } from 'react'
import styles from './modal.module.css'
import { isValidEmail, isStrongPassword } from '../../utils/validation'

type Props = {
  open: boolean
  API: string
  buySlug?: string
  email: string
  password: string
  emailError: string
  passwordError: string
  showPass: boolean
  loading: boolean
  status: { text: string; kind: 'ok' | 'err' | '' }
  onClose: () => void
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  setEmailError: (v: string) => void
  setPasswordError: (v: string) => void
  setShowPass: (v: boolean) => void
  onLocalLogin: () => Promise<void> | void
}

export default function LoginModal({ open, API, buySlug, email, password, emailError, passwordError, showPass, loading, status, onClose, setEmail, setPassword, setEmailError, setPasswordError, setShowPass, onLocalLogin }: Readonly<Props>) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const queryState = buySlug ? ('?state=' + encodeURIComponent(buySlug)) : ''
  const googleHref = `${API}/auth/google${queryState}`
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Que bom ter você aqui!</div>
          <button className={styles.close} onClick={onClose}><span className="mi">close</span></button>
        </div>
        <div className={styles.section}>
          <a href={googleHref} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, textAlign:'center', padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'#ffffff', color: 'var(--text)', textDecoration:'none', fontWeight:700 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6s4.1 9.2 9.2 9.2c5.3 0 8.7-3.7 8.7-9 0-.6-.1-1.1-.2-1.6H12z"/>
              <path fill="#34A853" d="M3.1 7.3l3.2 2.3C7.1 7.1 9.3 5.6 12 5.6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 8 2.4 4.6 4.7 3.1 7.3z" opacity="0"/>
              <path fill="#4285F4" d="M21.9 12c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2 5.3 0 8.7-3.7 8.7-9z"/>
              <path fill="#FBBC05" d="M6.1 14.4c-.3-.8-.5-1.6-.5-2.5s.2-1.7.5-2.5L2.9 7.1C2.3 8.3 2 9.6 2 11s.3 2.7.9 3.9l3.2-2.5z"/>
              <path fill="#34A853" d="M12 20.8c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.8.5-1.9.9-3.3.9-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2z"/>
            </svg>
            Continuar com Google
          </a>

          <button onClick={() => setShowPass(!showPass)} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, textAlign:'center', padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'#ffffff', color: 'var(--text)', textDecoration:'none', fontWeight:700 }}>Continuar com Email</button>
          {showPass && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span style={{ fontSize:14, color: 'var(--text)', fontWeight:600 }}>Email</span>
                    <input value={email} onChange={(e) => { const v=e.target.value; setEmail(v); let err=''; if (v) { if (!isValidEmail(v)) { err='Email inválido' } } setEmailError(err) }} inputMode="email" placeholder="seu@email.com" pattern="[^\s@]+@[^\s@]+\.[^\s@]+" disabled={loading} style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', fontSize:14 }} />
                {emailError && <span className={`${styles.notice} ${styles.noticeErr}`}>{emailError}</span>}
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span style={{ fontSize:14, color: 'var(--text)', fontWeight:600 }}>Senha</span>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input value={password} onChange={(e) => { const v=e.target.value; setPassword(v); let err=''; if (v) { if (!isStrongPassword(v)) { err='Senha deve ter 8+ e incluir maiúscula, minúscula e dígito' } } setPasswordError(err) }} type={showPass ? 'text' : 'password'} placeholder="••••••••" minLength={8} disabled={loading} style={{ flex:1, padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', fontSize:14 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} disabled={loading} style={{ padding:'10px 12px', borderRadius:12, border:'1px solid var(--border)', background:'#fff', color:'var(--text)', fontWeight:600 }}>{showPass? 'Ocultar' : 'Mostrar'}</button>
                </div>
                {passwordError && <span className={`${styles.notice} ${styles.noticeErr}`}>{passwordError}</span>}
              </label>
              <div className={styles.actions}>
                <button onClick={onLocalLogin} disabled={loading || !!emailError || !!passwordError || !email || !password} style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--black)', background: 'var(--black)', color:'#fff', fontWeight:700, letterSpacing:0.2, opacity:(loading || !!emailError || !!passwordError || !email || !password) ? 0.7 : 1 }}>{loading ? 'Entrando...' : 'Login Local'}</button>
              </div>
              {status.text && (
                <div className={`${styles.notice} ${status.kind==='ok' ? styles.noticeOk : styles.noticeErr}`}>
                  <span aria-hidden>{status.kind==='ok' ? '✅' : '⛔'}</span>
                  <span>{status.text}</span>
                </div>
              )}
            </div>
          )}
          <div style={{ fontSize:12, color: 'var(--gray)', textAlign:'center' }}>Não possui uma conta? <button type="button" onClick={() => setShowPass(true)} style={{ background:'transparent', border:'none', color: 'var(--brand)', textDecoration:'none', fontWeight:700, cursor:'pointer' }}>Cadastre-se</button></div>
        </div>
      </div>
    </div>
  )
}
