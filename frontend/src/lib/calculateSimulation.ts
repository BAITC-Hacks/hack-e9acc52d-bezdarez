import {
  BASELINE,
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_MAX_BUDGET,
  CATEGORY_MIN_BUDGET,
  METRIC_LABELS,
  METRICS,
  TOTAL_BUDGET,
  WEIGHTS,
} from '../data/baseline'
import { PROJECTS_BY_ID } from '../data/projects'
import type { CityScores } from '../types/project'
import type {
  AppliedPenalty,
  DraftDecisions,
  Horizon,
  HorizonOutcome,
  ProjectContribution,
  SelectedDecision,
  SimulationResult,
  ValidationIssue,
} from '../types/simulation'
import { calculateProjectEffect } from './calculateProjectEffect'
import { calculateBalancePenalties, calculateMaintenancePenalty } from './calculatePenalties'
import { findSynergies } from './calculateSynergies'
import { determineProfile } from './determineProfile'

export const clamp = (value: number): number => Math.max(0, Math.min(100, value))
export const round1 = (value: number): number => Math.round(value * 10) / 10
/** Число для текста на русском: одна цифра после запятой. */
export const num = (value: number): string => String(round1(value)).replace('.', ',')

/** AQLS = взвешенная сумма пяти показателей − штрафы (п. 10.1), в диапазоне 0–100. */
export function calculateAqls(scores: CityScores, penaltyTotal = 0): number {
  const weighted = METRICS.reduce((sum, m) => sum + scores[m] * WEIGHTS[m], 0)
  return round1(clamp(weighted - penaltyTotal))
}

export function allocatedTotal(draft: DraftDecisions): number {
  return CATEGORIES.reduce((s, c) => s + (draft[c]?.allocatedBudget ?? 0), 0)
}

/** Проверка распределения (FR-04). Пустой список — можно запускать симуляцию. */
export function validateDecisions(draft: DraftDecisions): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const c of CATEGORIES) {
    const d = draft[c]
    if (!d?.projectId || !PROJECTS_BY_ID[d.projectId] || PROJECTS_BY_ID[d.projectId].category !== c) {
      issues.push({
        code: 'missing_project',
        category: c,
        message: `Выберите проект в категории «${CATEGORY_LABELS[c]}».`,
      })
    }
    const b = d?.allocatedBudget
    if (!Number.isInteger(b) || b < CATEGORY_MIN_BUDGET || b > CATEGORY_MAX_BUDGET) {
      issues.push({
        code: 'category_range',
        category: c,
        message: `Бюджет направления «${CATEGORY_LABELS[c]}» должен быть от ${CATEGORY_MIN_BUDGET} до ${CATEGORY_MAX_BUDGET} единиц.`,
      })
    }
  }
  const total = allocatedTotal(draft)
  if (total < TOTAL_BUDGET) {
    issues.push({ code: 'under_budget', message: `Распределите ещё ${TOTAL_BUDGET - total} бюджетных единиц.` })
  } else if (total > TOTAL_BUDGET) {
    issues.push({
      code: 'over_budget',
      message: `Бюджет превышен на ${total - TOTAL_BUDGET} единиц. Уменьшите финансирование одного или нескольких направлений.`,
    })
  }
  return issues
}

export function toDecisions(draft: DraftDecisions): SelectedDecision[] {
  return CATEGORIES.filter((c) => draft[c]?.projectId).map((c) => ({
    category: c,
    projectId: draft[c].projectId as string,
    allocatedBudget: draft[c].allocatedBudget,
  }))
}

function sumScores(parts: CityScores[]): CityScores {
  const out = zero()
  for (const p of parts) for (const m of METRICS) out[m] += p[m] ?? 0
  return out
}

