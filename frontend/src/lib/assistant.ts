import {
  BASELINE, CATEGORIES, CATEGORY_MAX_BUDGET, CATEGORY_MIN_BUDGET,
  METRICS, TENGE_BN_PER_UNIT, TOTAL_BUDGET, WEIGHTS,
} from '../data/baseline'
import { PROJECTS, PROJECTS_BY_ID } from '../data/projects'
import { SYNERGIES } from '../data/synergies'
import type { Category, CityProject, Metric } from '../types/project'
import type { DraftDecisions, SelectedDecision } from '../types/simulation'
import { balancedBudgets, bestProjectsFor } from './advisor'
import type { AdvisorAction } from './advisor'
import { calculateProjectEffect } from './calculateProjectEffect'
import { allocatedTotal, calculateSimulation, num, toDecisions, validateDecisions } from './calculateSimulation'
import { localizedCategory, localizedMetric, type Lang } from './i18n'
import { localizeProject, localizeSimulationResult, localizeSynergy } from './localizedContent'

export interface AssistantReply {
  answer: string
  actions: Array<{ label: string; do: AdvisorAction }>
}

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

type Language = Lang
const categoryLabel = localizedCategory
const metricLabel = localizedMetric
const normalize = (s: string) => s.toLocaleLowerCase().replace(/ё/g, 'е').trim()
const delta = (n: number) => `${n > 0 ? '+' : ''}${num(n)}`

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function category(value: unknown): value is Category {
  return typeof value === 'string' && CATEGORIES.includes(value as Category)
}

function budget(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= CATEGORY_MIN_BUDGET && value <= CATEGORY_MAX_BUDGET
}

function validProject(projectId: unknown, projectCategory: Category): projectId is string {
  return typeof projectId === 'string' && Object.hasOwn(PROJECTS_BY_ID, projectId)
    && PROJECTS_BY_ID[projectId].category === projectCategory
}

/** Treat model responses and saved messages as untrusted input. Return canonical action data. */
export function validateAssistantAction(value: unknown): AdvisorAction | null {
  if (!record(value)) return null
  switch (value.type) {
    case 'run': return { type: 'run' }
    case 'balance': return { type: 'balance' }
    case 'goto': return category(value.category) ? { type: 'goto', category: value.category } : null
    case 'select':
      return category(value.category) && validProject(value.projectId, value.category)
        ? { type: 'select', category: value.category, projectId: value.projectId } : null
    case 'budget':
      return category(value.category) && budget(value.amount)
        ? { type: 'budget', category: value.category, amount: value.amount } : null
    case 'plan': {
      if (!Array.isArray(value.decisions) || value.decisions.length !== CATEGORIES.length) return null
      const decisions: SelectedDecision[] = []
      const seen = new Set<Category>()
      for (const d of value.decisions) {
        if (!record(d) || !category(d.category) || seen.has(d.category)
          || !validProject(d.projectId, d.category) || !budget(d.allocatedBudget)) return null
        seen.add(d.category)
        decisions.push({ category: d.category, projectId: d.projectId, allocatedBudget: d.allocatedBudget })
      }
      if (decisions.reduce((sum, d) => sum + d.allocatedBudget, 0) !== TOTAL_BUDGET) return null
      return { type: 'plan', decisions: decisions.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)) }
    }
    default: return null
  }
}

/** Navigation and running the simulation remain the UI's responsibility. */
export function applyAssistantAction(draft: DraftDecisions, value: unknown): DraftDecisions {
  const action = validateAssistantAction(value)
  if (!action) return draft
  switch (action.type) {
    case 'select':
      return { ...draft, [action.category]: { ...draft[action.category], projectId: action.projectId } }
    case 'budget':
      return { ...draft, [action.category]: { ...draft[action.category], allocatedBudget: action.amount } }
    case 'balance': return balancedBudgets(draft)
    case 'plan':
      return Object.fromEntries(action.decisions.map((d) => [d.category, {
        projectId: d.projectId, allocatedBudget: d.allocatedBudget,
      }])) as DraftDecisions
    default: return draft
  }
}

export function draftFingerprint(draft: DraftDecisions): string {
  return JSON.stringify(CATEGORIES.map((c) => [c, draft[c].projectId, draft[c].allocatedBudget]))
}

