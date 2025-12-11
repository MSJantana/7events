import { useEffect, useMemo, useState, type ReactNode } from 'react'
import FinalizadoBadge from '../components/FinalizadoBadge'
import { useExpired } from '../hooks/useExpired'
import { useNavigate, useParams } from 'react-router-dom'
import { fmtMoneyBRL, fmtDate } from '../utils/format'
import type { EventDetail } from '../types'
import { useAuth } from '../hooks/useAuth'
import modalStyles from '../components/modals/modal.module.css'

function toTitleFromSlug(slug: string) {
  return slug.replaceAll('-', ' ').replaceAll(/\b\w/g, s => s.toUpperCase())
}

function hasTicketTypes(data: EventDetail | null) {
  return Array.isArray(data?.ticketTypes) && data.ticketTypes.length > 0
}

function canBuyTickets(data: EventDetail | null, expired: boolean) {
  return !expired && Array.isArray(data?.ticketTypes) && data.ticketTypes.some(tt => Number(tt.quantity || 0) > 0)
}

function soldOutTickets(data: EventDetail | null, expired: boolean, hasTT: boolean) {
  return !expired && hasTT && !!data?.ticketTypes && data.ticketTypes.every(tt => Number(tt.quantity || 0) <= 0)
}

async function fetchEvent(API: string, slug: string) {
  const r = await fetch(`${API}/events/slug/${slug}`)
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j?.error || 'not_found')
  }
  const j = await r.json()
  return j as EventDetail
}

function EventMeta({ data }: { readonly data: EventDetail | null }) {
  return (
    <div style={{ display: 'flex', gap: 24, color: '#374151' }}>
      <div>📍 {data?.location}</div>
      <div>📅 {data ? fmtDate(data.startDate) : ''}</div>
      <div>💲 {data ? fmtMoneyBRL(data.minPrice) : ''}</div>
    </div>
  )
}

function BuyControls({ canBuy, soldOut, hasTT, onBuyClick }: { readonly canBuy: boolean; readonly soldOut: boolean; readonly hasTT: boolean; readonly onBuyClick: () => void }) {
  return (
    <div style={{ marginTop: 12, display:'flex', alignItems:'center', gap:12 }}>
      {hasTT ? (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ffffff', border:'1px solid #e5e7eb', borderRadius:12, padding:'8px 12px', color:'#0b1220', fontWeight:700 }}>
          <span aria-hidden>💲</span>
          <span>Ingressos disponíveis</span>
        </div>
      ) : null}
      <button type="button" disabled={!canBuy} onClick={onBuyClick} style={{ border:'none', background: canBuy ? '#16a34a' : '#9ca3af', color:'#ffffff', padding:'10px 16px', borderRadius:12, cursor: canBuy ? 'pointer' : 'not-allowed', boxShadow: canBuy ? '0 10px 20px rgba(22,163,74,0.35)' : 'none', fontWeight:800 }}>
        Comprar ingressos
      </button>
      {!canBuy && soldOut && (
        <div className={`${modalStyles.notice} ${modalStyles.noticeErr}`} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          <span aria-hidden>⛔</span>
          <span>Ingressos Esgotados</span>
        </div>
      )}
    </div>
  )
}

export default function EventDetails() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const API = useMemo(() => (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000', [])
  const title = useMemo(() => toTitleFromSlug(slug), [slug])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<EventDetail | null>(null)

  useEffect(() => {
    let cancelled = false
    setTimeout(() => { if (!cancelled) { setLoading(true); setError('') } }, 0)
    fetchEvent(API, slug)
      .then(j => { if (!cancelled) setData(j) })
      .catch(e => { const msg = e instanceof Error ? e.message : 'Falha ao carregar'; if (!cancelled) setError(msg) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [API, slug])


  const expired = useExpired(data?.endDate, data?.status)
  const hasTT = hasTicketTypes(data)
  const canBuy = canBuyTickets(data, expired)
  const soldOut = soldOutTickets(data, expired, hasTT)
  function onBuyClick(){
    const id = data?.id || ''
    if (!user) {
      navigate(id ? `/login?buyId=${encodeURIComponent(id)}` : `/login?buy=${encodeURIComponent(slug)}`)
      return
    }
    navigate(id ? `/?buyId=${encodeURIComponent(id)}` : `/?buy=${encodeURIComponent(slug)}`)
  }

  let content: ReactNode
  if (loading) {
    content = <div className={`${modalStyles.notice} ${modalStyles.noticeInfo}`}>Carregando...</div>
  } else if (error) {
    content = <div className={`${modalStyles.notice} ${modalStyles.noticeErr}`}>Erro: {error}</div>
  } else if (data) {
    content = (
      <>
        <EventMeta data={data} />
        <BuyControls canBuy={canBuy} soldOut={soldOut} hasTT={hasTT} onBuyClick={onBuyClick} />
        {expired ? (
          <div className={`${modalStyles.notice} ${modalStyles.noticeInfo}`} style={{ marginTop: 12 }}>Evento finalizado — ingressos indisponíveis</div>
        ) : null}
        <div style={{ marginTop: 16, color: '#6b7280' }}>Descrição do evento e ações (comprar, compartilhar) podem ser adicionadas aqui.</div>
      </>
    )
  } else {
    content = null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8', padding: 24 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 24 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>← Voltar</button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <h1 style={{ fontSize: 28, margin: '12px 0', color: '#111827' }}>{title}</h1>
          <FinalizadoBadge endDate={data?.endDate} />
        </div>
        {content}
      </div>
    </div>
  )
}