function describeHorizon(
  horizon: Horizon,
  scores: CityScores,
  contributions: ProjectContribution[],
  synergyDescriptions: string[],
  penalties: AppliedPenalty[],
): Pick<HorizonOutcome, 'positiveEffects' | 'risks'> {
  const deltas = METRICS.map((m) => ({ m, d: scores[m] - BASELINE[m] })).sort((a, b) => b.d - a.d)
  const effectKey = horizon === '1y' ? 'effectOneYear' : 'effectThreeYears'

  const positiveEffects: string[] = []
  for (const { m, d } of deltas.slice(0, 2)) {
    if (d <= 0) continue
    const top = [...contributions].sort((a, b) => b[effectKey][m] - a[effectKey][m])[0]
    positiveEffects.push(
      `${METRIC_LABELS[m]}: +${num(d)} — основной вклад проекта «${top.title}».`,
    )
  }
  for (const s of synergyDescriptions) positiveEffects.push(`Синергия: ${s}.`)
  for (const c of contributions) {
    const p = PROJECTS_BY_ID[c.projectId]
    if (horizon === '1y' && p.speed === 'fast') positiveEffects.push(`«${p.title}» даёт быстрый эффект уже в первый год.`)
    if (horizon === '3y' && p.longTermMultiplier >= 1.4)
      positiveEffects.push(`«${p.title}» раскрывается в долгосрочной перспективе (×${p.longTermMultiplier}).`)
  }

  const risks: string[] = []
  for (const { m, d } of deltas) {
    if (d < 0) risks.push(`${METRIC_LABELS[m]} снизилась на ${num(Math.abs(d))} из-за побочных эффектов проектов.`)
  }
  const weakest = deltas[deltas.length - 1]
  if (weakest.d >= 0 && weakest.d < 3) {
    risks.push(`Минимальный рост — «${METRIC_LABELS[weakest.m]}» (+${num(weakest.d)}): этой сфере досталось мало ресурсов.`)
  }
  for (const p of penalties) risks.push(p.description + '.')
  for (const c of contributions) {
    if (c.efficiency < 0.8) risks.push(`«${c.title}» профинансирован ниже рекомендуемого: реализуется лишь ${Math.round(c.efficiency * 100)}% эффекта.`)
    const p = PROJECTS_BY_ID[c.projectId]
    if (horizon === '1y' && p.speed === 'slow') risks.push(`«${p.title}» требует времени: в первый год эффект ограничен.`)
    if (horizon === '3y' && p.maintenanceCost >= 3) risks.push(`«${p.title}»: высокие расходы на обслуживание (${p.maintenanceCost}/4).`)
  }
  return { positiveEffects: positiveEffects.slice(0, 6), risks: risks.slice(0, 6) }
}

/** Детерминированный расчёт (FR-05). Одинаковые решения всегда дают одинаковый результат. */
export function calculateSimulation(decisions: SelectedDecision[]): SimulationResult {
  const ordered = [...decisions].sort(
    (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category),
  )

  const contributions: ProjectContribution[] = ordered.map((d) => {
    const project = PROJECTS_BY_ID[d.projectId]
    if (!project) throw new Error(`Неизвестный проект: ${d.projectId}`)
    return {
      projectId: project.id,
      title: project.title,
      category: project.category,
      allocatedBudget: d.allocatedBudget,
      ...calculateProjectEffect(project, d.allocatedBudget),
    }
  })

  const synergies = findSynergies(ordered.map((d) => d.projectId))
  const synergyBonus = sumScores(synergies.map((s) => ({ ...zero(), ...s.bonus })))

  const build = (horizon: Horizon): HorizonOutcome => {
    const effects = sumScores(
      contributions.map((c) => (horizon === '1y' ? c.effectOneYear : c.effectThreeYears)),
    )
    const scores = {} as CityScores
    for (const m of METRICS) scores[m] = round1(clamp(BASELINE[m] + effects[m] + synergyBonus[m]))

    const penalties = calculateBalancePenalties(ordered)
    const totalMaintenance = ordered.reduce((s, d) => s + PROJECTS_BY_ID[d.projectId].maintenanceCost, 0)
    const maintenance = calculateMaintenancePenalty(totalMaintenance, horizon)
    if (maintenance) penalties.push(maintenance)
    const penaltyTotal = round1(penalties.reduce((s, p) => s + p.points, 0))

    return {
      scores,
      overall: calculateAqls(scores, penaltyTotal),
      penalties,
      penaltyTotal,
      ...describeHorizon(horizon, scores, contributions, synergies.map((s) => s.description), penalties),
    }
  }

  const oneYear = build('1y')
  const threeYears = build('3y')

  return {
    before: { ...BASELINE },
    afterOneYear: oneYear.scores,
    afterThreeYears: threeYears.scores,
    overallBefore: calculateAqls(BASELINE),
    overallAfterOneYear: oneYear.overall,
    overallAfterThreeYears: threeYears.overall,
    selectedDecisions: ordered,
    contributions,
    appliedSynergies: synergies.map((s) => s.description),
    appliedSynergyIds: synergies.map((s) => s.id),
    oneYear,
    threeYears,
    strategyProfile: determineProfile(ordered),
  }
}

function zero(): CityScores {
  return { mobility: 0, ecology: 0, social: 0, safety: 0, services: 0 }
}

export function outcomeFor(result: SimulationResult, horizon: Horizon): HorizonOutcome {
  return horizon === '1y' ? result.oneYear : result.threeYears
}
