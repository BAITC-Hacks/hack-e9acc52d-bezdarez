import type { Category, Game, Indicators } from '../types'

export const fmt = (x: number, digits = 2) => x.toFixed(digits)
export const signed = (x: number, digits = 2) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Math.abs(x).toFixed(digits)}`
/** Short number: 10 → "10", 10.5 → "10.5", 8.75 → "8.75" */
export const num = (x: number) => String(Math.round(x * 100) / 100)

export const CATEGORY_LABEL: Record<string, string> = {
  transport: 'Транспорт',
  ecology: 'Экология',
  social: 'Социальная сфера',
  safety: 'Безопасность',
  services: 'Сервисы',
}

export const CATEGORY_CHIP: Record<string, string> = {
  transport: 'Транспорт',
  ecology: 'Экология',
  social: 'Соцсфера',
  safety: 'Безопасность',
  services: 'Сервисы',
}

export const CATEGORY_SHORT: Record<string, string> = {
  transport: 'TRANSPORT',
  ecology: 'ECOLOGY',
  social: 'SOCIAL',
  safety: 'SAFETY',
  services: 'SERVICES',
}

/** Mean of a category's indicators (display aid for district cards). */
export function categoryValue(ind: Indicators, cat: Category) {
  return cat.indicators.reduce((s, k) => s + ind[k], 0) / cat.indicators.length
}

export function districtName(game: Game, id: string | null | undefined) {
  return game.districts.find((d) => d.id === id)?.name ?? '—'
}

export function realized(effect: number, lag: number, horizon: number) {
  return (effect * Math.max(0, horizon - lag)) / horizon
}

export type Tone = 'good' | 'warn' | 'crit' | 'neutral'

/** Status for a 0–100 indicator value. */
export function valueTone(v: number, threshold = 40): Tone {
  if (v < threshold) return 'crit'
  if (v < threshold + 5) return 'warn'
  return 'neutral'
}

/**
 * Sequential blue ramp (dark-mode steps: low values recede toward the surface).
 * Maps a value in [lo, hi] onto the ramp.
 */
const RAMP = ['#0d366b', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef']
export function heat(v: number, lo = 30, hi = 80) {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
  return RAMP[Math.round(t * (RAMP.length - 1))]
}
/** Text ink that clears contrast inside a heat cell. */
export function heatInk(v: number, lo = 30, hi = 80) {
  const t = (v - lo) / (hi - lo)
  return t > 0.72 ? '#0b0b0b' : '#ffffff'
}

