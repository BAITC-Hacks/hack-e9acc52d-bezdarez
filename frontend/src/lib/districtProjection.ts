import { BASELINE, METRICS, WEIGHTS } from '../data/baseline'
import { DISTRICTS, type District } from '../data/districts'
import type { CityScores } from '../types/project'
import { clamp, round1 } from './calculateSimulation'

/**
 * Проекция городского результата на районы — только для визуализации.
 * Городской рост показателя распределяется по районам с учётом потребности:
 * где стартовое значение ниже городского, эффект заметнее (коэффициент 0.7–1.3).
 * Баллы AQLS считает только городской Simulation Engine.
 */
export function needFactor(district: number, city: number): number {
  return Math.max(0.7, Math.min(1.3, 1 + (city - district) / 40))
}

export function districtScores(d: District, cityAfter?: CityScores): CityScores {
  const out = {} as CityScores
  for (const m of METRICS) {
    const delta = cityAfter ? cityAfter[m] - BASELINE[m] : 0
    out[m] = round1(clamp(d.baseline[m] + delta * needFactor(d.baseline[m], BASELINE[m])))
  }
  return out
}

export function districtIndex(scores: CityScores): number {
  return round1(METRICS.reduce((s, m) => s + scores[m] * WEIGHTS[m], 0))
}

export function projectDistricts(cityAfter?: CityScores) {
  return DISTRICTS.map((d) => {
    const before = districtScores(d)
    const after = districtScores(d, cityAfter)
    return { district: d, before, after, indexBefore: districtIndex(before), indexAfter: districtIndex(after) }
  })
}
