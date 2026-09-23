import { CITY_PROBLEMS, METRICS } from '../data/baseline'
import type { District, DistrictId } from '../data/districts'
import { PROJECT_COPY } from '../data/locales/projects'
import { PROJECTS_BY_ID } from '../data/projects'
import { SYNERGIES } from '../data/synergies'
import type { CityProject, Metric, Synergy } from '../types/project'
import type { AppliedPenalty, Horizon, HorizonOutcome, SimulationResult, StrategyProfile, StrategyProfileId } from '../types/simulation'
import {
  HIGH_BUDGET_THRESHOLD, HIGH_PENALTY_PER_UNIT,
  LOW_BUDGET_THRESHOLD, LOW_PENALTY_PER_UNIT,
  MAINTENANCE_THRESHOLD, MAINTENANCE_PENALTY_PER_UNIT,
} from './calculatePenalties'
import { localizedCategory, localizedMetric, type Lang } from './i18n'

type TranslatedLang = Exclude<Lang, 'ru'>
type DistrictCopy = Pick<District, 'name' | 'short' | 'profile' | 'problems'>

const DISTRICT_COPY: Record<'kk' | 'en', Record<DistrictId, DistrictCopy>> = {
  kk: {
    esil: { name: 'Есіл ауданы', short: 'Есіл', profile: 'Сол жағалау: жаңа іскерлік орталық, тұрғын үй құрылысы қарқынды жүріп жатыр.', problems: ['Қарбалас уақытта Есіл үстіндегі көпірлерде кептеліс болады', 'Жаңа шағын аудандардағы мектептерде орын жетіспейді', 'Бизнес орталықтарының маңында тұрақ аз'] },
    almaty: { name: 'Алматы ауданы', short: 'Алматы', profile: 'Оң жағалау: тығыз салынған ғимараттар және шет жақтағы жеке үйлер.', problems: ['Жылу және сумен жабдықтау желілері тозған', 'Жеке үйлерді пешпен жылыту ауаны ластайды', 'Тұрғындардың өтініштері ұзақ қаралады'] },
    saryarka: { name: 'Сарыарқа ауданы', short: 'Сарыарқа', profile: 'Тарихи орталық және ескі тұрғын үйлер.', problems: ['Аулалар қараңғы, жарықтандыру жеткіліксіз', 'Тұрғын үйлер ескі, аулалар тар', 'Тығыз салынған кварталдарда жасыл аймақ аз'] },
    baikonur: { name: 'Байқоңыр ауданы', short: 'Байқоңыр', profile: 'Қаланың солтүстігі: өнеркәсіп аймақтары мен теміржол вокзалы.', problems: ['Өнеркәсіп шығарындылары ауаны ластайды', 'Қоқыс контейнерлері толып кетеді', 'Қоғамдық көлікпен орталыққа жету ұзаққа созылады'] },
    nura: { name: 'Нұра ауданы', short: 'Нұра', profile: 'Ең жас аудан: жаңа кварталдар мен жеке үйлер.', problems: ['Үй маңында мектеп пен емхана жетіспейді', 'Топырақ жолдар көп, аялдамалар аз', 'Жеке үйлер орналасқан көшелерде жарық жоқ'] },
  },
  en: {
    esil: { name: 'Esil District', short: 'Esil', profile: 'Left bank: a new business centre and rapid housing growth.', problems: ['Rush-hour congestion on bridges across the Esil', 'Overcrowded schools in new neighbourhoods', 'Too few parking spaces near business centres'] },
    almaty: { name: 'Almaty District', short: 'Almaty', profile: 'Right bank: dense development and private homes on the outskirts.', problems: ['Ageing heating and water networks', 'Smog from stove heating in private homes', 'Slow responses to residents’ requests'] },
    saryarka: { name: 'Saryarka District', short: 'Saryarka', profile: 'The historic centre and older residential buildings.', problems: ['Dark courtyards and insufficient lighting', 'Ageing housing and cramped courtyards', 'Too few green spaces in densely built areas'] },
    baikonur: { name: 'Baikonur District', short: 'Baikonur', profile: 'The north of the city: industrial areas and the railway station.', problems: ['Industrial air pollution', 'Overflowing waste containers', 'Long journeys to the centre by public transport'] },
    nura: { name: 'Nura District', short: 'Nura', profile: 'The newest district: new neighbourhoods and private homes.', problems: ['Too few schools and clinics close to homes', 'Unpaved roads and too few bus stops', 'Unlit streets in areas of private housing'] },
  },
}