export function buildAssistantContext(draft: DraftDecisions, screen = 'simulator', lang: Lang = 'ru') {
  const decisions = toDecisions(draft)
  const simulation = localizeSimulationResult(calculateSimulation(decisions), lang)
  return {
    screen,
    decisions,
    allocated: allocatedTotal(draft),
    budgets: Object.fromEntries(CATEGORIES.map((c) => [c, draft[c].allocatedBudget])) as Record<Category, number>,
    catalog: lang === 'ru' ? PROJECTS : PROJECTS.map((p) => localizeProject(p, lang)),
    synergies: lang === 'ru' ? SYNERGIES : SYNERGIES.map((s) => localizeSynergy(s, lang)),
    incomplete: validateDecisions(draft).length > 0,
    forecast: {
      overallBefore: simulation.overallBefore,
      oneYear: simulation.oneYear,
      threeYears: simulation.threeYears,
    },
  }
}

const TOPICS: Array<{ re: RegExp; metric: Metric }> = [
  { re: /мобил|транспорт|пробк|дорог|автобус|лрт|көлік|кептел|жол|mobility|transport|traffic|road|bus|lrt/, metric: 'mobility' },
  { re: /эколог|воздух|смог|зелен|озелен|дерев|полив|парк|ауа|көгал|ағаш|ecology|environment|green|tree|irrigation|park|air/, metric: 'ecology' },
  { re: /школ|детск|социал|медиц|поликлин|здоров|образован|әлеумет|мектеп|денсаулық|school|social|health|clinic|education/, metric: 'social' },
  { re: /безопас|освещ|преступ|дтп|камер|павод|қауіпсіз|жарық|safety|crime|lighting|camera|flood/, metric: 'safety' },
  { re: /сервис|обращен|жкх|тепл|мусор|отход|снег|госуслуг|қызмет|қоқыс|жылу|service|request|heating|waste|snow/, metric: 'services' },
]

function topicIn(text: string): Metric | undefined {
  return TOPICS.find((t) => t.re.test(normalize(text)))?.metric
}

function conversationTopic(question: string, history: AssistantHistoryMessage[]): Metric | undefined {
  const explicit = topicIn(question)
  if (explicit) return explicit
  if (!/^(а |и |ал |тағы|еще|ещё|почему|почему именно|зачем|а что|что еще|какой|какие|подробнее|сравни|продолж|неге|қайсы|толығырақ|and |what else|why|continue|compare|more|which)/i.test(question.trim())) return undefined
  for (const message of [...history].reverse()) {
    if (message.role !== 'user') continue
    const topic = topicIn(message.content)
    if (topic) return topic
  }
  return undefined
}

const PROJECT_ALIASES: Record<string, RegExp> = {
  'adaptive-traffic-lights': /светофор|бағдаршам/,
  'bus-lanes': /автобусн.{0,8}полос|выделенн.{0,8}полос|автобус жола/,
  'road-repair': /ремонт дорог|дорожн.{0,8}ремонт|жол жөндеу/,
  'smart-irrigation': /умн.{0,5}полив|ақылды суар/,
  'tree-planting': /посадк.{0,6}дерев|зелен.{0,5}пояс|ағаш отырғыз/,
  'courtyard-improvement': /благоустройств.{0,5}двор|ауланы абат/,
  'school-expansion': /расширени.{0,12}школ|школ.{0,10}расшир/,
  'mobile-clinics': /мобильн.{0,15}(мед|пункт)|медпункт/,
  'accessible-environment': /доступн.{0,10}сред|қолжетімді орта/,
  'street-lighting': /освещени.{0,5}(улиц|двор)|уличн.{0,5}освещ|көше жары/,
  'emergency-center': /центр.{0,5}реагиров/,
  'incident-analytics': /аналитик.{0,12}инцидент/,
  'digital-requests': /платформ.{0,5}обращен|цифров.{0,10}обращен/,
  'smart-snow-removal': /уборк.{0,6}снег|қар тазалау/,
  'waste-optimization': /вывоз.{0,6}(отход|мусор)/,
  'lrt-extension': /лрт|lrt/,
  'bike-lanes': /велодорож|велосипед жол/,
  'park-and-ride': /перехватывающ.{0,5}парков/,
  'esil-embankment': /набережн|жағалау/,
  'air-monitoring': /датчик.{0,15}воздух|мониторинг.{0,5}воздух/,
  'private-sector-gas': /газификац|газдандыр/,
  kindergartens: /детск.{0,4}сад|балабақша/,
  'sport-hubs': /спортивн.{0,5}площад|спорт алаң/,
  'senior-centers': /долголет/,
  'smart-cameras': /умн.{0,5}камер|ақылды камера/,
  'safe-crossings': /безопасн.{0,5}переход|переход.{0,8}школ/,
  'flood-protection': /павод|су тасқын/,
  'heat-network': /теплосет|теплов.{0,5}сет|жылу жел/,
  'egov-services': /проактивн.{0,5}госуслуг|egov/,
  'public-wifi': /wi[ -]?fi|вай.?фай/,
}

