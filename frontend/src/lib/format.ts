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
  // язык интерфейса выставляет SettingsProvider на <html lang>
  const en = typeof document !== 'undefined' && document.documentElement.lang === 'en'
  const locale = en ? 'en-US' : 'ru-RU'
  return bn >= 1000
    ? `${(bn / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} ${en ? 'tn' : 'трлн'} ₸`
    : `${bn.toLocaleString(locale, { maximumFractionDigits: 1 })} ${en ? 'bn' : 'млрд'} ₸`
}

export const SPEED_LABELS = { fast: 'Быстрый эффект', medium: 'Средний срок', slow: 'Долгосрочный' } as const
