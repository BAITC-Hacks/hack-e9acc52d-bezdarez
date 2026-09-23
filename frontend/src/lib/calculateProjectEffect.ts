import { METRICS } from '../data/baseline'
import type { CityProject, CityScores } from '../types/project'

export const MAX_EFFICIENCY = 1.15

/** Убывающая отдача от бюджета (п. 10.2): sqrt(выделено / рекомендовано), не выше 1.15. */
export function calculateEfficiency(allocatedBudget: number, recommendedBudget: number): number {
  if (allocatedBudget <= 0 || recommendedBudget <= 0) return 0
  return Math.min(MAX_EFFICIENCY, Math.sqrt(allocatedBudget / recommendedBudget))
}

export function scaleScores(scores: CityScores, factor: number): CityScores {
  const out = {} as CityScores
  for (const m of METRICS) out[m] = scores[m] * factor
  return out
}

export function calculateProjectEffect(project: CityProject, allocatedBudget: number) {
  const efficiency = calculateEfficiency(allocatedBudget, project.recommendedBudget)
  return {
    efficiency,
    effectOneYear: scaleScores(project.effects, efficiency),
    effectThreeYears: scaleScores(project.effects, efficiency * project.longTermMultiplier),
  }
}
