import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../data/baseline'
import { PROJECTS } from '../data/projects'
import { aiExplanationSchema } from '../types/ai'
import type { DraftDecisions, SelectedDecision } from '../types/simulation'
import { buildAiPayload } from './buildAiPayload'
import { calculateEfficiency } from './calculateProjectEffect'
import { calculateBalancePenalties, calculateMaintenancePenalty } from './calculatePenalties'
import { calculateAqls, calculateSimulation, validateDecisions } from './calculateSimulation'
import { determineProfile } from './determineProfile'
import { generateFallbackExplanation } from './generateFallbackExplanation'

const decide = (pairs: [string, number][]): SelectedDecision[] =>
  pairs.map(([id, b]) => {
    const p = PROJECTS.find((x) => x.id === id)!
    return { category: p.category, projectId: id, allocatedBudget: b }
  })

const BALANCED = decide([
  ['adaptive-traffic-lights', 20],
  ['smart-irrigation', 20],
  ['mobile-clinics', 20],
  ['street-lighting', 20],
  ['digital-requests', 20],
])

describe('каталог', () => {
  it('5 категорий, минимум 3 проекта в каждой, всего ≥ 15', () => {
    for (const c of CATEGORIES) expect(PROJECTS.filter((p) => p.category === c).length).toBeGreaterThanOrEqual(3)
    expect(PROJECTS.length).toBeGreaterThanOrEqual(15)
  })
  it('границы бюджета проектов в пределах 5–40 и min ≤ rec ≤ max', () => {
    for (const p of PROJECTS) {
      expect(p.minBudget).toBeGreaterThanOrEqual(5)
      expect(p.maxBudget).toBeLessThanOrEqual(40)
      expect(p.minBudget).toBeLessThanOrEqual(p.recommendedBudget)
      expect(p.recommendedBudget).toBeLessThanOrEqual(p.maxBudget)
      expect(p.maintenanceCost).toBeGreaterThanOrEqual(1)
      expect(p.maintenanceCost).toBeLessThanOrEqual(4)
    }
  })
})

describe('формулы', () => {
  it('стартовый AQLS ≈ 58 (FR-02)', () => {
    expect(Math.round(calculateAqls({ mobility: 54, ecology: 50, social: 61, safety: 68, services: 60 }))).toBe(58)
  })
  it('эффективность: sqrt с потолком 1.15 (п. 10.2)', () => {
    expect(calculateEfficiency(10, 20)).toBeCloseTo(0.707, 3)
    expect(calculateEfficiency(20, 20)).toBe(1)
    expect(calculateEfficiency(40, 20)).toBe(1.15)
  })
  it('штрафы за несбалансированность (п. 10.4)', () => {
    const p = calculateBalancePenalties(decide([['adaptive-traffic-lights', 6], ['smart-irrigation', 34]]))
    expect(p.map((x) => x.points)).toEqual([1, 0.6])
  })
  it('обслуживание штрафует только на 3 годах (п. 10.5)', () => {
    expect(calculateMaintenancePenalty(16, '1y')).toBeNull()
    expect(calculateMaintenancePenalty(16, '3y')?.points).toBe(2)
    expect(calculateMaintenancePenalty(12, '3y')).toBeNull()
  })
})

