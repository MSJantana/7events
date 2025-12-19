import type { User } from '../types'
import { useEffect, useRef, useState } from 'react'
import styles from './header.module.css'

type Props = Readonly<{
  user: User | null
  onCreate: () => void
  onOpenMyEvents: () => void
  onOpenMyTickets: () => void
  onLoginOpen: () => void
  onLogout: () => Promise<void> | void
  onMakeOrder: () => void
}>

export default function Header({
  user,
  onCreate,
  onOpenMyEvents,
  onOpenMyTickets,
  onLoginOpen,
  onLogout,
  onMakeOrder,
}: Props) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement|null>(null)
  useEffect(() => {
    if (!showProfileMenu) return
    const onDown = (e: PointerEvent) => {
      const el = profileRef.current
      if (el && !el.contains(e.target as Node)) setShowProfileMenu(false)
    }
    globalThis.addEventListener('pointerdown', onDown)
    return () => globalThis.removeEventListener('pointerdown', onDown)
  }, [showProfileMenu])

  const now = new Date()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const h = now.getHours()
  const m = now.getMinutes()
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const dateText = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${
    months[now.getMonth()]
  } ${now.getFullYear()}, ${hh}:${mm}`

  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? '')
      .join('') ?? ''

  const handleProfileClick = () => {
    if (user) {
      setShowProfileMenu((v) => !v)
    } else {
      onLoginOpen()
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div className={styles.brand} style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Fundo: quadrado arredondado escuro */}
              <rect x="4" y="4" width="56" height="56" rx="16" fill="#0F172A" />

              {/* Detalhe curvado no topo esquerdo */}
              <path
                d="M16 12 C 20 9.5, 24 8.5, 28 8.5"
                stroke="#38BDF8"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Barras horizontais (estoque/lista) */}
              <rect x="18" y="22" width="20" height="3.5" rx="1.75" fill="#38BDF8" />
              <rect x="18" y="30" width="18" height="3.5" rx="1.75" fill="#22C55E" />
              <rect x="18" y="38" width="14" height="3.5" rx="1.75" fill="#A5B4FC" />

              {/* Número 7 estilizado */}
              <path
                d="M30 18 H44 L36 44"
                fill="none"
                stroke="#F9FAFB"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <svg width="140" height="60" viewBox="0 0 140 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: 60, width: 'auto' }}>
            {/* "EVENTS" em caixa alta, colado no logo */}
            <text
              x="0"
              y="40"
              fontFamily="'Indie Flower', cursive, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              fontSize="32"
              fontWeight="600"
              fill="#111827">
              EVENTS
            </text>
          </svg>
        </div>

        <nav className={styles.nav}>
          <button
            onClick={() => {
              if (user) {
                onCreate()
              } else {
                onLoginOpen()
              }
            }}
            className={styles.link}
          >
            <span className="mi" aria-hidden>add</span>
            <span>Criar evento</span>
          </button>

          <button
            onClick={() => {
              if (user) {
                onOpenMyEvents()
              } else {
                onLoginOpen()
              }
            }}
            className={styles.pill}
          >
            <span className="mi" aria-hidden>event</span>
            <span>Meus eventos</span>
          </button>

          <button
            onClick={() => {
              if (user) {
                onOpenMyTickets()
              } else {
                onLoginOpen()
              }
            }}
            className={styles.link}
          >
            <span className="mi" aria-hidden>confirmation_number</span>
            <span>Meus ingressos</span>
          </button>

          <div className={styles.datePill} aria-hidden>
            <span className="mi">calendar_month</span>
            <span>{dateText}</span>
          </div>

          <button
            onClick={() => {
              if (user) {
                onMakeOrder()
              } else {
                onLoginOpen()
              }
            }}
            className={styles.ctaBtn}
          >
            Comprar Ingresso
          </button>

          <div className={styles.profileWrap} ref={profileRef}>
            <button
              type="button"
              onClick={handleProfileClick}
              aria-label="Perfil / Entrar"
              title={user ? user.name : 'Entrar'}
              className={styles.profileTrigger}
              aria-expanded={user ? showProfileMenu : false}
            >
              <div className={styles.profileAvatar}>
                {user ? (
                  initials || (
                    <span className="mi" aria-hidden>person</span>
                  )
                ) : (
                  <span className="mi" aria-hidden>person</span>
                )}
              </div>

              {user && (
                <>
                  <span className={styles.profileNameText}>{user.name}</span>
                  <span className="mi" aria-hidden>expand_more</span>
                </>
              )}
            </button>

            {user && showProfileMenu && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHead}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div className={styles.dropdownAvatar}><span className="mi" aria-hidden>person</span></div>
                    <div style={{ display:'flex', flexDirection:'column' }}>
                      <div className={styles.dropdownTitle}>{user.name}</div>
                      <div className={styles.dropdownSub}>{user.email || ''}</div>
                    </div>
                  </div>
                </div>
                <div className={styles.dropdownList}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => {
                      setShowProfileMenu(false)
                      onLogout()
                    }}
                  >
                    <span className="mi" aria-hidden>logout</span>
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
