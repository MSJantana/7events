import FinalizadoBadge from '../components/FinalizadoBadge'
import modalStyles from './modals/modal.module.css'
import { fmtDateLine } from '../utils/format'
import styles from './carousel.module.css'

function fmtCityUF(s?: string) {
  const str = String(s || '').trim()
  if (!str) return ''
  const mDash = /^(.+?)\s*[-–]\s*([A-Za-z]{2})$/.exec(str)
  if (mDash) return `${mDash[1].trim()} - ${mDash[2].toUpperCase()}`
  const mSlash = /^(.+?)\s*\/\s*([A-Za-z]{2})$/.exec(str)
  if (mSlash) return `${mSlash[1].trim()} - ${mSlash[2].toUpperCase()}`
  const mComma = /^(.+?),\s*([A-Za-z]{2})$/.exec(str)
  if (mComma) return `${mComma[1].trim()} - ${mComma[2].toUpperCase()}`
  const tokens = str.split(/\s+/)
  const last = tokens.at(-1)
  if (last && /^[A-Za-z]{2}$/.test(last)) return `${tokens.slice(0, -1).join(' ')} - ${last.toUpperCase()}`
  return str
}

function bgForIndex(i: number) {
  const colors = ['#ef4444', '#0ea5e9', '#22c55e', '#f59e0b']
  return colors[i] ?? '#8b5cf6'
}

function thumbUrl(imageUrl?: string | null) {
  if (!imageUrl) return undefined
  return imageUrl.endsWith('.webp') ? imageUrl.replace(/\.webp$/, '-thumb.webp') : imageUrl
}

function computeTransform(offset: number) {
  const tx = offset * 220
  let ry: number
  if (offset === 0) {
    ry = 0
  } else if (offset < 0) {
    ry = 25
  } else {
    ry = -25
  }
  const tz = offset === 0 ? 60 : 0
  const scale = offset === 0 ? 1 : 0.9
  const z = offset === 0 ? 3 : 2 - Math.abs(offset)
  return { tx, ry, tz, scale, z }
}

function computeCardStyle(ev: Ev, offset: number, bg: string) {
  const { tx, ry, tz, scale, z } = computeTransform(offset)
  const tUrl = thumbUrl(ev.imageUrl)
  return {
    background: ev.imageUrl ? 'transparent' : bg,
    backgroundImage: ev.imageUrl ? `url(${tUrl})` : undefined,
    backgroundSize: ev.imageUrl ? 'cover' : undefined,
    backgroundPosition: ev.imageUrl ? 'center' : undefined,
    boxShadow: offset === 0 ? '0 20px 40px rgba(0,0,0,0.25)' : '0 8px 20px rgba(0,0,0,0.14)',
    transform: `translateX(-50%) translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) scale(${scale})`,
    zIndex: z,
  } as const
}

function dotClass(i: number, activeIndex: number, stylesObj: typeof styles) {
  return i === activeIndex ? `${stylesObj.dot} ${stylesObj.dotActive}` : stylesObj.dot
}

type Ev = {
  id: string
  title: string
  location: string
  startDate: string
  endDate: string
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'FINALIZED'
  imageUrl?: string | null
}

type Props = {
  events: Ev[]
  activeIndex: number
  onSelect: (i: number) => void
  onOpenEvent: (ev: Ev) => void | Promise<void>
}

export default function EventsCarousel({ events, activeIndex, onSelect, onOpenEvent }: Readonly<Props>) {

  const hasEvents = events.length > 0

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* PALCO 3D */}
        <div className={styles.stage}>
          {hasEvents ? (
            events.map((ev, i) => {
              const offset = i - activeIndex
              const style = computeCardStyle(ev, offset, bgForIndex(i))
              return (
                <button
                  key={ev.id}
                  type="button"
                  aria-label={`Abrir ${ev.title}`}
                  onMouseEnter={() => onSelect(i)}
                  onFocus={() => onSelect(i)}
                  onClick={() => onOpenEvent(ev)}
                  className={styles.card}
                  style={style}
                />
              )
            })
          ) : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div className={`${modalStyles.notice} ${modalStyles.noticeInfo}`}>Nenhum evento publicado</div>
            </div>
          )}
        </div>

        {hasEvents && (
          <>
            {/* Dots */}
            <div className={styles.dots} aria-hidden>
              {events.map((ev, i) => (
                <span key={ev.id} className={dotClass(i, activeIndex, styles)} />
              ))}
            </div>

            {/* Título + badge */}
            <div className={styles.titleRow}>
              <div className={styles.title}>
                {events[activeIndex]?.title || ''}
              </div>
              <FinalizadoBadge
                endDate={events[activeIndex]?.endDate}
                status={events[activeIndex]?.status}
              />
            </div>

            {/* Local + data */}
            <div className={styles.info}>
              <div className={styles.sub}>
                <span className="mi" aria-hidden>location_on</span>
                <span>{fmtCityUF(events[activeIndex]?.location || '')}</span>
              </div>
              <div className={styles.sub}>
                <span className="mi" aria-hidden>calendar_month</span>
                <span>{fmtDateLine(events[activeIndex]?.startDate)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