describe('симуляция', () => {
  it('детерминирована: одинаковые решения → одинаковый результат', () => {
    expect(calculateSimulation(BALANCED)).toEqual(calculateSimulation([...BALANCED].reverse()))
  })
  it('синергия светофоры + цифровая платформа даёт +2 к сервисам', () => {
    const r = calculateSimulation(BALANCED)
    expect(r.appliedSynergies).toHaveLength(1)
    // 60 + 4 (светофоры) + 3·√(20/18) + 2 (медпункты) + 2·√(20/18) + 8·√(20/18) + 2 (синергия) = 81.7
    expect(r.afterOneYear.services).toBe(81.7)
  })
  it('долгосрочные проекты сильнее через 3 года', () => {
    const r = calculateSimulation(
      decide([
        ['bus-lanes', 20],
        ['tree-planting', 20],
        ['school-expansion', 20],
        ['emergency-center', 20],
        ['waste-optimization', 20],
      ]),
    )
    expect(r.afterThreeYears.ecology).toBeGreaterThan(r.afterOneYear.ecology)
    expect(r.threeYears.penalties.some((p) => p.kind === 'maintenance')).toBe(true)
  })
  it('показатели ограничены 0–100', () => {
    const r = calculateSimulation(BALANCED)
    for (const s of [r.afterOneYear, r.afterThreeYears]) for (const v of Object.values(s)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })
  it('перекос бюджета снижает AQLS через штраф', () => {
    const skewed = calculateSimulation(
      decide([
        ['adaptive-traffic-lights', 40],
        ['smart-irrigation', 5],
        ['mobile-clinics', 5],
        ['street-lighting', 10],
        ['digital-requests', 40],
      ]),
    )
    expect(skewed.oneYear.penaltyTotal).toBeGreaterThan(0)
    expect(skewed.strategyProfile.id).toBe('technocrat')
  })
})

describe('валидация (FR-04)', () => {
  const draft = (overrides: Partial<DraftDecisions> = {}): DraftDecisions => ({
    transport: { projectId: 'adaptive-traffic-lights', allocatedBudget: 20 },
    greening: { projectId: 'smart-irrigation', allocatedBudget: 20 },
    social: { projectId: 'mobile-clinics', allocatedBudget: 20 },
    safety: { projectId: 'street-lighting', allocatedBudget: 20 },
    services: { projectId: 'digital-requests', allocatedBudget: 20 },
    ...overrides,
  })
  it('корректное распределение проходит', () => expect(validateDecisions(draft())).toEqual([]))
  it('не выбран проект', () => {
    const issues = validateDecisions(draft({ social: { projectId: null, allocatedBudget: 20 } }))
    expect(issues[0].message).toBe('Выберите проект в категории «Социальная сфера».')
  })
  it('недобор и перебор', () => {
    expect(validateDecisions(draft({ social: { projectId: 'mobile-clinics', allocatedBudget: 8 } })).map((i) => i.message)).toContain(
      'Распределите ещё 12 бюджетных единиц.',
    )
    expect(validateDecisions(draft({ social: { projectId: 'mobile-clinics', allocatedBudget: 27 } }))[0].code).toBe('over_budget')
  })
  it('проект из чужой категории не принимается', () => {
    expect(validateDecisions(draft({ social: { projectId: 'street-lighting', allocatedBudget: 20 } }))[0].code).toBe('missing_project')
  })
  it('бюджет направления вне 5–40', () => {
    const issues = validateDecisions(draft({ transport: { projectId: 'adaptive-traffic-lights', allocatedBudget: 41 } }))
    expect(issues.some((i) => i.code === 'category_range')).toBe(true)
  })
})

describe('объяснения', () => {
  it('резервное объяснение проходит ту же схему, что и AI', () => {
    const r = calculateSimulation(BALANCED)
    for (const h of ['1y', '3y'] as const) expect(aiExplanationSchema.safeParse(generateFallbackExplanation(r, h)).success).toBe(true)
  })
  it('рекомендация не предлагает перевод бюджета из сферы в неё же', () => {
    const r = calculateSimulation(
      decide([
        ['bus-lanes', 22],
        ['tree-planting', 20],
        ['mobile-clinics', 20],
        ['emergency-center', 20],
        ['digital-requests', 18],
      ]),
    )
    for (const h of ['1y', '3y'] as const) {
      const rec = generateFallbackExplanation(r, h).recommendation
      const m = rec.match(/из направления «(.+?)».*в «(.+?)»/)
      if (m) expect(m[1]).not.toBe(m[2])
    }
  })
  it('профиль сбалансированного распределения', () => {
    expect(determineProfile(BALANCED).id).toBe('balanced')
  })
  it('payload для AI содержит только рассчитанные данные', () => {
    const p = buildAiPayload(calculateSimulation(BALANCED), '3y')
    expect(p.horizon).toBe('3_years')
    expect(p.selectedProjects).toHaveLength(5)
  })
})