const CITY_PROBLEMS_COPY: Record<'kk' | 'en', string[]> = {
  kk: ['Қарбалас уақытта жолдарда кептеліс болады', 'Жасыл аймақтар жеткіліксіз', 'Мектептер мен емханалардың жүктемесі жоғары', 'Кейбір аумақтарда жарықтандыру жеткіліксіз', 'Тұрғындардың өтініштері ұзақ қаралады'],
  en: ['Road congestion during rush hour', 'Too few green spaces', 'Pressure on schools and clinics', 'Insufficient lighting in some areas', 'Slow handling of residents’ requests'],
}

const PROFILE_COPY: Record<'kk' | 'en', Record<StrategyProfileId, Omit<StrategyProfile, 'id'>>> = {
  kk: {
    technocrat: { title: 'Технократ', description: 'Бюджеттің басым бөлігі көлік пен қалалық қызметтерге бөлінді. Қаланың жұмысы тиімді бола түсті, бірақ әлеуметтік сала мен көгалдандыруға ресурс азырақ тиді.' },
    green: { title: 'Экологияға басымдық беретін басшы', description: 'Басты бағыт — көгалдандыру мен экология. Нәтиже ұзақ мерзімде айқынырақ көрінеді.' },
    social: { title: 'Әлеуметтік салаға бағдарланған басшы', description: 'Негізгі назар мектептерге, медицинаға және кедергісіз ортаға аударылды. Тұрғындардың әлеуметтік қолдауға қолжетімділігі артады.' },
    safety: { title: 'Қауіпсіздікті бірінші орынға қоятын басшы', description: 'Бюджеттің ең үлкен үлесі қауіпсіздікке: жарықтандыруға, жедел әрекет етуге және алдын алу шараларына бөлінді.' },
    services: { title: 'Қалалық қызметтерді жаңартушы', description: 'Басымдық өтініштерді қарау, тазалау және қалдықтарды шығару сияқты қалалық қызметтерге берілді. Қаладағы күнделікті өмір ыңғайлы бола түседі.' },
    balanced: { title: 'Теңгерімді басшы', description: 'Бюджет бағыттар арасында біркелкі бөлінді. Ешбір сала назардан тыс қалған жоқ.' },
  },
  en: {
    technocrat: { title: 'Technocrat', description: 'Most of the budget went to transport and city services. The city became more efficient, while social services and greening received fewer resources.' },
    green: { title: 'Green leader', description: 'Greening and the environment are the priorities. The benefits become more visible over the longer term.' },
    social: { title: 'Socially focused leader', description: 'Schools, healthcare and accessibility are the main priorities. Residents gain better access to social support.' },
    safety: { title: 'Safety-first leader', description: 'The largest share of the budget went to safety: lighting, emergency response and prevention.' },
    services: { title: 'City services reformer', description: 'The focus is on resident requests, cleaning and waste collection. Everyday city services become more convenient.' },
    balanced: { title: 'Balanced leader', description: 'The budget is distributed without sharp imbalances. Every area receives attention.' },
  },
}

/** Translate display fields only. IDs, categories and simulation coefficients stay unchanged. */
export function localizeProject(project: CityProject, lang: Lang): CityProject {
  if (lang === 'ru') return project
  const copy = PROJECT_COPY[lang][project.id]
  return copy ? { ...project, ...copy, benefits: [...copy.benefits], risks: [...copy.risks], tags: [...copy.tags] } : project
}

export function localizeDistrict<T extends District>(district: T, lang: Lang): T {
  if (lang === 'ru') return district
  const copy = DISTRICT_COPY[lang][district.id]
  return { ...district, ...copy, problems: [...copy.problems] }
}

