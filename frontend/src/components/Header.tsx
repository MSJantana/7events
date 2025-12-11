import type { User } from '../types'
import { useState } from 'react'
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

  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const h = now.getHours()
  const m = now.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = String(((h % 12) || 12)).padStart(1, '0')
  const mm = String(m).padStart(2, '0')
  const dateText = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${
    months[now.getMonth()]
  } ${now.getFullYear()} at ${hh}:${mm}${ampm}`

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={styles.brand}>Seven Events</div>
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

          <div className={styles.profileWrap}>
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
