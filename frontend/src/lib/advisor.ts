import { BASELINE, CATEGORIES, CATEGORY_LABELS, CATEGORY_MAX_BUDGET, CATEGORY_MIN_BUDGET, METRIC_LABELS, METRICS, TOTAL_BUDGET } from '../data/baseline'
import { PROJECTS, PROJECTS_BY_ID } from '../data/projects'
import { SYNERGIES } from '../data/synergies'
import type { Category, Metric } from '../types/project'
import type { DraftDecisions } from '../types/simulation'
import { HIGH_BUDGET_THRESHOLD, LOW_BUDGET_THRESHOLD } from './calculatePenalties'
import { allocatedTotal, calculateSimulation, num, toDecisions } from './calculateSimulation'
import { fmtTenge } from './format'

/** Действие, которое помощник может выполнить сам по кнопке «Применить». */
export type AdvisorAction =
  | { type: 'goto'; category: Category }
  | { type: 'select'; category: Category; projectId: string }
  | { type: 'balance' }
  | { type: 'run' }

export interface Tip {
  id: string
  tone: 'info' | 'warn' | 'good'
  text: string
  action?: { label: string; do: AdvisorAction }
}

/** Рекомендуемые бюджеты выбранных проектов, пропорционально доведённые до 100 с учётом границ 5–40. */
export function balancedBudgets(draft: DraftDecisions): DraftDecisions {
  const rec = CATEGORIES.map((c) => (draft[c].projectId ? PROJECTS_BY_ID[draft[c].projectId!].recommendedBudget : 20))
  const sum = rec.reduce((a, b) => a + b, 0)
  const scaled = rec.map((r) => Math.max(CATEGORY_MIN_BUDGET, Math.min(CATEGORY_MAX_BUDGET, Math.round((r * TOTAL_BUDGET) / sum))))
  let diff = TOTAL_BUDGET - scaled.reduce((a, b) => a + b, 0)
  for (let i = 0; diff !== 0 && i < 200; i++) {
    const j = i % scaled.length
    const step = diff > 0 ? 1 : -1
    if (scaled[j] + step >= CATEGORY_MIN_BUDGET && scaled[j] + step <= CATEGORY_MAX_BUDGET) {
      scaled[j] += step
      diff -= step
    }
  }
  const next = { ...draft }
  CATEGORIES.forEach((c, i) => (next[c] = { ...draft[c], allocatedBudget: scaled[i] }))
  return next
}

/** Контекстные советы по текущему черновику. Детерминированы — работают без AI. */
export function adviseDraft(draft: DraftDecisions): Tip[] {
  const tips: Tip[] = []
  const missing = CATEGORIES.filter((c) => !draft[c].projectId)
  const chosen = new Set(CATEGORIES.map((c) => draft[c].projectId).filter(Boolean) as string[])

  if (missing.length === CATEGORIES.length) {
    tips.push({
      id: 'start',
      tone: 'info',
      text: 'Начните с транспорта: у него самый большой вес в AQLS (25%). Выберите по одному проекту в каждой из пяти сфер.',
      action: { label: 'К транспорту', do: { type: 'goto', category: 'transport' } },
    })
  } else if (missing.length > 0) {
    tips.push({
      id: 'missing',
      tone: 'warn',
      text: `Осталось выбрать проекты: ${missing.map((c) => `«${CATEGORY_LABELS[c]}»`).join(', ')}.`,
      action: { label: 'Перейти', do: { type: 'goto', category: missing[0] } },
    })
  }

  // Синергии: выбранный проект + недостающий партнёр в другой сфере
  for (const syn of SYNERGIES) {
    const [a, b] = syn.projects
    const have = chosen.has(a) ? a : chosen.has(b) ? b : null
    const partner = have === a ? b : have === b ? a : null
    if (!have || !partner || chosen.has(partner)) continue
    const p = PROJECTS_BY_ID[partner]
    tips.push({
      id: `syn-${syn.id}`,
      tone: 'good',
      text: `Синергия рядом: добавьте «${p.title}» в сфере «${CATEGORY_LABELS[p.category]}» — ${syn.description.split(': ')[1]}.`,
      action: { label: 'Выбрать', do: { type: 'select', category: p.category, projectId: partner } },
    })
    if (tips.filter((t) => t.id.startsWith('syn-')).length >= 2) break
  }

  const total = allocatedTotal(draft)
  const skewed = CATEGORIES.filter(
    (c) => draft[c].allocatedBudget < LOW_BUDGET_THRESHOLD || draft[c].allocatedBudget > HIGH_BUDGET_THRESHOLD,
  )
  if (total !== TOTAL_BUDGET) {
    tips.push({
      id: 'budget',
      tone: 'warn',
      text:
        total < TOTAL_BUDGET
          ? `Не распределено ${TOTAL_BUDGET - total} ед. (${fmtTenge(TOTAL_BUDGET - total)}). Могу разложить бюджет по рекомендуемым суммам проектов.`
          : `Бюджет превышен на ${total - TOTAL_BUDGET} ед. (${fmtTenge(total - TOTAL_BUDGET)}). Могу выровнять его по рекомендациям.`,
      action: { label: 'Выровнять', do: { type: 'balance' } },
    })
  } else if (skewed.length) {
    tips.push({
      id: 'skew',
      tone: 'warn',
      text: `Штраф за перекос: ${skewed.map((c) => `«${CATEGORY_LABELS[c]}» — ${draft[c].allocatedBudget} ед.`).join(', ')}. Держите каждую сферу в пределах 10–30 ед.`,
      action: { label: 'Выровнять', do: { type: 'balance' } },
    })
  }

  // Слабейший показатель прогноза и лучший проект под него
  const decisions = toDecisions(draft)
  if (decisions.length >= 3) {
    const r = calculateSimulation(decisions)
    const weakest = METRICS.map((m) => ({ m, d: r.afterOneYear[m] - BASELINE[m] })).sort((a, b) => a.d - b.d)[0]
    const best = bestProjectsFor(weakest.m, 1, chosen)[0]
    if (best && !chosen.has(best.id)) {
      tips.push({
        id: 'weak',
        tone: 'info',
        text: `Слабее всего растёт «${METRIC_LABELS[weakest.m]}» (+${num(weakest.d)}). Сильнее всего её поднимает «${best.title}» (+${best.effects[weakest.m]}) в сфере «${CATEGORY_LABELS[best.category]}».`,
        action: { label: 'Выбрать', do: { type: 'select', category: best.category, projectId: best.id } },
      })
    }
  }

  if (missing.length === 0 && total === TOTAL_BUDGET && !skewed.length) {
    tips.unshift({ id: 'ready', tone: 'good', text: 'Всё готово: пять проектов, ровно 100 ед., без перекосов. Запускайте симуляцию!', action: { label: 'Запустить', do: { type: 'run' } } })
  }
  return tips.slice(0, 4)
}

