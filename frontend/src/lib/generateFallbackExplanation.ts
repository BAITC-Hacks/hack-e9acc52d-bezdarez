import { BASELINE, CATEGORY_LABELS, CATEGORY_MAIN_METRIC, METRIC_LABELS, METRICS } from '../data/baseline'
import { PERSONAS, REACTION_TEMPLATES } from '../data/fallbackTexts'
import type { AiExplanation } from '../types/ai'
import type { Horizon, SimulationResult } from '../types/simulation'
import { outcomeFor, round1 } from './calculateSimulation'

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(round1(v))}`

/** Шаблонное объяснение (FR-09): работает без AI и использует только рассчитанные данные. */
export function generateFallbackExplanation(result: SimulationResult, horizon: Horizon): AiExplanation {
  const outcome = outcomeFor(result, horizon)
  const effectKey = horizon === '1y' ? 'effectOneYear' : 'effectThreeYears'
  const deltas = METRICS.map((m) => ({ m, d: outcome.scores[m] - BASELINE[m] })).sort((a, b) => b.d - a.d)
  const best = deltas[0]
  const worst = deltas[deltas.length - 1]
  const bestProject = [...result.contributions].sort((a, b) => b[effectKey][best.m] - a[effectKey][best.m])[0]
  const worstDecision = result.selectedDecisions.find((d) => CATEGORY_MAIN_METRIC[d.category] === worst.m)
  const overallDelta = outcome.overall - result.overallBefore
  const horizonLabel = horizon === '1y' ? 'через 1 год' : 'через 3 года'

  const summary = [
    `Наибольший рост ${horizonLabel} — «${METRIC_LABELS[best.m]}» (${signed(best.d)}); основной вклад внёс проект «${bestProject.title}».`,
    `Минимальное изменение — «${METRIC_LABELS[worst.m]}» (${signed(worst.d)})${
      worstDecision ? `: на направление выделено ${worstDecision.allocatedBudget} ед.` : '.'
    }`,
    `Стратегия изменила общий показатель качества жизни на ${signed(overallDelta)} балла (${result.overallBefore} → ${outcome.overall}).`,
  ].join(' ')

  const positives = padTo(outcome.positiveEffects, 3, [
    `Все пять сфер получили финансирование — ни одно направление не осталось без проекта.`,
    `Общий AQLS: ${result.overallBefore} → ${outcome.overall}.`,
    `Профиль стратегии: ${result.strategyProfile.title}.`,
  ]).slice(0, 3)
  const risks = padTo(outcome.risks, 2, [
    `Модель не учитывает внешние факторы — результат демонстрационный.`,
    `Расходы на обслуживание проектов сильнее проявятся на длинном горизонте.`,
  ]).slice(0, 3)

  // Донор — самое щедро профинансированное направление, кроме отстающего.
  const donor = [...result.selectedDecisions]
    .filter((d) => d.category !== worstDecision?.category)
    .sort((a, b) => b.allocatedBudget - a.allocatedBudget)[0]
  let recommendation: string
  if (worst.d >= best.d - 4 || !worstDecision) {
    recommendation = `Распределение сбалансировано; сравните горизонты 1 и 3 года и попробуйте заменить проект с наименьшей эффективностью.`
  } else if (donor && donor.allocatedBudget > worstDecision.allocatedBudget) {
    recommendation = `Переведите 3–5 единиц из направления «${CATEGORY_LABELS[donor.category]}» (${donor.allocatedBudget} ед.) в «${CATEGORY_LABELS[worstDecision.category]}» (${worstDecision.allocatedBudget} ед.), чтобы выровнять рост показателей.`
  } else {
    recommendation = `Направление «${CATEGORY_LABELS[worstDecision.category]}» уже получает больше всех (${worstDecision.allocatedBudget} ед.), но растёт слабее: попробуйте другой проект в этой сфере с большим эффектом на «${METRIC_LABELS[worst.m]}».`
  }

  return { summary, positives, risks, recommendation, citizenReactions: citizenReactions(result, horizon) }
}

/** Реакции условных жителей строятся по изменениям показателей (FR-10). */
export function citizenReactions(result: SimulationResult, horizon: Horizon) {
  const scores = outcomeFor(result, horizon).scores
  return PERSONAS.map(({ persona, metric }) => {
    const d = scores[metric] - BASELINE[metric]
    const level = d >= 8 ? 'high' : d >= 3 ? 'mid' : d > 0 ? 'low' : 'none'
    return { persona, text: REACTION_TEMPLATES[metric][level] }
  })
}

function padTo(items: string[], n: number, fillers: string[]): string[] {
  const out = [...items]
  for (const f of fillers) if (out.length < n) out.push(f)
  return out
}