function namedProjects(text: string, lang: Language = 'ru'): CityProject[] {
  const normalized = normalize(text)
  return PROJECTS.filter((p) => normalized.includes(p.id)
    || normalized.includes(normalize(p.title)) || normalized.includes(normalize(localizeProject(p, lang).title))
    || PROJECT_ALIASES[p.id]?.test(normalized)).map((p) => localizeProject(p, lang))
}

function selectAction(project: CityProject, lang: Language): AssistantReply['actions'][number] {
  return {
    label: (lang === 'kk' ? 'Таңдау: ' : lang === 'en' ? 'Select: ' : 'Выбрать: ') + localizeProject(project, lang).title,
    do: { type: 'select', category: project.category, projectId: project.id },
  }
}

function budgetSummary(draft: DraftDecisions, lang: Language): string {
  const total = allocatedTotal(draft)
  const missing = CATEGORIES.filter((c) => !draft[c].projectId)
  const distribution = CATEGORIES.map((c) => `${categoryLabel(c, lang)} — ${draft[c].allocatedBudget}`).join('; ')
  const difference = TOTAL_BUDGET - total
  if (lang === 'en') return `Allocated: ${total}/${TOTAL_BUDGET} units (${total * TENGE_BN_PER_UNIT} bn ₸). ${distribution}. `
    + (difference > 0 ? `${difference} units remain to be allocated. ` : difference < 0 ? `The budget is over by ${-difference} units. ` : 'The budget is fully allocated. ')
    + (missing.length ? `Projects still needed: ${missing.map((c) => categoryLabel(c, lang)).join(', ')}.` : 'All five areas have a selected project.')
  if (lang === 'kk') {
    return `Бөлінгені: ${total}/${TOTAL_BUDGET} бірлік (${num(total * TENGE_BN_PER_UNIT)} млрд ₸). ${distribution}. `
      + (difference > 0 ? `Тағы ${difference} бірлік бөлу керек. ` : difference < 0 ? `Бюджет ${-difference} бірлікке асып кетті. ` : 'Бюджет толық бөлінді. ')
      + (missing.length ? `Жоба таңдалмаған: ${missing.map((c) => categoryLabel(c, lang)).join(', ')}.` : 'Бес салада да жоба таңдалған.')
  }
  return `Распределено ${total}/${TOTAL_BUDGET} ед. (${num(total * TENGE_BN_PER_UNIT)} млрд ₸). ${distribution}. `
    + (difference > 0 ? `Осталось распределить ${difference} ед. ` : difference < 0 ? `Превышение бюджета — ${-difference} ед. ` : 'Бюджет распределён полностью. ')
    + (missing.length ? `Проекты ещё не выбраны: ${missing.map((c) => categoryLabel(c, lang)).join(', ')}.` : 'Во всех пяти сферах выбраны проекты.')
}

function forecastSummary(draft: DraftDecisions, lang: Language): string {
  const context = buildAssistantContext(draft)
  const { overallBefore, oneYear, threeYears } = context.forecast
  if (lang === 'en') {
    const n = (value: number) => num(value).replace(',', '.')
    return (context.incomplete ? 'Preliminary calculation: the plan is incomplete or its budget is not valid. ' : '')
      + `Model AQLS: ${n(overallBefore)} now; ${n(oneYear.overall)} after 1 year; ${n(threeYears.overall)} after 3 years. Penalties are ${n(oneYear.penaltyTotal)} and ${n(threeYears.penaltyTotal)} points respectively. These are simulator results, not a real city forecast.`
  }
  const partial = context.incomplete
    ? lang === 'kk' ? 'Алдын ала есеп: жоспар әлі толық әрі жарамды емес. ' : 'Частичный предварительный расчёт: план ещё не заполнен или не прошёл проверку бюджета. '
    : ''
  return partial + (lang === 'kk'
    ? `Модельдегі AQLS: қазір ${num(overallBefore)}; 1 жылдан соң ${num(oneYear.overall)} (${delta(oneYear.overall - overallBefore)}); 3 жылдан соң ${num(threeYears.overall)} (${delta(threeYears.overall - overallBefore)}). Айыптар: ${num(oneYear.penaltyTotal)} және ${num(threeYears.penaltyTotal)} балл. Бұл — симулятор есебі, нақты қала болжамы емес.`
    : `AQLS по модели: сейчас ${num(overallBefore)}; через год ${num(oneYear.overall)} (${delta(oneYear.overall - overallBefore)}); через 3 года ${num(threeYears.overall)} (${delta(threeYears.overall - overallBefore)}). Штрафы: ${num(oneYear.penaltyTotal)} и ${num(threeYears.penaltyTotal)} балла соответственно. Это расчёт симулятора, а не прогноз реального города.`)
}

