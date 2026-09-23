export const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString('ru-RU', { maximumFractionDigits: 1 })

export const fmtDelta = (v: number) => {
  const r = Math.round(v * 10) / 10
  if (r === 0) return '0'
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}`
}

export const deltaTone = (v: number) =>
  Math.round(v * 10) === 0 ? 'text-muted' : v > 0 ? 'text-good-ink' : 'text-crit-ink'

export const SPEED_LABELS = { fast: 'Быстрый эффект', medium: 'Средний срок', slow: 'Долгосрочный' } as const
