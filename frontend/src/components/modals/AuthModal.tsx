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

  const getQueryState = () => {
    if (buyId) return '?state=' + encodeURIComponent('buyId:' + buyId)
    if (buySlug) return '?state=' + encodeURIComponent('buy:' + buySlug)
    return ''
  }

  const queryState = getQueryState()
  const googleHref = `${API_URL}/auth/google${queryState}`

  return (
    <div className={styles.overlay} onPointerDown={(e)=>{ if (e.currentTarget===e.target) onClose() }}>
      <div className={styles.modal} style={{ maxWidth: 420, width: '95%', padding: '30px 24px', borderRadius: 24 }}>
        <Header />
        <div className={styles.section} style={{ padding: 0, gap: 16 }}>
          {status.text && <StatusNotice status={status} />}
          <GoogleButton href={googleHref} />
          <Divider />
          <LocalAuthForm
            showRegister={showRegister} setShowRegister={setShowRegister}
            name={name} setName={setName} nameError={nameError}
            email={email} setEmail={setEmail} emailError={emailError}
            password={password} setPassword={setPassword} passwordError={passwordError}
            showPass={showPass} setShowPass={setShowPass}
            loading={loading}
            onLogin={onLocalLogin} onRegister={onLocalRegister}
          />
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom: 24 }}>
      <img src="/brand-7events.svg" alt="Seven Events" style={{ height: 60, marginBottom: 16 }} />
      <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8, textAlign:'center' }}>Que bom ter você aqui!</div>
      <div style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
        Acesse sua conta para gerenciar seus eventos e ingressos.
      </div>
    </div>
  )
}

function StatusNotice({ status }: Readonly<{ status: { text: string; kind: 'ok'|'err'|'' } }>) {
  return (
    <div className={`${styles.notice} ${status.kind==='ok' ? styles.noticeOk : styles.noticeErr}`}>
      <span aria-hidden>{status.kind==='ok' ? '✅' : '⛔'}</span>
      <span>{status.text}</span>
    </div>
  )
}

function GoogleButton({ href }: Readonly<{ href: string }>) {
  return (
    <a href={href} onClick={() => sessionStorage.setItem('auth_pending', 'true')} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'12px', borderRadius:99, border:'1px solid #e5e7eb', background:'#f3f4f6', color: '#1f2937', textDecoration:'none', fontWeight:600, fontSize: 14 }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6s4.1 9.2 9.2 9.2c5.3 0 8.7-3.7 8.7-9 0-.6-.1-1.1-.2-1.6H12z"/>
        <path fill="#34A853" d="M3.1 7.3l3.2 2.3C7.1 7.1 9.3 5.6 12 5.6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 8 2.4 4.6 4.7 3.1 7.3z" opacity="0"/>
        <path fill="#4285F4" d="M21.9 12c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.2 1.2-1.3 3.6-5.5 3.6-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2 5.3 0 8.7-3.7 8.7-9z"/>
        <path fill="#FBBC05" d="M6.1 14.4c-.3-.8-.5-1.6-.5-2.5s.2-1.7.5-2.5L2.9 7.1C2.3 8.3 2 9.6 2 11s.3 2.7.9 3.9l3.2-2.5z"/>
        <path fill="#34A853" d="M12 20.8c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.8.5-1.9.9-3.3.9-2.8 0-5.2-1.9-5.9-4.5l-3.2 2.4c1.5 3.1 4.7 5.2 8.4 5.2z"/>
      </svg>
      Continuar com Google
    </a>
  )
}

function Divider() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, color:'#9ca3af', fontSize:12 }}>
      <div style={{ flex:1, height:1, background:'#e5e7eb' }}></div>
      Ou entre com seu email
      <div style={{ flex:1, height:1, background:'#e5e7eb' }}></div>
    </div>
  )
}

type LocalAuthFormProps = {
  showRegister: boolean; setShowRegister: React.Dispatch<React.SetStateAction<boolean>>
  name: string; setName: (s:string)=>void; nameError: string
  email: string; setEmail: (s:string)=>void; emailError: string
  password: string; setPassword: (s:string)=>void; passwordError: string
  showPass: boolean; setShowPass: React.Dispatch<React.SetStateAction<boolean>>
  loading: boolean
  onLogin: () => void; onRegister: () => void
}

function LocalAuthForm(p: Readonly<LocalAuthFormProps>) {
  const action = p.showRegister ? 'Cadastrar' : 'Entrar'
  const actionIng = p.showRegister ? 'Cadastrando...' : 'Entrando...'
  const label = p.loading ? actionIng : action

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {p.showRegister && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label htmlFor="name" style={{ fontSize:14, fontWeight:500, color: '#374151' }}>Nome</label>
          <input value={p.name} onChange={e=>p.setName(e.target.value)} placeholder="Digite seu nome" style={{ border:'1px solid #d1d5db', borderRadius:99, padding:'12px 16px', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' }} />
          {p.nameError && <div className={`${styles.notice} ${styles.noticeErr}`}>{p.nameError}</div>}
        </div>
      )}
      
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        <label htmlFor="email" style={{ fontSize:14, fontWeight:500, color: '#374151' }}>Email</label>
        <input value={p.email} onChange={e=>p.setEmail(e.target.value)} placeholder="Digite seu email" style={{ border:'1px solid #d1d5db', borderRadius:99, padding:'12px 16px', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' }} />
        {p.emailError && <div className={`${styles.notice} ${styles.noticeErr}`}>{p.emailError}</div>}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        <label htmlFor="password" style={{ fontSize:14, fontWeight:500, color: '#374151' }}>Senha</label>
        <div style={{ position:'relative' }}>
          <input value={p.password} onChange={e=>p.setPassword(e.target.value)} type={p.showPass ? 'text' : 'password'} placeholder="Digite sua senha" style={{ border:'1px solid #d1d5db', borderRadius:99, padding:'12px 16px', fontSize:14, outline:'none', width:'100%', paddingRight: 40, boxSizing:'border-box' }} />
          <button type="button" onClick={()=>p.setShowPass(v=>!v)} style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', color: '#6b7280', cursor:'pointer' }}>
            <span className="mi" style={{ fontSize: 20 }}>{p.showPass ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
        {p.passwordError && <div className={`${styles.notice} ${styles.noticeErr}`}>{p.passwordError}</div>}
        {!p.showRegister && <div style={{ alignSelf:'flex-end', fontSize:12, fontWeight:700, color:'#111827', cursor:'pointer' }}>Esqueceu a senha?</div>}
      </div>

      <div className={styles.actions}>
        <button disabled={p.loading} onClick={p.showRegister ? p.onRegister : p.onLogin} style={{ width:'100%', border:'none', background: '#000000', color:'#fff', borderRadius:99, padding:'14px', fontWeight:700, fontSize:16, cursor: p.loading?'not-allowed':'pointer', opacity: p.loading?0.7:1 }}>
          {label}
        </button>
      </div>

      <div style={{ fontSize:13, color: '#374151', textAlign:'center', marginTop: 8 }}>
        {p.showRegister ? "Já tem uma conta? " : "Não tem uma conta? "}
        <button type="button" onClick={() => p.setShowRegister(v=>!v)} style={{ background:'transparent', border:'none', color: '#000000', textDecoration:'none', fontWeight:800, cursor:'pointer' }}>{p.showRegister ? 'Entrar' : 'Cadastre-se'}</button>
      </div>
    </div>
  )
}
