import React from 'react'

export function SevenEventsLogo({ size = 48, showText = true }: { size?: number; showText?: boolean }) {
  const scale = size / 48

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 * scale }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      {showText && (
        <svg width={140 * scale} height={60 * scale} viewBox="0 0 140 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: 60 * scale, width: 'auto' }}>
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
      )}
    </div>
  )
}
