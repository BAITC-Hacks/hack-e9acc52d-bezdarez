import type { Lang } from '../../lib/i18n'
import { localizeProject } from '../../lib/localizedContent'
import { PROJECTS } from '../projects'
import type { RealFine } from '../realFines'

const ru = {
  model: 'Штрафы модели — снижают AQLS', under: 'Недофинансирование', over: 'Перекос',
  upkeep: 'Обслуживание (3 года)', budget: 'бюджет', sumUpkeep: 'Σ обслуживания',
  underText: (n: number) => `Сфера получила меньше ${n} ед. — проекты «голодают».`,
  overText: (n: number) => `Больше ${n} ед. в одну сферу — остальные страдают.`,
  upkeepText: 'Дорогие в содержании проекты давят на бюджет в долгосрочной перспективе.',
  current: 'Ваше текущее решение', noPenalty: 'без штрафа',
  maintenance: (total: number, limit: number) => `Обслуживание выбранных проектов: ${total} (порог ${limit})`,
  penalty: (points: string) => `штраф −${points} через 3 года`,
  green: 'Зелёная зона полосы — 10–30 ед., без штрафа.',
  real: 'Реальные штрафы в городе — КоАП РК',
  context: 'Для контекста: какие нарушения в сферах города наказываются по закону. В расчёт AQLS не входят. 1 МРП в 2026 году =',
  reduces: 'снижает риск', individuals: 'МРП · физлица',
  business: (amount: string) => `до ${amount} · крупный бизнес`,
  code: 'Кодекс РК об административных правонарушениях', law: 'Закон о бюджете 2026–2028 (МРП)',
}

export const PENALTY_COPY: Record<Lang, typeof ru> = {
  ru,
  kk: {
    model: 'Модельдегі айып ұпайлары AQLS-ті төмендетеді', under: 'Қаржының жеткіліксіздігі', over: 'Қаржыны теңгерімсіз бөлу',
    upkeep: 'Күтіп ұстау (3 жыл)', budget: 'бюджет', sumUpkeep: 'Σ күтіп ұстау шығыны',
    underText: (n) => `Салаға ${n} бірліктен аз бөлінсе, жобаларды қаржыландыру жеткіліксіз болады.`,
    overText: (n) => `Бір салаға ${n} бірліктен көп бөлу басқа салалардың қаржысын шектейді.`,
    upkeepText: 'Күтіп ұстауы қымбат жобалар ұзақ мерзімде бюджетке қосымша салмақ түсіреді.',
    current: 'Қазіргі шешіміңіз', noPenalty: 'айып ұпайы жоқ',
    maintenance: (total, limit) => `Таңдалған жобаларды күтіп ұстау шығыны: ${total} (шекті мәні ${limit})`,
    penalty: (points) => `3 жылдан кейін −${points} айып ұпайы`,
    green: 'Жасыл аймақ — 10–30 бірлік. Бұл аралықта айып ұпайы жоқ.',
    real: 'Қаладағы нақты айыппұлдар — ҚР ӘҚБтК',
    context: 'Қосымша мәлімет: қала өміріне қатысты заң бұзушылықтар үшін көзделген айыппұлдар. Олар AQLS есебіне кірмейді. 2026 жылы 1 АЕК =',
    reduces: 'тәуекелді азайтатын жоба', individuals: 'АЕК · жеке тұлғалар',
    business: (amount) => `ең көбі ${amount} · ірі кәсіпкерлік`,
    code: 'ҚР Әкімшілік құқық бұзушылық туралы кодексі', law: '2026–2028 жылдарға арналған бюджет туралы заң (АЕК)',
  },
  en: {
    model: 'Simulation penalties reduce AQLS', under: 'Underfunding', over: 'Uneven funding',
    upkeep: 'Maintenance (3 years)', budget: 'budget', sumUpkeep: 'total maintenance',
    underText: (n) => `Allocating fewer than ${n} units leaves the sector’s projects underfunded.`,
    overText: (n) => `Allocating more than ${n} units to one sector leaves less for the others.`,
    upkeepText: 'Projects with high maintenance costs put pressure on the budget over time.',
    current: 'Your current plan', noPenalty: 'no penalty',
    maintenance: (total, limit) => `Maintenance of selected projects: ${total} (threshold ${limit})`,
    penalty: (points) => `−${points} points after 3 years`,
    green: 'The green zone is 10–30 units, with no penalty.',
    real: 'Real city fines — Kazakhstan’s Administrative Offences Code',
    context: 'For context: fines for offences related to city life. These do not affect AQLS. In 2026, 1 monthly calculation index (MCI) =',
    reduces: 'project that reduces the risk', individuals: 'MCI · individuals',
    business: (amount) => `up to ${amount} · large businesses`,
    code: 'Kazakhstan’s Administrative Offences Code', law: '2026–2028 Budget Law (MCI)',
  },
}

