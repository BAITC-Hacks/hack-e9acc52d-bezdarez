import { BASELINE, CATEGORY_MAIN_METRIC, METRICS } from '../data/baseline'
import { PERSONAS, REACTION_TEMPLATES } from '../data/fallbackTexts'
import { PROJECTS_BY_ID } from '../data/projects'
import { SYNERGY_TEXT, projectTitle, type Lang } from '../data/translations'
import type { AiExplanation } from '../types/ai'
import type { Horizon, SimulationResult } from '../types/simulation'
import { outcomeFor } from './calculateSimulation'
import { EXPLAIN, PERSONAS_L, REACTIONS_L, cL, mL, numL, penaltyText, signedL, type Level } from './texts'

/** Шаблонное объяснение (FR-09): работает без AI, использует только рассчитанные данные, на языке интерфейса. */
export function generateFallbackExplanation(result: SimulationResult, horizon: Horizon, lang: Lang = 'ru'): AiExplanation {
  const T = EXPLAIN[lang]
  const outcome = outcomeFor(result, horizon)
  const effectKey = horizon === '1y' ? 'effectOneYear' : 'effectThreeYears'
  const deltas = METRICS.map((m) => ({ m, d: outcome.scores[m] - BASELINE[m] })).sort((a, b) => b.d - a.d)
  const best = deltas[0]
  const worst = deltas[deltas.length - 1]
  const title = (id: string) => projectTitle(id, lang)
  const bestProject = [...result.contributions].sort((a, b) => b[effectKey][best.m] - a[effectKey][best.m])[0]
  const worstDecision = result.selectedDecisions.find((d) => CATEGORY_MAIN_METRIC[d.category] === worst.m)
  const byBudget = [...result.selectedDecisions].sort((a, b) => b.allocatedBudget - a.allocatedBudget)
  const most = byBudget[0]
  const least = byBudget[byBudget.length - 1]
  const other = horizon === '1y' ? result.threeYears : result.oneYear
  const horizonDiff = other.overall - outcome.overall
  const slow = result.contributions.filter((c) => PROJECTS_BY_ID[c.projectId].longTermMultiplier >= 1.4).map((c) => `«${title(c.projectId)}»`)

  const summary = [
    T.summaryTotal(horizon === '1y' ? T.horizon1 : T.horizon3, signedL(outcome.overall - result.overallBefore, lang), numL(result.overallBefore, lang), numL(outcome.overall, lang)),
    T.summaryBest(mL(best.m, lang), signedL(best.d, lang), title(bestProject.projectId), mL(worst.m, lang), signedL(worst.d, lang)),
    most.allocatedBudget - least.allocatedBudget >= 4
      ? T.tradeoff(cL(most.category, lang), most.allocatedBudget, cL(least.category, lang), least.allocatedBudget)
      : T.evenSplit(least.allocatedBudget, most.allocatedBudget),
    horizon === '1y'
      ? T.in3y(numL(other.overall, lang), signedL(horizonDiff, lang), slow.join(', '), other.penaltyTotal > outcome.penaltyTotal)
      : T.vs1y(numL(Math.abs(horizonDiff), lang), horizonDiff <= 0),
  ].join(' ')

  const positives: string[] = []
  for (const { m, d } of deltas.slice(0, 2)) {
    if (d <= 0) continue
    const top = [...result.contributions].sort((a, b) => b[effectKey][m] - a[effectKey][m])[0]
    positives.push(T.posMetric(mL(m, lang), signedL(d, lang), title(top.projectId)))
  }
  result.appliedSynergyIds.forEach((id, k) => {
    const text = lang === 'ru' ? result.appliedSynergies[k] : (SYNERGY_TEXT[lang][id] ?? result.appliedSynergies[k])
    positives.push(T.posSynergy(text))
  })
  for (const c of result.contributions) {
    const p = PROJECTS_BY_ID[c.projectId]
    if (horizon === '1y' && p.speed === 'fast') positives.push(T.posFast(title(p.id)))
    if (horizon === '3y' && p.longTermMultiplier >= 1.4) positives.push(T.posLong(title(p.id), numL(p.longTermMultiplier, lang)))
  }
  positives.push(T.posAll)

  const risks: string[] = []
  for (const { m, d } of deltas) if (d < 0) risks.push(T.riskDrop(mL(m, lang), numL(Math.abs(d), lang)))
  if (worst.d >= 0 && worst.d < 3) risks.push(T.riskWeak(mL(worst.m, lang), signedL(worst.d, lang)))
  for (const pen of outcome.penalties) risks.push(penaltyText(pen, lang, (c) => cL(c, lang)) + '.')
  for (const c of result.contributions) {
    const p = PROJECTS_BY_ID[c.projectId]
    if (c.efficiency < 0.8) risks.push(T.riskLowEff(title(p.id), Math.round(c.efficiency * 100)))
    if (horizon === '1y' && p.speed === 'slow') risks.push(T.riskSlow(title(p.id)))
    if (horizon === '3y' && p.maintenanceCost >= 3) risks.push(T.riskMaint(title(p.id), p.maintenanceCost))
  }
  risks.push(T.riskModel)
  if (risks.length < 2) risks.push(T.riskGeneric)

  const donor = byBudget.find((d) => d.category !== worstDecision?.category)
  let recommendation: string
  if (worst.d >= best.d - 4 || !worstDecision) recommendation = T.recBalanced
  else if (donor && donor.allocatedBudget > worstDecision.allocatedBudget)
    recommendation = T.recMove(cL(donor.category, lang), donor.allocatedBudget, cL(worstDecision.category, lang), worstDecision.allocatedBudget)
  else recommendation = T.recSwap(cL(worstDecision.category, lang), worstDecision.allocatedBudget, mL(worst.m, lang))

  return {
    summary,
    positives: positives.slice(0, 3),
    risks: risks.slice(0, 3),
    recommendation,
    citizenReactions: citizenReactions(result, horizon, lang),
  }
}

/** Реакции условных жителей строятся по изменениям показателей (FR-10). */
export function citizenReactions(result: SimulationResult, horizon: Horizon, lang: Lang = 'ru') {
  const scores = outcomeFor(result, horizon).scores
  const personas = lang === 'ru' ? PERSONAS : PERSONAS_L[lang]
  return personas.map(({ persona, metric }) => {
    const d = scores[metric] - BASELINE[metric]
    const level: Level = d >= 8 ? 'high' : d >= 3 ? 'mid' : d > 0 ? 'low' : 'none'
    return { persona, text: lang === 'ru' ? REACTION_TEMPLATES[metric][level] : REACTIONS_L[lang][metric][level] }
  })
}