export function localizeSynergy(synergy: Synergy, lang: Lang): Synergy {
  if (lang === 'ru') return synergy
  const titles = synergy.projects.map((id) => localizeProject(PROJECTS_BY_ID[id], lang).title)
  const bonus = Object.entries(synergy.bonus).map(([metric, points]) => {
    const label = localizedMetric(metric as Metric, lang).toLocaleLowerCase(lang)
    return lang === 'kk' ? `${label}: +${points}` : `+${points} ${label}`
  }).join(', ')
  return { ...synergy, description: `${titles.join(' + ')}: ${bonus}` }
}

/** Older result snapshots store a synergy description rather than its identifier. */
export function localizedSynergyDescription(description: string, lang: Lang): string {
  const source = SYNERGIES.find((synergy) => synergy.description === description
    || localizeSynergy(synergy, 'kk').description === description
    || localizeSynergy(synergy, 'en').description === description)
  return source ? localizeSynergy(source, lang).description : description
}

export function localizeProfile(profile: StrategyProfile, lang: Lang): StrategyProfile {
  return lang === 'ru' ? profile : { ...profile, ...PROFILE_COPY[lang][profile.id] }
}

function number(value: number, lang: TranslatedLang, digits?: number): string {
  return new Intl.NumberFormat(lang === 'kk' ? 'kk-KZ' : 'en-US', {
    maximumFractionDigits: digits ?? 1,
    ...(digits === undefined ? {} : { minimumFractionDigits: digits }),
    useGrouping: false,
  }).format(value)
}

/** Recover quantities from penalty metadata, never from the Russian description. */
export function localizePenalty(penalty: AppliedPenalty, lang: Lang): AppliedPenalty {
  if (lang === 'ru') return penalty
  const points = number(penalty.points, lang, 2)
  let description: string
  if (penalty.kind === 'maintenance') {
    const cost = number(MAINTENANCE_THRESHOLD + penalty.points / MAINTENANCE_PENALTY_PER_UNIT, lang)
    description = lang === 'kk'
      ? `Қызмет көрсетуге жұмсалатын жалпы шығын: ${cost} (шекті мәні ${MAINTENANCE_THRESHOLD}), айып ұпайы −${points}`
      : `Total maintenance cost: ${cost} (threshold ${MAINTENANCE_THRESHOLD}); penalty −${points}`
  } else {
    const low = penalty.kind === 'underfunded'
    const threshold = low ? LOW_BUDGET_THRESHOLD : HIGH_BUDGET_THRESHOLD
    const budget = number(low ? threshold - penalty.points / LOW_PENALTY_PER_UNIT : threshold + penalty.points / HIGH_PENALTY_PER_UNIT, lang)
    const category = penalty.category ? localizedCategory(penalty.category, lang) : lang === 'kk' ? 'Бағыт' : 'Category'
    description = lang === 'kk'
      ? `«${category}»: ${budget} бірлік — ${threshold} бірліктен ${low ? 'аз' : 'көп'}, айып ұпайы −${points}`
      : `${category}: ${budget} units — ${low ? 'below' : 'above'} ${threshold}; penalty −${points}`
  }
  return { ...penalty, description }
}

export function localizedCityProblems(lang: Lang): string[] {
  return [...(lang === 'ru' ? CITY_PROBLEMS : CITY_PROBLEMS_COPY[lang])]
}