function nextActions(draft: DraftDecisions, lang: Language): AssistantReply['actions'] {
  const actions: AssistantReply['actions'] = []
  const missing = CATEGORIES.find((c) => !draft[c].projectId)
  if (missing) actions.push({ label: lang === 'kk' ? 'Жобаны таңдау' : lang === 'en' ? 'Choose a missing project' : 'Выбрать недостающий проект', do: { type: 'goto', category: missing } })
  if (allocatedTotal(draft) !== TOTAL_BUDGET || CATEGORIES.some((c) => draft[c].allocatedBudget < 10 || draft[c].allocatedBudget > 30)) {
    actions.push({ label: lang === 'kk' ? 'Бюджетті теңестіру' : lang === 'en' ? 'Balance budget' : 'Сбалансировать бюджет', do: { type: 'balance' } })
  }
  if (!validateDecisions(draft).length) actions.push({ label: lang === 'kk' ? 'Симуляцияны іске қосу' : lang === 'en' ? 'Run simulation' : 'Запустить симуляцию', do: { type: 'run' } })
  return actions
}

function createPlan(metric?: Metric, longTerm = false): DraftDecisions {
  const score = (p: CityProject) => {
    const general = METRICS.reduce((sum, m) => sum + p.effects[m] * WEIGHTS[m], 0)
    return (general + (metric ? p.effects[metric] * 0.6 : 0))
      * (longTerm ? p.longTermMultiplier : 1) / p.recommendedBudget
  }
  const draft = Object.fromEntries(CATEGORIES.map((c) => {
    const best = PROJECTS.filter((p) => p.category === c).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0]
    return [c, { projectId: best.id, allocatedBudget: best.recommendedBudget }]
  })) as DraftDecisions
  return balancedBudgets(draft)
}

