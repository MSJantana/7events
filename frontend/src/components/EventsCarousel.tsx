import { API_URL } from '../services/api'
import type { EventSummary } from '../types'
import styles from './carousel.module.css'
import modalStyles from './modals/modal.module.css'

function thumbUrl(imageUrl?: string | null) {
  if (!imageUrl) return undefined
  
  let url = imageUrl
  if (url.includes('localhost:4000') && !API_URL.includes('localhost:4000')) {
    url = url.replace(/https?:\/\/localhost:4000/, API_URL)
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.endsWith('.webp') ? url.replace(/\.webp$/, '-thumb.webp') : url
  }
  const fullUrl = `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
  return fullUrl.endsWith('.webp') ? fullUrl.replace(/\.webp$/, '-thumb.webp') : fullUrl
}

type Props = {
  events: EventSummary[]
  activeIndex: number
  onSelect: (i: number) => void
  onOpenEvent: (ev: EventSummary) => void | Promise<void>
}

function renderStars(rating: number = 0) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<span key={i} className="mi" style={{ fontSize: 14 }}>star</span>)
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<span key={i} className="mi" style={{ fontSize: 14 }}>star_half</span>)
    } else {
      stars.push(<span key={i} className="mi" style={{ fontSize: 14, color: '#ccc' }}>star_outline</span>) // or just empty star
    }
  }
  return stars
}

export default function EventsCarousel({ events, activeIndex, onSelect, onOpenEvent }: Readonly<Props>) {
  const hasEvents = events.length > 0
  
  const handlePrev = () => {
    const next = activeIndex - 1
    onSelect(next < 0 ? events.length - 1 : next)
  }

  const handleNext = () => {
    const next = activeIndex + 1
    onSelect(next >= events.length ? 0 : next)
  }

  // Formatting helpers
  const fmtPrice = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Calculate transform for the track
  // Card width 310px + 24px gap = 334px
  const CARD_WIDTH_WITH_GAP = 334
  const translateX = -(activeIndex * CARD_WIDTH_WITH_GAP)

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        {hasEvents ? (
          <div className={styles.carouselWrapper}>
            <button className={styles.navButton} onClick={handlePrev} aria-label="Anterior">
              <span className="mi">chevron_left</span>
            </button>
            
            <div className={styles.trackWindow}>
              <div 
                className={styles.track} 
                style={{ transform: `translateX(${translateX}px)` }}
              >
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className={styles.card}
                    onClick={() => onOpenEvent(ev)}
                    aria-label={`Ver oferta ${ev.title}`}
                  >
                    <div className={styles.imageContainer}>
                      {ev.imageUrl ? (
                        <img src={thumbUrl(ev.imageUrl)} alt={ev.title} className={styles.image} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#e0e0e0' }} />
                      )}
                      <div className={styles.badge}>
                        OFERTA<br/>EXCLUSIVA<br/>7EVENTS
                      </div>
                    </div>
                    
                    <div className={styles.infoContainer}>
                      <div className={styles.metaRow}>
                        <div className={styles.location}>
                          <span className="mi" style={{ fontSize: 14 }}>location_on</span>
                          {ev.location}
                        </div>
                        <div className={styles.rating}>
                          <span>{(ev.averageRating || 0).toFixed(1)}</span>
                          {renderStars(ev.averageRating || 0)}
                          <span className={styles.ratingCount}>({ev.reviewCount || 0})</span>
                        </div>
                      </div>
                      
                      <div className={styles.cardTitle} title={ev.title}>
                        {ev.title}
                      </div>
                      
                      <div className={styles.priceRow}>
                        <div className={styles.priceInfo}>
                          {(ev.minPrice || 0) > 0 ? (
                            <>
                              <span className={styles.fromLabel}>A PARTIR DE</span>
                              <span className={styles.currentPrice}>R$ {fmtPrice(ev.minPrice!)}</span>
                            </>
                          ) : (
                            <>
                              <span className={styles.fromLabel}>ENTRADA</span>
                              <span className={styles.currentPrice} style={{ color: '#5c8f3f' }}>GRÁTIS</span>
                            </>
                          )}
                        </div>
                        <div className={styles.buyButton}>
                          {(ev.minPrice || 0) > 0 ? 'COMPRAR' : 'RESGATAR'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button className={styles.navButton} onClick={handleNext} aria-label="Próximo">
              <span className="mi">chevron_right</span>
            </button>
          </div>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center' }}>
             <div className={`${modalStyles.notice} ${modalStyles.noticeInfo}`}>Nenhum evento disponível</div>
          </div>
        )}

        {hasEvents && (
          <div className={styles.dots}>
            {events.map((ev, i) => (
              <button 
                key={ev.id} 
                className={i === activeIndex ? `${styles.dot} ${styles.dotActive}` : styles.dot}
                onClick={() => onSelect(i)}
                aria-label={`Ir para slide ${i + 1}`}
                style={{ border: 'none', padding: 0 }}
              />
            ))}
          </div>
        )}
        
        <div className={styles.footerRow}>
           <button className={styles.viewAllButton} onClick={() => window.scrollTo(0, 0)}>
             VER TODAS
           </button>
        </div>

      </div>
    </section>
  )
}
