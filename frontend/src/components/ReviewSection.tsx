import { useState } from 'react'
import { API_URL, fetchJSON } from '../services/api'
import { useAuth } from '../hooks/useAuth'

type Props = {
  eventId: string
  averageRating?: number
  reviewCount?: number
  onReviewSubmitted?: (newAvg: number, newCount: number) => void
}

export default function ReviewSection({ eventId, averageRating = 0, reviewCount = 0, onReviewSubmitted }: Readonly<Props>) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0) // User's selected rating
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')

  async function submitReview() {
    if (!user) return
    if (rating === 0) {
      setMsg('Selecione uma nota')
      setMsgType('err')
      return
    }

    setLoading(true)
    setMsg('')
    try {
      const res = await fetchJSON<{ averageRating: number; reviewCount: number }>(`${API_URL}/events/${eventId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      })
      
      setMsg('Avaliação enviada com sucesso!')
      setMsgType('ok')
      setComment('')
      // Update parent if provided
      if (onReviewSubmitted && res) {
        onReviewSubmitted(res.averageRating, res.reviewCount)
      }
    } catch {
      setMsg('Erro ao enviar avaliação')
      setMsgType('err')
    } finally {
      setLoading(false)
    }
  }

  function getStarIcon(i: number, current: number, interactive: boolean) {
    if (interactive) {
      return i <= (hoverRating || rating) ? 'star' : 'star_outline'
    }
    if (i <= current) return 'star'
    if (i - 0.5 <= current) return 'star_half'
    return 'star_outline'
  }

  function renderStars(current: number, interactive: boolean) {
    return Array.from({ length: 5 }, (_, k) => k + 1).map(i => {
      const icon = getStarIcon(i, current, interactive)
      
      if (interactive) {
        return (
          <button
            key={i}
            type="button"
            className="mi"
            style={{ 
              fontSize: 24, 
              cursor: 'pointer',
              color: i <= (hoverRating || rating) ? '#fbbf24' : '#d1d5db',
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              lineHeight: 1
            }}
            onMouseEnter={() => setHoverRating(i)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(i)}
            aria-label={`${i} estrelas`}
          >
            {icon}
          </button>
        )
      }

      return (
        <span 
          key={i} 
          className="mi" 
          style={{ 
            fontSize: 18, 
            cursor: 'default',
            color: '#fbbf24'
          }}
        >
          {icon}
        </span>
      )
    })
  }

  return (
    <div style={{ marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#111827' }}>Avaliações</div>
      
      {/* Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderStars(averageRating, false)}
        </div>
        <span style={{ fontSize: 14, color: '#4b5563' }}>
          {averageRating.toFixed(1)} ({reviewCount} avaliações)
        </span>
      </div>

      {/* Submission Form */}
      {user ? (
        <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8 }}>
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Sua avaliação</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {renderStars(rating, true)}
          </div>
          
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Escreva um comentário (opcional)"
            style={{ 
              width: '100%', 
              minHeight: 60, 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #d1d5db',
              marginBottom: 12,
              fontFamily: 'inherit'
            }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={submitReview}
              disabled={loading}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '6px 16px',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              {loading ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
            
            {msg && (
              <span style={{ fontSize: 13, color: msgType === 'ok' ? '#059669' : '#dc2626' }}>
                {msg}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>
          Faça login para avaliar este evento.
        </div>
      )}
    </div>
  )
}