export function bestProjectsFor(metric: Metric, n = 3, exclude: Set<string> = new Set()) {
  return [...PROJECTS]
    .filter((p) => !exclude.has(p.id))
    .sort((a, b) => b.effects[metric] / b.recommendedBudget - a.effects[metric] / a.recommendedBudget || b.effects[metric] - a.effects[metric])
    .slice(0, n)
}

const TOPICS: { re: RegExp; metric?: Metric; kind?: 'penalty' | 'budget' | 'synergy' | 'horizon' }[] = [
  { re: /штраф|перекос|айыппұл/i, kind: 'penalty' },
  { re: /синерг/i, kind: 'synergy' },
  { re: /тенге|₸|млрд|бюджет|деньг|ақша/i, kind: 'budget' },
  { re: /3 год|три год|долгосроч|горизонт|жыл/i, kind: 'horizon' },
  { re: /мобильн|транспорт|пробк|дорог|автобус|лрт|көлік/i, metric: 'mobility' },
  { re: /эколог|воздух|смог|зелен|зелён|дерев|парк/i, metric: 'ecology' },
  { re: /школ|сад|социал|медиц|поликлин|здоров|әлеумет/i, metric: 'social' },
  { re: /безопас|освещ|преступ|дтп|камер|қауіпсіз/i, metric: 'safety' },
  { re: /сервис|обращен|жкх|тепл|мусор|отход|снег/i, metric: 'services' },
]

/** Ответ помощника без LLM: по ключевым словам вопроса и данным каталога. */
export function answerLocally(question: string): string {
  const topic = TOPICS.find((t) => t.re.test(question))
  if (!topic) {
    return 'Я могу подсказать, какие проекты поднимают конкретный показатель (например: «как снизить пробки?»), объяснить штрафы, синергии, бюджет в тенге или разницу между горизонтами 1 и 3 года.'
  }
  if (topic.metric) {
    const top = bestProjectsFor(topic.metric)
    return `Лучше всего «${METRIC_LABELS[topic.metric]}» на единицу бюджета поднимают: ${top
      .map((p) => `«${p.title}» (${CATEGORY_LABELS[p.category]}, +${p.effects[topic.metric!]} за ${fmtTenge(p.recommendedBudget)})`)
      .join('; ')}. Помните: в каждой сфере можно выбрать только один проект.`
  }
  switch (topic.kind) {
    case 'penalty':
      return `Штраф за перекос — 0,25 балла за каждую единицу ниже ${LOW_BUDGET_THRESHOLD} и 0,15 балла за каждую единицу выше ${HIGH_BUDGET_THRESHOLD} в любой сфере. Через 3 года добавляется штраф за обслуживание: 0,5 балла за каждую единицу суммарных расходов выше 12. Подробности — в окне «Как считаются штрафы».`
    case 'synergy':
      return `Синергии дают бонус, если выбраны оба проекта пары. Всего их ${SYNERGIES.length}, например: ${SYNERGIES.slice(0, 3)
        .map((s) => s.description)
        .join('; ')}.`
    case 'budget':
      return `У вас ${TOTAL_BUDGET} ед. = ${fmtTenge(TOTAL_BUDGET)} (1 ед. = ${fmtTenge(1)}). На сферу — от ${CATEGORY_MIN_BUDGET} до ${CATEGORY_MAX_BUDGET} ед. Эффект растёт как корень из бюджета: вдвое меньше денег даёт около 71% эффекта, а переплата — не больше +15%.`
    case 'horizon':
      return 'Через 1 год сильнее быстрые проекты (ремонт дорог, камеры, цифровые сервисы). Через 3 года раскрываются долгосрочные: посадка деревьев (×1,8), ЛРТ (×1,6), школы (×1,5) — но растут расходы на обслуживание.'
  }
  return ''
}
