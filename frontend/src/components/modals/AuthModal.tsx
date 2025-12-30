import { useEffect } from 'react'
import { API_URL } from '../../services/api'
import type { User } from '../../types'
import styles from './modal.module.css'
import { useAuthModal } from './useAuthModal'

type Props = {
  open: boolean
  onClose: () => void
  onLoggedIn: (u: User) => void
  buySlug?: string
  buyId?: string
}

export default function AuthModal({ open, onClose, onLoggedIn, buySlug, buyId }: Readonly<Props>) {
  const {
    showRegister, setShowRegister,
    name, setName, nameError,
    email, setEmail, emailError,
    password, setPassword, passwordError,
    showPass, setShowPass,
    loading, status,
    onLocalLogin, onLocalRegister
  } = useAuthModal(onLoggedIn, onClose)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const queryState = buyId ? ('?state=' + encodeURIComponent('buyId:' + buyId)) : (buySlug ? ('?state=' + encodeURIComponent('buy:' + buySlug)) : '')
  const googleHref = `${API_URL}/auth/google${queryState}`

  return (
    <div className={styles.overlay} onPointerDown={(e)=>{ if (e.currentTarget===e.target) onClose() }}>
      <div className={styles.modal} style={{ maxWidth: 420, width: '95%', padding: '30px 24px', borderRadius: 24 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom: 24 }}>
          <img src="/brand-7events.svg" alt="Seven Events" style={{ height: 60, marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8, textAlign:'center' }}>Que bom ter você aqui!</div>
          <div style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
            Acesse sua conta para gerenciar seus eventos e ingressos.
          </div>
        </div>

        <div className={styles.section} style={{ padding: 0, gap: 16 }}>

          {status.text && (
            <div className={`${styles.notice} ${status.kind==='ok' ? styles.noticeOk : styles.noticeErr}`}>
              <span aria-hidden>{status.kind==='ok' ? '✅' : '⛔'}</span>
              <span>{status.text}</span>
            </div>
          )}

          <a href={googleHref} onClick={() => sessionStorage.setItem('auth_pending', 'true')} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'12px', borderRadius:99, border:'1px solid #e5e7eb', background:'#f3f4f6', color: '#1f2937', textDecoration:'none', fontWeight:600, fontSize: 14 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6s4.1 9.2 9.2 9.2c5.3 0 8.7-3.7 8.7-9 0-.6-.1-1.1-.2-1.6H12z"/>
              <path fill="#34A853" d="M3.1 7.3l3.2 2.3C7.1 7.1 9.3 5.6 12 5.6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 8 2.4 4.6 4.7 3.1 7.3z" opacity="0"/>
              <path fill="#4285F4" d="M21.9 12c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2 5.3 0 8.7-3.7 8.7-9z"/>
              <path fill="#FBBC05" d="M6.1 14.4c-.3-.8-.5-1.6-.5-2.5s.2-1.7.5-2.5L2.9 7.1C2.3 8.3 2 9.6 2 11s.3 2.7.9 3.9l3.2-2.5z"/>
              <path fill="#34A853" d="M12 20.8c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.8.5-1.9.9-3.3.9-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2z"/>
            </svg>
            Continuar com Google
          </a>

          <div style={{ display:'flex', alignItems:'center', gap:10, color:'#9ca3af', fontSize:12 }}>
            <div style={{ flex:1, height:1, background:'#e5e7eb' }}></div>
            Ou entre com seu email
            <div style={{ flex:1, height:1, background:'#e5e7eb' }}></div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {showRegister && (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label htmlFor="name" style={{ fontSize:14, fontWeight:500, color: '#374151' }}>Nome</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Digite seu nome" style={{ border:'1px solid #d1d5db', borderRadius:99, padding:'12px 16px', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' }} />
                {nameError && <div className={`${styles.notice} ${styles.noticeErr}`}>{nameError}</div>}
              </div>
            )}
            
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label htmlFor="email" style={{ fontSize:14, fontWeight:500, color: '#374151' }}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Digite seu email" style={{ border:'1px solid #d1d5db', borderRadius:99, padding:'12px 16px', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' }} />
              {emailError && <div className={`${styles.notice} ${styles.noticeErr}`}>{emailError}</div>}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label htmlFor="password" style={{ fontSize:14, fontWeight:500, color: '#374151' }}>Senha</label>
              <div style={{ position:'relative' }}>
                <input value={password} onChange={e=>setPassword(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="Digite sua senha" style={{ border:'1px solid #d1d5db', borderRadius:99, padding:'12px 16px', fontSize:14, outline:'none', width:'100%', paddingRight: 40, boxSizing:'border-box' }} />
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', color: '#6b7280', cursor:'pointer' }}>
                  <span className="mi" style={{ fontSize: 20 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {passwordError && <div className={`${styles.notice} ${styles.noticeErr}`}>{passwordError}</div>}
              {!showRegister && <div style={{ alignSelf:'flex-end', fontSize:12, fontWeight:700, color:'#111827', cursor:'pointer' }}>Esqueceu a senha?</div>}
            </div>

            <div className={styles.actions}>
              {showRegister ? (
                <button disabled={loading} onClick={onLocalRegister} style={{ width:'100%', border:'none', background: '#000000', color:'#fff', borderRadius:99, padding:'14px', fontWeight:700, fontSize:16, cursor: loading?'not-allowed':'pointer', opacity: loading?0.7:1 }}>{loading ? 'Cadastrando...' : 'Cadastrar'}</button>
              ) : (
                <button disabled={loading} onClick={onLocalLogin} style={{ width:'100%', border:'none', background: '#000000', color:'#fff', borderRadius:99, padding:'14px', fontWeight:700, fontSize:16, cursor: loading?'not-allowed':'pointer', opacity: loading?0.7:1 }}>{loading ? 'Entrando...' : 'Entrar'}</button>
              )}
            </div>

            <div style={{ fontSize:13, color: '#374151', textAlign:'center', marginTop: 8 }}>
              {showRegister ? "Já tem uma conta? " : "Não tem uma conta? "}
              <button type="button" onClick={() => setShowRegister(v=>!v)} style={{ background:'transparent', border:'none', color: '#000000', textDecoration:'none', fontWeight:800, cursor:'pointer' }}>{showRegister ? 'Entrar' : 'Cadastre-se'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
