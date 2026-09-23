import { TENGE_BN_PER_UNIT } from '../data/baseline'

export const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString('ru-RU', { maximumFractionDigits: 1 })

export const fmtDelta = (v: number) => {
  const r = Math.round(v * 10) / 10
  if (r === 0) return '0'
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}`
}

export const deltaTone = (v: number) =>
  Math.round(v * 10) === 0 ? 'text-muted' : v > 0 ? 'text-good-ink' : 'text-crit-ink'

/** Единицы → тенге: 20 ед. → «40 млрд ₸», 0,5 ед. → «1 млрд ₸». */
export const fmtTenge = (units: number) => {
  const bn = units * TENGE_BN_PER_UNIT
  return bn >= 1000
    ? `${(bn / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} трлн ₸`
    : `${bn.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млрд ₸`
}

export const SPEED_LABELS = { fast: 'Быстрый эффект', medium: 'Средний срок', slow: 'Долгосрочный' } as const