/** Render computed results in the selected language without changing any simulation data. */
export function localizeSimulationResult(result: SimulationResult, lang: Lang): SimulationResult {
  if (lang === 'ru') return result
  const titles = new Map(result.contributions.map((c) => [c.projectId, localizeProject(PROJECTS_BY_ID[c.projectId], lang).title]))
  const selected = new Set(result.selectedDecisions.map((d) => d.projectId))
  const synergies = SYNERGIES.filter((s) => s.projects.every((id) => selected.has(id))).map((s) => localizeSynergy(s, lang).description)

  const localizeOutcome = (outcome: HorizonOutcome, horizon: Horizon): HorizonOutcome => {
    const deltas = METRICS.map((m) => ({ m, d: outcome.scores[m] - result.before[m] })).sort((a, b) => b.d - a.d)
    const effectKey = horizon === '1y' ? 'effectOneYear' : 'effectThreeYears'
    const positiveEffects: string[] = []
    for (const { m, d } of deltas.slice(0, 2)) {
      if (d <= 0) continue
      const top = [...result.contributions].sort((a, b) => b[effectKey][m] - a[effectKey][m])[0]
      if (!top) continue
      const title = titles.get(top.projectId)
      positiveEffects.push(lang === 'kk'
        ? `${localizedMetric(m, lang)}: +${number(d, lang)} — ең үлкен үлес «${title}» жобасынан.`
        : `${localizedMetric(m, lang)}: +${number(d, lang)} — the largest contribution comes from “${title}”.`)
    }
    for (const description of synergies) positiveEffects.push(`${lang === 'kk' ? 'Бірлескен әсер' : 'Synergy'}: ${description}.`)
    for (const c of result.contributions) {
      const project = PROJECTS_BY_ID[c.projectId]
      const title = titles.get(c.projectId)
      if (horizon === '1y' && project.speed === 'fast') positiveEffects.push(lang === 'kk'
        ? `«${title}» жобасының нәтижесі алғашқы жылы-ақ байқалады.`
        : `“${title}” delivers quick benefits in the first year.`)
      if (horizon === '3y' && project.longTermMultiplier >= 1.4) positiveEffects.push(lang === 'kk'
        ? `«${title}» жобасының әсері ұзақ мерзімде артады (×${number(project.longTermMultiplier, lang)}).`
        : `“${title}” delivers stronger benefits over the longer term (×${number(project.longTermMultiplier, lang)}).`)
    }

    const risks: string[] = []
    for (const { m, d } of deltas) {
      if (d < 0) risks.push(lang === 'kk'
        ? `${localizedMetric(m, lang)} көрсеткіші жобалардың жанама әсерінен ${number(Math.abs(d), lang)} ұпайға төмендеді.`
        : `${localizedMetric(m, lang)} fell by ${number(Math.abs(d), lang)} because of the projects’ side effects.`)
    }
    const weakest = deltas[deltas.length - 1]
    if (weakest && weakest.d >= 0 && weakest.d < 3) risks.push(lang === 'kk'
      ? `Ең аз өсім — «${localizedMetric(weakest.m, lang)}» (+${number(weakest.d, lang)}): бұл салаға ресурс аз бөлінді.`
      : `The smallest improvement is in ${localizedMetric(weakest.m, lang)} (+${number(weakest.d, lang)}): this area received few resources.`)
    const penalties = outcome.penalties.map((p) => localizePenalty(p, lang))
    for (const penalty of penalties) risks.push(`${penalty.description}.`)
    for (const c of result.contributions) {
      const project = PROJECTS_BY_ID[c.projectId]
      const title = titles.get(c.projectId)
      if (c.efficiency < 0.8) risks.push(lang === 'kk'
        ? `«${title}» жобасына ұсынылған мөлшерден аз қаржы бөлінді: әлеуетті нәтиженің тек ${Math.round(c.efficiency * 100)}%-ы іске асады.`
        : `“${title}” is funded below the recommendation: only ${Math.round(c.efficiency * 100)}% of its potential effect is achieved.`)
      if (horizon === '1y' && project.speed === 'slow') risks.push(lang === 'kk'
        ? `«${title}» жобасына уақыт қажет: алғашқы жылы нәтижесі шектеулі болады.`
        : `“${title}” takes time: its first-year benefits are limited.`)
      if (horizon === '3y' && project.maintenanceCost >= 3) risks.push(lang === 'kk'
        ? `«${title}»: қызмет көрсету шығыны жоғары (${project.maintenanceCost}/4).`
        : `“${title}”: high maintenance costs (${project.maintenanceCost}/4).`)
    }
    return { ...outcome, penalties, positiveEffects: positiveEffects.slice(0, 6), risks: risks.slice(0, 6) }
  }

  return {
    ...result,
    contributions: result.contributions.map((c) => ({ ...c, title: titles.get(c.projectId) ?? c.title })),
    appliedSynergies: synergies,
    oneYear: localizeOutcome(result.oneYear, '1y'),
    threeYears: localizeOutcome(result.threeYears, '3y'),
    strategyProfile: localizeProfile(result.strategyProfile, lang),
  }
}
