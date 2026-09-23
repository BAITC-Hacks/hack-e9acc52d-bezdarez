import { describe, expect, it } from 'vitest'
import { BASELINE, METRICS } from '../data/baseline'
import { DISTRICT_SHAPES } from '../data/astanaMap'
import { DISTRICTS } from '../data/districts'
import { needFactor, projectDistricts } from './districtProjection'

describe('районы', () => {
  it('5 районов с геометрией, доли в сумме 1', () => {
    expect(DISTRICTS).toHaveLength(5)
    for (const d of DISTRICTS) expect(DISTRICT_SHAPES[d.id].d.startsWith('M')).toBe(true)
    expect(DISTRICTS.reduce((s, d) => s + d.share, 0)).toBeCloseTo(1, 6)
  })
  it('взвешенное среднее районов ≈ стартовые показатели города (±1)', () => {
    for (const m of METRICS) {
      const avg = DISTRICTS.reduce((s, d) => s + d.baseline[m] * d.share, 0)
      expect(Math.abs(avg - BASELINE[m])).toBeLessThanOrEqual(1)
    }
  })
  it('без симуляции проекция равна исходным данным, с ростом — районы растут', () => {
    for (const r of projectDistricts()) expect(r.after).toEqual(r.before)
    const up = { mobility: 64, ecology: 60, social: 71, safety: 78, services: 70 }
    for (const r of projectDistricts(up)) for (const m of METRICS) expect(r.after[m]).toBeGreaterThan(r.before[m])
  })
  it('отстающий район получает больший эффект, но в пределах 0.7–1.3', () => {
    expect(needFactor(44, 50)).toBeGreaterThan(needFactor(58, 50))
    expect(needFactor(0, 100)).toBe(1.3)
    expect(needFactor(100, 0)).toBe(0.7)
  })
})
