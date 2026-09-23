import { PROJECTS_BY_ID } from '../data/projects'
import type { Horizon, SimulationResult } from '../types/simulation'
import { outcomeFor } from './calculateSimulation'

/** Входные данные AI (п. 13.2): только рассчитанные системой значения. */
export function buildAiPayload(result: SimulationResult, horizon: Horizon) {
  const outcome = outcomeFor(result, horizon)
  return {
    horizon: horizon === '1y' ? '1_year' : '3_years',
    overallBefore: result.overallBefore,
    overallAfter: outcome.overall,
    scoresBefore: result.before,
    scoresAfter: outcome.scores,
    selectedProjects: result.contributions.map((c) => ({
      category: c.category,
      title: c.title,
      allocatedBudget: c.allocatedBudget,
      recommendedBudget: PROJECTS_BY_ID[c.projectId].recommendedBudget,
      efficiencyPercent: Math.round(c.efficiency * 100),
      speed: PROJECTS_BY_ID[c.projectId].speed,
      maintenanceCost: PROJECTS_BY_ID[c.projectId].maintenanceCost,
      risks: PROJECTS_BY_ID[c.projectId].risks,
    })),
    synergies: result.appliedSynergies,
    penalties: outcome.penalties.map((p) => p.description),
    strategyProfile: result.strategyProfile.title,
  }
}

export type AiPayload = ReturnType<typeof buildAiPayload>
