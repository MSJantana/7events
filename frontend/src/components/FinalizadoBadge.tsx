import { palette } from '../theme/palette'
import type { EventStatus } from '../types'
import type { CSSProperties } from 'react'
import { useExpired } from '../hooks/useExpired'

type Props = { startDate?: string; status?: EventStatus; style?: CSSProperties; className?: string }

export default function FinalizadoBadge({ startDate, status, style, className }: Props) {
  const expired = useExpired(startDate, status)
  if (!expired) return null
  return (
    <span
      className={className}
      style={{ fontSize:12, padding:'4px 8px', borderRadius:999, border:`1px solid ${palette.border}`, background:'#fee2e2', color:'#b91c1c', fontWeight:700, ...style }}
    >
      Finalizado
    </span>
  )
}
