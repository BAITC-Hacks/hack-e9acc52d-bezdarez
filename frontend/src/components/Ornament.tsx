/** Декоративный завиток по мотивам казахского орнамента (оригинальная геометрия). */
export function Ornament({ color = '#16f099', className = '', size = 160 }: { color?: string; className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <g fill="none" stroke={color} strokeWidth="11" strokeLinecap="round">
        <path d="M60 60c0-18 14-30 28-26s16 22 4 28-20-6-12-12" />
        <path d="M60 60c0 18-14 30-28 26s-16-22-4-28 20 6 12 12" />
        <path d="M60 60c-18 0-30-14-26-28s22-16 28-4-6 20-12 12" opacity="0.85" />
        <path d="M60 60c18 0 30 14 26 28s-22 16-28 4 6-20 12-12" opacity="0.85" />
      </g>
    </svg>
  )
}
