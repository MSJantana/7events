import type { EventSummary } from '../types'
import styles from './finalized-events.module.css'
import { fmtEventDuration } from '../utils/format'

type Props = {
  events: EventSummary[]
  onOpenEvent: (ev: EventSummary) => void
}

function thumbUrl(imageUrl?: string | null) {
  if (!imageUrl) return undefined
  return imageUrl.endsWith('.webp') ? imageUrl.replace(/\.webp$/, '-thumb.webp') : imageUrl
}

export default function FinalizedEventsRow({ events, onOpenEvent }: Readonly<Props>) {
  if (!events || events.length === 0) return null

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Eventos Finalizados</h2>
      </div>
      <div className={styles.scrollArea}>
        {events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            className={styles.card}
            onClick={() => onOpenEvent(ev)}
          >
            <div className={styles.imageContainer}>
              {ev.imageUrl ? (
                <img src={thumbUrl(ev.imageUrl)} alt={ev.title} className={styles.image} loading="lazy" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#e5e7eb' }} />
              )}
            </div>
            <div className={styles.content}>
              <h3 className={styles.cardTitle} title={ev.title}>{ev.title}</h3>
              <p className={styles.location} title={ev.location}>{ev.location}</p>
              <p className={styles.date}>{fmtEventDuration(ev.startDate, ev.endDate)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
