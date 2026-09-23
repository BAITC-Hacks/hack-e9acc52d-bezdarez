import { CATEGORY_LABELS } from '../data/baseline'
import type { AppliedPenalty, Horizon, SelectedDecision } from '../types/simulation'

export const LOW_BUDGET_THRESHOLD = 10
export const HIGH_BUDGET_THRESHOLD = 30
export const LOW_PENALTY_PER_UNIT = 0.25
export const HIGH_PENALTY_PER_UNIT = 0.15
export const MAINTENANCE_THRESHOLD = 12
export const MAINTENANCE_PENALTY_PER_UNIT = 0.5

/** Штраф за несбалансированность (п. 10.4): считается по каждому направлению. */
export function calculateBalancePenalties(decisions: SelectedDecision[]): AppliedPenalty[] {
  const penalties: AppliedPenalty[] = []
  for (const d of decisions) {
    const label = CATEGORY_LABELS[d.category]
    const low = Math.max(0, LOW_BUDGET_THRESHOLD - d.allocatedBudget) * LOW_PENALTY_PER_UNIT
    const high = Math.max(0, d.allocatedBudget - HIGH_BUDGET_THRESHOLD) * HIGH_PENALTY_PER_UNIT
    if (low > 0) {
      penalties.push({
        kind: 'underfunded',
        category: d.category,
        points: low,
        description: `«${label}»: ${d.allocatedBudget} ед. — меньше ${LOW_BUDGET_THRESHOLD}, штраф −${low.toFixed(2)}`,
      })
    }
    if (high > 0) {
      penalties.push({
        kind: 'overfunded',
        category: d.category,
        points: high,
        description: `«${label}»: ${d.allocatedBudget} ед. — больше ${HIGH_BUDGET_THRESHOLD}, штраф −${high.toFixed(2)}`,
      })
    }
  }
  return penalties
}

/** Расходы на обслуживание (п. 10.5): влияют только на горизонте трёх лет. */
export function calculateMaintenancePenalty(
  totalMaintenanceCost: number,
  horizon: Horizon,
): AppliedPenalty | null {
  if (horizon !== '3y') return null
  const points = Math.max(0, totalMaintenanceCost - MAINTENANCE_THRESHOLD) * MAINTENANCE_PENALTY_PER_UNIT
  if (points <= 0) return null
  return {
    kind: 'maintenance',
    points,
    description: `Суммарные расходы на обслуживание ${totalMaintenanceCost} (порог ${MAINTENANCE_THRESHOLD}), штраф −${points.toFixed(2)}`,
  }
}
