import { describe, expect, it } from 'vitest'
import { fmt, fmtDelta, fmtTenge } from './format'

describe('localized values', () => {
  it('uses the expected decimal separators without changing the default Russian output', () => {
    expect(fmt(57.6)).toBe('57,6')
    expect(fmt(57.6, 'kk')).toBe('57,6')
    expect(fmt(57.6, 'en')).toBe('57.6')
    expect(fmtDelta(-2.5, 'kk')).toBe('−2,5')
    expect(fmtDelta(2.5, 'en')).toBe('+2.5')
    expect(fmtDelta(-0.01, 'en')).toBe('0')
  })

  it('keeps the budget-to-tenge conversion and translates English money suffixes', () => {
    expect(fmtTenge(20)).toBe('40 млрд ₸')
    expect(fmtTenge(20, 'kk')).toBe('40 млрд ₸')
    expect(fmtTenge(20, 'en')).toBe('40 bn ₸')
    expect(fmtTenge(0.75, 'kk')).toBe('1,5 млрд ₸')
    expect(fmtTenge(0.75, 'en')).toBe('1.5 bn ₸')
    expect(fmtTenge(500, 'en')).toBe('1 trn ₸')
  })
})