type FineText = Pick<RealFine, 'article' | 'title' | 'violation'>
const fineText: Record<'kk' | 'en', Record<string, FineText>> = {
  kk: {
    'ст. 592 ч. 2 КоАП РК': { article: 'ҚР ӘҚБтК 592-бап, 2-бөлік', title: 'Жылдамдықты 20–40 км/сағ асыру', violation: 'Көлік құралының белгіленген жылдамдығын сағатына жиырмадан қырық километрге дейін асыру.' },
    'ст. 597 ч. 2 КоАП РК': { article: 'ҚР ӘҚБтК 597-бап, 2-бөлік', title: 'Тротуарға, көгалға немесе балалар алаңына көлік қою', violation: 'Тротуарда, гүлзарда, көгалда, балалар немесе спорт алаңында тоқтау не тұраққа қою қағидаларын бұзу.' },
    'ст. 505 ч. 1 КоАП РК': { article: 'ҚР ӘҚБтК 505-бап, 1-бөлік', title: 'Абаттандыру қағидаларын бұзу, жасыл желекті бүлдіру', violation: 'Қала аумағын абаттандыру қағидаларын бұзу, инфрақұрылым нысандарын қирату, жасыл желекті жою немесе бүлдіру.' },
    'ст. 336 КоАП РК': { article: 'ҚР ӘҚБтК 336-бап', title: 'Қалдықтарды талаптарды бұзып жағу немесе жинау', violation: 'Қалдықтарды жинау немесе жағу кезінде атмосфералық ауаны қорғау және өрт қауіпсіздігі талаптарын сақтамау.' },
    'ст. 434 ч. 4 КоАП РК': { article: 'ҚР ӘҚБтК 434-бап, 4-бөлік', title: 'Ғимараттар мен қоғамдық орындарды қорлау (вандализм)', violation: 'Ғимараттарды, өзге құрылыстарды, тұрғын үй-жайларды, ортақ пайдаланылатын орындарды, көліктегі және басқа қоғамдық орындардағы мүлікті қорлау.' },
  },
  en: {
    'ст. 592 ч. 2 КоАП РК': { article: 'Administrative Offences Code, Art. 592(2)', title: 'Exceeding the speed limit by 20–40 km/h', violation: 'Driving a vehicle twenty to forty kilometres per hour above the posted speed limit.' },
    'ст. 597 ч. 2 КоАП РК': { article: 'Administrative Offences Code, Art. 597(2)', title: 'Parking on a pavement, lawn or playground', violation: 'Violating stopping or parking rules on pavements, flower beds, lawns, playgrounds or sports grounds.' },
    'ст. 505 ч. 1 КоАП РК': { article: 'Administrative Offences Code, Art. 505(1)', title: 'Breaching landscaping rules or damaging green spaces', violation: 'Violating city landscaping rules, destroying infrastructure, or destroying or damaging green spaces.' },
    'ст. 336 КоАП РК': { article: 'Administrative Offences Code, Art. 336', title: 'Improper storage or burning of waste', violation: 'Failing to comply with air protection and fire safety requirements when storing or burning waste.' },
    'ст. 434 ч. 4 КоАП РК': { article: 'Administrative Offences Code, Art. 434(4)', title: 'Defacing buildings and public places (vandalism)', violation: 'Defacing buildings, other structures, residential premises, shared spaces, or property on transport and in other public places.' },
  },
}

export function localizeRealFine(fine: RealFine, lang: Lang): RealFine {
  if (lang === 'ru') return fine
  const project = PROJECTS.find((item) => item.title === fine.relatedProject)
  return {
    ...fine, ...fineText[lang][fine.article],
    relatedProject: project ? localizeProject(project, lang).title : fine.relatedProject,
  }
}