/** Offline assistance is grounded in this simulator's catalogue and formulas, not a general-purpose LLM. */
export function getLocalAssistantReply(
  question: string,
  draft: DraftDecisions,
  history: AssistantHistoryMessage[] = [],
  lang: Language = 'ru',
): AssistantReply {
  if (lang === 'en') return englishLocalReply(question, draft, history)
  const q = normalize(question)
  const topic = conversationTopic(q, history)
  const named = namedProjects(q, lang)
  const reply = (answer: string, actions: AssistantReply['actions'] = []): AssistantReply => ({ answer, actions: actions.slice(0, 3) })

  if (/(состав|подбер|собер|предлож|созда|сделай|полный|готовый|сбалансированн).{0,45}(план|стратег|портфел|набор)|жоспар.{0,25}(құр|жаса|ұсын)|(құр|жаса|ұсын).{0,25}жоспар/.test(q)) {
    const plan = createPlan(topic, /3\s*год|три год|долгосроч|3\s*жыл|ұзақ/.test(q))
    const lines = CATEGORIES.map((c) => `${categoryLabel(c, lang)}: «${localizeProject(PROJECTS_BY_ID[plan[c].projectId!], lang).title}» — ${plan[c].allocatedBudget}`).join('\n')
    return reply((lang === 'kk'
      ? 'Бес салаға 100 бірлік бөлінген жоспар ұсынамын. Жобалар каталогтағы әсер мен ұсынылған бюджет қатынасы бойынша таңдалды; бұл кепілді оңтайлы шешім емес.\n'
      : 'Предлагаю план из пяти проектов на 100 ед. Проекты выбраны по соотношению модельного эффекта и рекомендуемого бюджета; это вариант для сравнения, без гарантии оптимальности.\n')
      + lines + '\n\n' + forecastSummary(plan, lang), [{ label: lang === 'kk' ? 'Жоспарды қолдану' : 'Применить весь план', do: { type: 'plan', decisions: toDecisions(plan) } }])
  }

  if (named.length >= 2) {
    const compared = named.slice(0, 3)
    const comparisonBudget = 20
    const lines = compared.map((p) => {
      const effects = calculateProjectEffect(p, comparisonBudget)
      const selectedMetric = topic ?? METRICS.reduce((best, m) => p.effects[m] > p.effects[best] ? m : best, 'mobility' as Metric)
      return `«${p.title}»: ${metricLabel(selectedMetric, lang)} ${delta(effects.effectOneYear[selectedMetric])} / ${delta(effects.effectThreeYears[selectedMetric])}; `
        + (lang === 'kk' ? `ұсынылған бюджет ${p.recommendedBudget}, қызмет көрсету ${p.maintenanceCost}/4.` : `рекомендуемый бюджет ${p.recommendedBudget}, обслуживание ${p.maintenanceCost}/4.`)
    }).join('\n')
    return reply((lang === 'kk'
      ? `Әр жобаға бірдей ${comparisonBudget} бірлік берілгендегі салыстыру (1 жыл / 3 жыл; басқа жобалар, синергиялар мен айыптарсыз):\n`
      : `Сравнение при одинаковом бюджете ${comparisonBudget} ед. на проект (1 год / 3 года, без остальных проектов, синергий и штрафов):\n`)
      + lines + (lang === 'kk' ? '\nБір салада бір ғана жоба таңдалады.' : '\nВ одной сфере можно выбрать только один проект.'), compared.map((p) => selectAction(p, lang)))
  }

  const requestedCategory = CATEGORIES.find((c) => q.includes(c) || normalize(categoryLabel(c, lang)).split(' ').some((word) => word.length > 4 && q.includes(word.slice(0, -2))))
  const amountMatch = q.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$|[.,!?])/)
  if (requestedCategory && amountMatch && /выдел|постав|установ|дай|направ|увелич|уменьш|бөл|бер/.test(q)) {
    const amount = Number(amountMatch[1].replace(',', '.')) / (/млрд/.test(q) ? TENGE_BN_PER_UNIT : 1)
    if (!budget(amount)) return reply(lang === 'kk' ? 'Әр салаға 5–40 аралығындағы бүтін бірлік бөлуге болады.' : 'На сферу можно выделить целое число от 5 до 40 единиц.')
    const resultingTotal = allocatedTotal(draft) - draft[requestedCategory].allocatedBudget + amount
    return reply(lang === 'kk'
      ? `${categoryLabel(requestedCategory, lang)}: ${draft[requestedCategory].allocatedBudget} → ${amount} бірлік. Жалпы бюджет ${resultingTotal}/100 болады. Өзгеріс батырманы басқанда қолданылады.`
      : `${categoryLabel(requestedCategory, lang)}: ${draft[requestedCategory].allocatedBudget} → ${amount} ед. Итоговая сумма станет ${resultingTotal}/100. Изменение применится по кнопке.`,
    [{ label: lang === 'kk' ? 'Бюджетті қолдану' : 'Применить бюджет', do: { type: 'budget', category: requestedCategory, amount } }])
  }

  if (/бюджет|деньг|тенге|млрд|штраф|перекос|ақша|айып/.test(q)) {
    const penalties = calculateSimulation(toDecisions(draft))
    const skewed = CATEGORIES.filter((c) => draft[c].allocatedBudget < 10 || draft[c].allocatedBudget > 30)
    const actions = nextActions(draft, lang)
    if (/баланс|выровн|распредел|теңест/.test(q) && !actions.some((a) => a.do.type === 'balance')) {
      actions.unshift({ label: lang === 'kk' ? 'Бюджетті теңестіру' : 'Сбалансировать бюджет', do: { type: 'balance' } })
    }
    return reply(budgetSummary(draft, lang) + '\n\n' + (lang === 'kk'
      ? `Шектер: әр салаға 5–40 бірлік. 10-нан төмен не 30-дан жоғары қаржы айыпқа әкеледі. Таңдалған жобалар бойынша 1 жылдағы айып: ${num(penalties.oneYear.penaltyTotal)}, 3 жылдағы: ${num(penalties.threeYears.penaltyTotal)}. Қызмет көрсету шығыны 12-ден асса, 3 жылдық есепке қосымша айып қосылады.`
      : `Допустимо 5–40 ед. на сферу; ниже 10 и выше 30 появляются штрафы. По выбранным проектам штраф через год — ${num(penalties.oneYear.penaltyTotal)}, через 3 года — ${num(penalties.threeYears.penaltyTotal)}. Обслуживание свыше 12 даёт дополнительный штраф на горизонте 3 лет.`)
      + (skewed.length ? '\n' + skewed.map((c) => `${categoryLabel(c, lang)}: ${draft[c].allocatedBudget}`).join('; ') : ''), actions)
  }

  if (/прогноз|результат|симуляц|aqls|год|горизонт|болжам|нәтиже|жыл/.test(q)
    || /проверь|провер|оцени|анализ|текущ|мой план|мои проект|что.{0,12}улучш|что дальше|қазіргі|тексер|бағала|шешімдерімді/.test(q)) {
    const result = calculateSimulation(toDecisions(draft))
    const weakest = METRICS.reduce((a, b) => result.afterOneYear[a] - BASELINE[a] <= result.afterOneYear[b] - BASELINE[b] ? a : b)
    const chosen = new Set(toDecisions(draft).map((d) => d.projectId))
    const suggestion = bestProjectsFor(weakest, 1, chosen)[0]
    const actions = nextActions(draft, lang)
    if (suggestion && toDecisions(draft).length > 0) actions.push(selectAction(suggestion, lang))
    return reply(budgetSummary(draft, lang) + '\n\n' + forecastSummary(draft, lang)
      + (topic ? '\n' + (lang === 'kk'
        ? `${metricLabel(topic, lang)}: қазір ${num(BASELINE[topic])}; 1 жылда ${num(result.afterOneYear[topic])}; 3 жылда ${num(result.afterThreeYears[topic])}.`
        : `${metricLabel(topic, lang)}: сейчас ${num(BASELINE[topic])}; через год ${num(result.afterOneYear[topic])}; через 3 года ${num(result.afterThreeYears[topic])}.`) : '')
      + (toDecisions(draft).length ? '\n' + (lang === 'kk'
        ? `Ең аз өзгеріс: ${metricLabel(weakest, lang)} (${delta(result.afterOneYear[weakest] - BASELINE[weakest])}).`
        : `Наименьшее изменение: ${metricLabel(weakest, lang)} (${delta(result.afterOneYear[weakest] - BASELINE[weakest])}).`) : ''), actions)
  }

  if (/синерги|бірге/.test(q)) {
    const chosen = new Set(toDecisions(draft).map((d) => d.projectId))
    const active = SYNERGIES.filter((s) => s.projects.every((id) => chosen.has(id)))
    const near = SYNERGIES.filter((s) => s.projects.filter((id) => chosen.has(id)).length === 1).slice(0, 3)
    const lines = (active.length ? active : near.length ? near : SYNERGIES.slice(0, 3)).map((s) => localizeSynergy(s, lang).description).join('\n')
    return reply((lang === 'kk' ? `Белсенді синергиялар: ${active.length}. Бонус үшін екі жоба да таңдалуы керек.\n` : `Активных синергий: ${active.length}. Бонус появляется, когда выбраны оба проекта пары.\n`)
      + lines, near.map((s) => selectAction(PROJECTS_BY_ID[s.projects.find((id) => !chosen.has(id))!], lang)))
  }

  if (named.length === 1) {
    const p = named[0]
    const amount = draft[p.category].allocatedBudget
    const effects = calculateProjectEffect(p, amount)
    const effectText = METRICS.filter((m) => p.effects[m] !== 0).map((m) => `${metricLabel(m, lang)} ${delta(effects.effectOneYear[m])}`).join('; ')
    return reply(`«${p.title}». ${p.shortDescription}\n` + (lang === 'kk'
      ? `Осы саладағы ${amount} бірлік бюджетпен 1 жылдағы жеке әсер: ${effectText}. Ұсынылған бюджет: ${p.recommendedBudget}. 3 жылдағы әсер коэффициенті: ×${p.longTermMultiplier}; қызмет көрсету: ${p.maintenanceCost}/4. Каталогтағы тәуекел: ${p.risks[0]}.`
      : `При текущем бюджете сферы ${amount} ед. отдельный эффект через год: ${effectText}. Рекомендуется ${p.recommendedBudget} ед. Коэффициент эффекта через 3 года: ×${p.longTermMultiplier}; обслуживание: ${p.maintenanceCost}/4. Риск из каталога: ${p.risks[0]}.`),
    draft[p.category].projectId === p.id ? [] : [selectAction(p, lang)])
  }

  if (topic) {
    const chosen = new Set(toDecisions(draft).map((d) => d.projectId))
    if (/еще|ещё|друг|альтернатив|тағы|басқа/.test(q)) {
      const previous = [...history].reverse().find((message) => message.role === 'assistant')
      if (previous) namedProjects(previous.content, lang).forEach((p) => chosen.add(p.id))
    }
    const projects = bestProjectsFor(topic, 3, chosen).map((p) => localizeProject(p, lang))
    const lines = projects.map((p) => `«${p.title}» (${categoryLabel(p.category, lang)}): ${delta(p.effects[topic])} / ${p.recommendedBudget} `
      + (lang === 'kk' ? 'бірлік' : 'ед.')).join('\n')
    return reply((lang === 'kk'
      ? `${metricLabel(topic, lang)} үшін каталогтағы баламалар (1 жылдағы әсер / ұсынылған бюджет):\n`
      : `Для показателя «${metricLabel(topic, lang)}» подойдут эти альтернативы из каталога (эффект через год / рекомендуемый бюджет):\n`)
      + lines + (lang === 'kk'
        ? '\nРеті әсер/бюджет қатынасына негізделген. Таңдау осы саладағы жобаны ауыстырады; бюджет сақталады. Нақты модельдік әсерді симуляция есептейді.'
        : '\nПорядок — по отношению эффекта к бюджету. Выбор заменит проект в его сфере, сохранив её бюджет. Итоговый эффект с синергиями и штрафами считает симуляция.'), projects.map((p) => selectAction(p, lang)))
  }

  return reply(lang === 'kk'
    ? 'Жергілікті режимде осы симулятордың жобалары мен есептеріне сүйенемін. Бюджетті тексеремін, екі жобаны салыстырамын, 1 және 3 жылдық нәтижені түсіндіремін немесе бес салаға жоспар ұсынамын. Мысалы: «Жоспар жаса», «Бюджетті тексер» немесе «Кептелісті қалай азайтамын?». Жалпы сұрақтарға еркін жауап беру үшін сервердегі AI қосылымы қажет.'
    : 'В локальном режиме опираюсь на проекты и расчёты этого симулятора. Могу проверить ваш бюджет, сравнить два проекта, объяснить результат через 1 и 3 года или составить план на пять сфер. Например: «Проверь мой план», «Сравни ЛРТ и автобусные полосы», «Составь план для экологии». Для свободного диалога на другие темы нужно подключение AI на сервере.')
}

