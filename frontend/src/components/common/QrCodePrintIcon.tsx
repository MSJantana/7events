export function QrCodePrintIcon({
  width = 22,
  height = 22,
  color = '#111827',
  className
}: {
  readonly width?: number | string
  readonly height?: number | string
  readonly color?: string
  readonly className?: string
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      <path stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M12 22 V14 H22" />
      <path stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M42 14 H52 V22" />
      <path stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M12 42 V50 H22" />
      <path stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M42 50 H52 V42" />
      <g transform="translate(18,20)">
        <line stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" x1="0" y1="12" x2="28" y2="12" />
        <rect fill="currentColor" x="0" y="0" width="6" height="4" rx="1.5" />
        <rect fill="currentColor" x="10" y="0" width="4" height="4" rx="1.5" />
        <rect fill="currentColor" x="18" y="0" width="6" height="4" rx="1.5" />
        <rect fill="currentColor" x="24" y="6" width="4" height="4" rx="1.5" />
        <rect fill="currentColor" x="2" y="16" width="4" height="4" rx="1.5" />
        <rect fill="currentColor" x="8" y="20" width="6" height="4" rx="1.5" />
        <rect fill="currentColor" x="18" y="18" width="4" height="4" rx="1.5" />
        <rect fill="currentColor" x="24" y="18" width="4" height="4" rx="1.5" />
      </g>
    </svg>
  )
}
