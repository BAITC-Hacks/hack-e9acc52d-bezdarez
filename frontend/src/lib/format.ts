import { TENGE_BN_PER_UNIT } from '../data/baseline'
import type { Lang } from './i18n'

export const localeFor = (lang: Lang = 'ru') => ({ ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' })[lang]

export const fmt = (v: number, lang: Lang = 'ru') => (Math.round(v * 10) / 10).toLocaleString(localeFor(lang), { maximumFractionDigits: 1 })

export const fmtDelta = (v: number, lang: Lang = 'ru') => {
  const r = Math.round(v * 10) / 10
  if (r === 0) return '0'
  return `${r > 0 ? '+' : '−'}${fmt(Math.abs(r), lang)}`
}

export const deltaTone = (v: number) =>
  Math.round(v * 10) === 0 ? 'text-muted' : v > 0 ? 'text-good-ink' : 'text-crit-ink'

/** Единицы → тенге: 20 ед. → «40 млрд ₸», 0,5 ед. → «1 млрд ₸». */
export const fmtTenge = (units: number, lang: Lang = 'ru') => {
  const bn = units * TENGE_BN_PER_UNIT
  const trillion = Math.abs(bn) >= 1000
  const suffix = lang === 'en' ? (trillion ? 'trn' : 'bn') : (trillion ? 'трлн' : 'млрд')
  const value = (trillion ? bn / 1000 : bn).toLocaleString(localeFor(lang), { maximumFractionDigits: trillion ? 2 : 1 })
  return `${value} ${suffix} ₸`
}

export const SPEED_LABELS = { fast: 'Быстрый эффект', medium: 'Средний срок', slow: 'Долгосрочный' } as const
