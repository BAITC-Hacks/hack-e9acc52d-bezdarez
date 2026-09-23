import { BASELINE, CATEGORY_LABELS, CATEGORY_MAIN_METRIC, METRIC_LABELS, METRICS } from '../data/baseline'
import { personasFor, reactionsFor } from '../data/fallbackTexts'
import type { AiExplanation } from '../types/ai'
import type { Horizon, SimulationResult } from '../types/simulation'
import { PROJECTS_BY_ID } from '../data/projects'
import { num, outcomeFor } from './calculateSimulation'
import { localizedCategory, localizedMetric, type Lang } from './i18n'
import { localizeSimulationResult } from './localizedContent'

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`

/** Шаблонное объяснение (FR-09): работает без AI и использует только рассчитанные данные. */
export function generateFallbackExplanation(result: SimulationResult, horizon: Horizon, lang: Lang = 'ru'): AiExplanation {
  if (lang !== 'ru') return translatedExplanation(localizeSimulationResult(result, lang), horizon, lang)
  const outcome = outcomeFor(result, horizon)
  const effectKey = horizon === '1y' ? 'effectOneYear' : 'effectThreeYears'
  const deltas = METRICS.map((m) => ({ m, d: outcome.scores[m] - BASELINE[m] })).sort((a, b) => b.d - a.d)
  const best = deltas[0]
  const worst = deltas[deltas.length - 1]
  const bestProject = [...result.contributions].sort((a, b) => b[effectKey][best.m] - a[effectKey][best.m])[0]
  const worstDecision = result.selectedDecisions.find((d) => CATEGORY_MAIN_METRIC[d.category] === worst.m)
  const overallDelta = outcome.overall - result.overallBefore
  const horizonLabel = horizon === '1y' ? 'через 1 год' : 'через 3 года'

  const byBudget = [...result.selectedDecisions].sort((a, b) => b.allocatedBudget - a.allocatedBudget)
  const most = byBudget[0]
  const least = byBudget[byBudget.length - 1]
  const other = horizon === '1y' ? result.threeYears : result.oneYear
  const horizonDiff = other.overall - outcome.overall
  const slowProjects = result.contributions.filter((c) => PROJECTS_BY_ID[c.projectId].longTermMultiplier >= 1.4).map((c) => `«${c.title}»`)

  const summary = [
    `Стратегия изменила общий показатель качества жизни ${horizonLabel} на ${signed(overallDelta)} балла (${num(result.overallBefore)} → ${num(outcome.overall)}).`,
    `Наибольший рост — «${METRIC_LABELS[best.m]}» (${signed(best.d)}), основной вклад внёс проект «${bestProject.title}»; минимальное изменение — «${METRIC_LABELS[worst.m]}» (${signed(worst.d)}).`,
    most.allocatedBudget - least.allocatedBudget >= 4
      ? `Компромисс: больше всего ресурсов получило направление «${CATEGORY_LABELS[most.category]}» (${most.allocatedBudget} ед.), меньше всего — «${CATEGORY_LABELS[least.category]}» (${least.allocatedBudget} ед.).`
      : `Бюджет распределён ровно — от ${least.allocatedBudget} до ${most.allocatedBudget} ед. на направление, без явного перекоса.`,
    horizon === '1y'
      ? `Через 3 года AQLS составит ${num(other.overall)} (${signed(horizonDiff)})${slowProjects.length ? `: полностью раскроются ${slowProjects.join(', ')}` : ''}${other.penaltyTotal > outcome.penaltyTotal ? ', но вырастут расходы на обслуживание' : ''}.`
      : `По сравнению с первым годом AQLS ${horizonDiff <= 0 ? `выше на ${num(Math.abs(horizonDiff))}` : `ниже на ${num(horizonDiff)}`}: долгосрочные проекты набирают силу, а быстрые эффекты частично выдыхаются.`,
  ].join(' ')

  const positives = padTo(outcome.positiveEffects, 3, [
    `Все пять сфер получили финансирование — ни одно направление не осталось без проекта.`,
    `Общий AQLS: ${num(result.overallBefore)} → ${num(outcome.overall)}.`,
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
export function citizenReactions(result: SimulationResult, horizon: Horizon, lang: Lang = 'ru') {
  const scores = outcomeFor(result, horizon).scores
  const reactions = reactionsFor(lang)
  return personasFor(lang).map(({ persona, metric }) => {
    const d = scores[metric] - BASELINE[metric]
    const level = d >= 8 ? 'high' : d >= 3 ? 'mid' : d > 0 ? 'low' : 'none'
    return { persona, text: reactions[metric][level] }
  })
}

function padTo(items: string[], n: number, fillers: string[]): string[] {
  const out = [...items]
  for (const f of fillers) if (out.length < n) out.push(f)
  return out
}

/** Uses the same numeric result and recommendations as the Russian explanation. */
function translatedExplanation(result: SimulationResult, horizon: Horizon, lang: 'kk' | 'en'): AiExplanation {
  const kk = lang === 'kk'
  const n = (value: number) => kk ? num(value) : num(value).replace(',', '.')
  const change = (value: number) => `${value >= 0 ? '+' : '−'}${n(Math.abs(value))}`
  const category = (key: keyof typeof CATEGORY_LABELS) => localizedCategory(key, lang)
  const metric = (key: keyof typeof METRIC_LABELS) => localizedMetric(key, lang)
  const outcome = outcomeFor(result, horizon)
  const deltas = METRICS.map((m) => ({ m, d: outcome.scores[m] - BASELINE[m] })).sort((a, b) => b.d - a.d)
  const best = deltas[0]
  const worst = deltas[deltas.length - 1]
  const effectKey = horizon === '1y' ? 'effectOneYear' : 'effectThreeYears'
  const bestProject = [...result.contributions].sort((a, b) => b[effectKey][best.m] - a[effectKey][best.m])[0]
  const worstDecision = result.selectedDecisions.find((d) => CATEGORY_MAIN_METRIC[d.category] === worst.m)
  const byBudget = [...result.selectedDecisions].sort((a, b) => b.allocatedBudget - a.allocatedBudget)
  const most = byBudget[0]
  const least = byBudget[byBudget.length - 1]
  const other = horizon === '1y' ? result.threeYears : result.oneYear
  const diff = other.overall - outcome.overall
  const slow = result.contributions.filter((c) => PROJECTS_BY_ID[c.projectId].longTermMultiplier >= 1.4).map((c) => `«${c.title}»`)

  const summary = [
    kk
      ? `${horizon === '1y' ? '1 жылдан' : '3 жылдан'} кейін жалпы өмір сапасы көрсеткіші ${change(outcome.overall - result.overallBefore)} ұпайға өзгереді (${n(result.overallBefore)} → ${n(outcome.overall)}).`
      : `After ${horizon === '1y' ? '1 year' : '3 years'}, the overall quality-of-life score changes by ${change(outcome.overall - result.overallBefore)} points (${n(result.overallBefore)} → ${n(outcome.overall)}).`,
    kk
      ? `Ең үлкен өсім — «${metric(best.m)}» (${change(best.d)}), оған «${bestProject.title}» жобасы көбірек үлес қосты. Ең аз өзгеріс — «${metric(worst.m)}» (${change(worst.d)}).`
      : `The largest gain is in ${metric(best.m)} (${change(best.d)}), led by “${bestProject.title}”; the smallest change is in ${metric(worst.m)} (${change(worst.d)}).`,
    most.allocatedBudget - least.allocatedBudget >= 4
      ? kk
        ? `Ресурстарды бөлу ымыраны талап етеді: ең көп қаржы «${category(most.category)}» бағытына (${most.allocatedBudget} бірлік), ең аз қаржы «${category(least.category)}» бағытына (${least.allocatedBudget} бірлік) бөлінді.`
        : `The trade-off is in funding: ${category(most.category)} receives the most (${most.allocatedBudget} units), while ${category(least.category)} receives the least (${least.allocatedBudget} units).`
      : kk
        ? `Бюджет біркелкі бөлінген: әр бағытқа ${least.allocatedBudget}–${most.allocatedBudget} бірлік, айқын теңгерімсіздік жоқ.`
        : `Funding is spread evenly at ${least.allocatedBudget}–${most.allocatedBudget} units per area, with no major imbalance.`,
    horizon === '1y'
      ? kk
        ? `3 жылдан кейін AQLS ${n(other.overall)} болады (${change(diff)})${slow.length ? `: ${slow.join(', ')} жобаларының әсері күшейеді` : ''}${other.penaltyTotal > outcome.penaltyTotal ? ', бірақ қызмет көрсетуге байланысты шегерімдер де артады' : ''}.`
        : `After 3 years, AQLS reaches ${n(other.overall)} (${change(diff)})${slow.length ? ` as ${slow.join(', ')} develop their longer-term effects` : ''}${other.penaltyTotal > outcome.penaltyTotal ? ', with higher maintenance penalties' : ''}.`
      : kk
        ? `Алғашқы жылмен салыстырғанда AQLS ${n(Math.abs(diff))} ұпайға ${diff <= 0 ? 'жоғары' : 'төмен'}: жобалардың ұзақ мерзімді әсері мен қызмет көрсету шығындары ескерілген.`
        : `AQLS is ${n(Math.abs(diff))} points ${diff <= 0 ? 'higher' : 'lower'} than in the first year, reflecting longer-term project effects and maintenance costs.`,
  ].join(' ')

  const positives = padTo(outcome.positiveEffects, 3, kk ? [
    'Бес саланың бәріне қаржы бөлінді, әр бағытта жоба таңдалды.',
    `Жалпы AQLS: ${n(result.overallBefore)} → ${n(outcome.overall)}.`,
    `Стратегия сипаты: ${result.strategyProfile.title}.`,
  ] : [
    'All five areas receive funding, with a project selected in each.',
    `Overall AQLS: ${n(result.overallBefore)} → ${n(outcome.overall)}.`,
    `Strategy profile: ${result.strategyProfile.title}.`,
  ]).slice(0, 3)
  const risks = padTo(outcome.risks, 2, kk ? [
    'Модель сыртқы факторларды ескермейді, нәтижелер тек симуляцияға қатысты.',
    'Жобаларға қызмет көрсету шығындары ұзақ мерзімде көбірек әсер етеді.',
  ] : [
    'The model does not account for external factors; these are demonstration results.',
    'Project maintenance costs have a greater effect over the longer term.',
  ]).slice(0, 3)

  const donor = byBudget.find((d) => d.category !== worstDecision?.category)
  let recommendation: string
  if (worst.d >= best.d - 4 || !worstDecision) {
    recommendation = kk
      ? 'Бюджет теңгерімді бөлінген. 1 және 3 жылдық нәтижелерді салыстырып, тиімділігі ең төмен жобаны ауыстырып көріңіз.'
      : 'The allocation is balanced. Compare the 1-year and 3-year results, then try replacing the least efficient project.'
  } else if (donor && donor.allocatedBudget > worstDecision.allocatedBudget) {
    recommendation = kk
      ? `Өсімді теңестіру үшін «${category(donor.category)}» бағытынан (${donor.allocatedBudget} бірлік) «${category(worstDecision.category)}» бағытына (${worstDecision.allocatedBudget} бірлік) 3–5 бірлік ауыстырып көріңіз.`
      : `Try moving 3–5 units from ${category(donor.category)} (${donor.allocatedBudget} units) to ${category(worstDecision.category)} (${worstDecision.allocatedBudget} units) to even out the gains.`
  } else {
    recommendation = kk
      ? `«${category(worstDecision.category)}» бағыты көп қаржы алса да (${worstDecision.allocatedBudget} бірлік), өсімі төмен. Осы салада «${metric(worst.m)}» көрсеткішіне көбірек әсер ететін басқа жобаны сынап көріңіз.`
      : `${category(worstDecision.category)} is well funded (${worstDecision.allocatedBudget} units), but its gains are limited. Try another project in this area with a stronger effect on ${metric(worst.m)}.`
  }
  return { summary, positives, risks, recommendation, citizenReactions: citizenReactions(result, horizon, lang) }
}