function englishLocalReply(question: string, draft: DraftDecisions, history: AssistantHistoryMessage[]): AssistantReply {
  const q = normalize(question)
  const topic = conversationTopic(q, history)
  const named = namedProjects(q, 'en')
  const n = (value: number) => num(value).replace(',', '.')
  const signed = (value: number) => `${value > 0 ? '+' : ''}${n(value)}`
  const reply = (answer: string, actions: AssistantReply['actions'] = []): AssistantReply => ({ answer, actions: actions.slice(0, 3) })

  if (/(create|make|build|suggest|recommend|complete|balanced|full).{0,35}(plan|strategy|portfolio)/.test(q)) {
    const plan = createPlan(topic, /3.year|three.year|long.term/.test(q))
    const lines = CATEGORIES.map((c) => `${categoryLabel(c, 'en')}: ${localizeProject(PROJECTS_BY_ID[plan[c].projectId!], 'en').title} — ${plan[c].allocatedBudget}`).join('\n')
    return reply('Here is a five-project plan using 100 units. Projects are ranked by model effect per recommended budget unit; this is an option to compare, not a guaranteed optimum.\n'
      + lines + '\n\n' + forecastSummary(plan, 'en'), [{ label: 'Apply full plan', do: { type: 'plan', decisions: toDecisions(plan) } }])
  }

  if (named.length >= 2) {
    const projects = named.slice(0, 3)
    const lines = projects.map((p) => {
      const effects = calculateProjectEffect(p, 20)
      const m = topic ?? METRICS.reduce((best, candidate) => p.effects[candidate] > p.effects[best] ? candidate : best, 'mobility' as Metric)
      return `${p.title}: ${metricLabel(m, 'en')} ${signed(effects.effectOneYear[m])} / ${signed(effects.effectThreeYears[m])}; recommended budget ${p.recommendedBudget}, maintenance ${p.maintenanceCost}/4.`
    }).join('\n')
    return reply('Comparison at the same budget of 20 units per project (1 year / 3 years, excluding other projects, synergies and penalties):\n'
      + lines + '\nOnly one project can be selected in each area.', projects.map((p) => selectAction(p, 'en')))
  }

  const requestedCategory = CATEGORIES.find((c) => q.includes(c) || q.includes(categoryLabel(c, 'en').toLowerCase()))
  const amountMatch = q.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$|[.,!?])/)
  if (requestedCategory && amountMatch && /allocate|set|give|assign|increase|decrease/.test(q)) {
    const amount = Number(amountMatch[1].replace(',', '.')) / (/\b(?:bn|billion)\b/.test(q) ? TENGE_BN_PER_UNIT : 1)
    if (!budget(amount)) return reply('Each area must receive a whole number of units between 5 and 40.')
    const total = allocatedTotal(draft) - draft[requestedCategory].allocatedBudget + amount
    return reply(`${categoryLabel(requestedCategory, 'en')}: ${draft[requestedCategory].allocatedBudget} → ${amount} units. The total will become ${total}/100. Use the button to apply this change.`,
      [{ label: 'Apply budget', do: { type: 'budget', category: requestedCategory, amount } }])
  }

  if (/budget|money|tenge|penalt|imbalance|funding/.test(q)) {
    const result = calculateSimulation(toDecisions(draft))
    const actions = nextActions(draft, 'en')
    if (/balanc|distribut/.test(q) && !actions.some((a) => a.do.type === 'balance')) actions.unshift({ label: 'Balance budget', do: { type: 'balance' } })
    return reply(budgetSummary(draft, 'en') + `\n\nEach area allows 5–40 units. Funding below 10 or above 30 incurs a penalty. The selected projects have penalties of ${n(result.oneYear.penaltyTotal)} after 1 year and ${n(result.threeYears.penaltyTotal)} after 3 years. Total maintenance above 12 adds a further penalty to the 3-year result.`, actions)
  }

  if (/forecast|result|simulat|aqls|year|horizon|review|check|evaluate|my plan|my choices|improve my/.test(q)) {
    const result = calculateSimulation(toDecisions(draft))
    const weakest = METRICS.reduce((a, b) => result.afterOneYear[a] - BASELINE[a] <= result.afterOneYear[b] - BASELINE[b] ? a : b)
    const actions = nextActions(draft, 'en')
    const suggestion = bestProjectsFor(weakest, 1, new Set(toDecisions(draft).map((d) => d.projectId)))[0]
    if (suggestion && toDecisions(draft).length) actions.push(selectAction(suggestion, 'en'))
    return reply(budgetSummary(draft, 'en') + '\n\n' + forecastSummary(draft, 'en')
      + (topic ? `\n${metricLabel(topic, 'en')}: ${n(BASELINE[topic])} now; ${n(result.afterOneYear[topic])} after 1 year; ${n(result.afterThreeYears[topic])} after 3 years.` : '')
      + (toDecisions(draft).length ? `\nSmallest change: ${metricLabel(weakest, 'en')} (${signed(result.afterOneYear[weakest] - BASELINE[weakest])}).` : ''), actions)
  }

  if (/synerg|combined effect/.test(q)) {
    const chosen = new Set(toDecisions(draft).map((d) => d.projectId))
    const active = SYNERGIES.filter((s) => s.projects.every((id) => chosen.has(id)))
    const near = SYNERGIES.filter((s) => s.projects.filter((id) => chosen.has(id)).length === 1).slice(0, 3)
    const lines = (active.length ? active : near.length ? near : SYNERGIES.slice(0, 3)).map((s) => localizeSynergy(s, 'en').description).join('\n')
    return reply(`Active synergies: ${active.length}. Both projects in a pair must be selected to receive its bonus.\n` + lines,
      near.map((s) => selectAction(PROJECTS_BY_ID[s.projects.find((id) => !chosen.has(id))!], 'en')))
  }

  if (named.length === 1) {
    const p = named[0]
    const amount = draft[p.category].allocatedBudget
    const effects = calculateProjectEffect(p, amount)
    const effectText = METRICS.filter((m) => p.effects[m] !== 0).map((m) => `${metricLabel(m, 'en')} ${signed(effects.effectOneYear[m])}`).join('; ')
    return reply(`${p.title}. ${p.shortDescription}\nAt the area's current budget of ${amount} units, its individual 1-year effect is: ${effectText}. Recommended budget: ${p.recommendedBudget}. The 3-year effect multiplier is ×${p.longTermMultiplier}; maintenance is ${p.maintenanceCost}/4. Catalog risk: ${p.risks[0]}.`,
      draft[p.category].projectId === p.id ? [] : [selectAction(p, 'en')])
  }

  if (topic) {
    const chosen = new Set(toDecisions(draft).map((d) => d.projectId))
    if (/more|else|other|alternativ/.test(q)) {
      const previous = [...history].reverse().find((message) => message.role === 'assistant')
      if (previous) namedProjects(previous.content, 'en').forEach((p) => chosen.add(p.id))
    }
    const projects = bestProjectsFor(topic, 3, chosen).map((p) => localizeProject(p, 'en'))
    return reply(`Catalog options for ${metricLabel(topic, 'en')} (1-year effect / recommended budget):\n`
      + projects.map((p) => `${p.title} (${categoryLabel(p.category, 'en')}): ${signed(p.effects[topic])} / ${p.recommendedBudget} units`).join('\n')
      + '\nRanked by effect per budget unit. Selecting an option replaces the project in its area while keeping the budget. Run the simulation to calculate the combined result.', projects.map((p) => selectAction(p, 'en')))
  }
  return reply('Offline tips use this simulator’s catalog and calculations. I can check the budget, compare projects, explain 1-year and 3-year results, or suggest a five-area plan. Try “Check my budget” or “Create a green city plan”. General conversation requires an AI connection.')
}
