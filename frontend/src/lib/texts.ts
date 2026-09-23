import { CATEGORY_LABELS_I18N, METRIC_LABELS_I18N, type Lang } from '../data/translations'
import type { Category, Metric } from '../types/project'
import type { AppliedPenalty } from '../types/simulation'

/** Число с десятичным разделителем языка. */
export const numL = (v: number, lang: Lang) => {
  const s = String(Math.round(v * 10) / 10)
  return lang === 'en' ? s : s.replace('.', ',')
}
export const signedL = (v: number, lang: Lang) => `${v >= 0 ? '+' : '−'}${numL(Math.abs(v), lang)}`
export const mL = (m: Metric, lang: Lang) => METRIC_LABELS_I18N[lang][m]
export const cL = (c: Category, lang: Lang) => CATEGORY_LABELS_I18N[lang][c]

/** Строка штрафа на языке интерфейса по структурированным данным. */
export function penaltyText(p: AppliedPenalty, lang: Lang, category: (c: Category) => string): string {
  const pts = numL(p.points, lang)
  const cat = p.category ? category(p.category) : ''
  const T = {
    ru: { underfunded: `«${cat}»: меньше 10 ед. — штраф −${pts}`, overfunded: `«${cat}»: больше 30 ед. — штраф −${pts}`, maintenance: `Расходы на обслуживание выше порога 12 — штраф −${pts}` },
    kk: { underfunded: `«${cat}»: 10 бірліктен аз — айыппұл −${pts}`, overfunded: `«${cat}»: 30 бірліктен көп — айыппұл −${pts}`, maintenance: `Қызмет көрсету шығыны 12 шегінен жоғары — айыппұл −${pts}` },
    en: { underfunded: `«${cat}»: under 10 u. — penalty −${pts}`, overfunded: `«${cat}»: over 30 u. — penalty −${pts}`, maintenance: `Maintenance costs above the threshold of 12 — penalty −${pts}` },
  }
  return T[lang][p.kind]
}

/** Шаблоны системной аналитики (FR-09) на трёх языках. */
export const EXPLAIN = {
  ru: {
    horizon1: 'через 1 год',
    horizon3: 'через 3 года',
    summaryTotal: (h: string, d: string, b: string, a: string) => `Стратегия изменила общий показатель качества жизни ${h} на ${d} балла (${b} → ${a}).`,
    summaryBest: (bm: string, bd: string, proj: string, wm: string, wd: string) => `Наибольший рост — «${bm}» (${bd}), основной вклад внёс проект «${proj}»; минимальное изменение — «${wm}» (${wd}).`,
    tradeoff: (mc: string, mb: number, lc: string, lb: number) => `Компромисс: больше всего ресурсов получило направление «${mc}» (${mb} ед.), меньше всего — «${lc}» (${lb} ед.).`,
    evenSplit: (lo: number, hi: number) => `Бюджет распределён ровно — от ${lo} до ${hi} ед. на направление, без явного перекоса.`,
    in3y: (v: string, d: string, slow: string, maint: boolean) => `Через 3 года AQLS составит ${v} (${d})${slow ? `: полностью раскроются ${slow}` : ''}${maint ? ', но вырастут расходы на обслуживание' : ''}.`,
    vs1y: (diff: string, up: boolean) => `По сравнению с первым годом AQLS ${up ? 'выше' : 'ниже'} на ${diff}: долгосрочные проекты набирают силу, а быстрые эффекты частично выдыхаются.`,
    posMetric: (m: string, d: string, proj: string) => `${m}: ${d} — основной вклад проекта «${proj}».`,
    posSynergy: (s: string) => `Синергия: ${s}.`,
    posFast: (p: string) => `«${p}» даёт быстрый эффект уже в первый год.`,
    posLong: (p: string, x: string) => `«${p}» раскрывается в долгосрочной перспективе (×${x}).`,
    posAll: 'Все пять сфер получили финансирование — ни одно направление не осталось без проекта.',
    riskDrop: (m: string, d: string) => `«${m}» снизилась на ${d} из-за побочных эффектов проектов.`,
    riskWeak: (m: string, d: string) => `Минимальный рост — «${m}» (${d}): этой сфере досталось мало ресурсов.`,
    riskLowEff: (p: string, pct: number) => `«${p}» профинансирован ниже рекомендуемого: реализуется лишь ${pct}% эффекта.`,
    riskSlow: (p: string) => `«${p}» требует времени: в первый год эффект ограничен.`,
    riskMaint: (p: string, m: number) => `«${p}»: высокие расходы на обслуживание (${m}/4).`,
    riskModel: 'Модель не учитывает внешние факторы — результат демонстрационный.',
    recMove: (from: string, fb: number, to: string, tb: number) => `Переведите 3–5 единиц из направления «${from}» (${fb} ед.) в «${to}» (${tb} ед.), чтобы выровнять рост показателей.`,
    recSwap: (c: string, b: number, m: string) => `Направление «${c}» уже получает больше всех (${b} ед.), но растёт слабее: попробуйте другой проект в этой сфере с большим эффектом на «${m}».`,
    recBalanced: 'Распределение сбалансировано; сравните горизонты 1 и 3 года и попробуйте заменить проект с наименьшей эффективностью.',
  },
  kk: {
    horizon1: '1 жылдан кейін',
    horizon3: '3 жылдан кейін',
    summaryTotal: (h: string, d: string, b: string, a: string) => `Стратегия ${h} өмір сапасының жалпы көрсеткішін ${d} балға өзгертті (${b} → ${a}).`,
    summaryBest: (bm: string, bd: string, proj: string, wm: string, wd: string) => `Ең үлкен өсім — «${bm}» (${bd}), негізгі үлесті «${proj}» жобасы қосты; ең аз өзгеріс — «${wm}» (${wd}).`,
    tradeoff: (mc: string, mb: number, lc: string, lb: number) => `Ымыра: ең көп ресурс «${mc}» бағытына (${mb} бірл.), ең азы — «${lc}» бағытына (${lb} бірл.) бөлінді.`,
    evenSplit: (lo: number, hi: number) => `Бюджет тең бөлінді — бір бағытқа ${lo}–${hi} бірлік, айқын ауытқусыз.`,
    in3y: (v: string, d: string, slow: string, maint: boolean) => `3 жылдан кейін AQLS ${v} болады (${d})${slow ? `: толық ашылады — ${slow}` : ''}${maint ? ', бірақ қызмет көрсету шығыны өседі' : ''}.`,
    vs1y: (diff: string, up: boolean) => `Бірінші жылмен салыстырғанда AQLS ${diff} балға ${up ? 'жоғары' : 'төмен'}: ұзақ мерзімді жобалар күшейеді, ал жылдам әсерлер біршама әлсірейді.`,
    posMetric: (m: string, d: string, proj: string) => `${m}: ${d} — негізгі үлес «${proj}» жобасынан.`,
    posSynergy: (s: string) => `Синергия: ${s}.`,
    posFast: (p: string) => `«${p}» бірінші жылы-ақ жылдам әсер береді.`,
    posLong: (p: string, x: string) => `«${p}» ұзақ мерзімде ашылады (×${x}).`,
    posAll: 'Бес саланың бәрі қаржыландырылды — бірде-бір бағыт жобасыз қалған жоқ.',
    riskDrop: (m: string, d: string) => `«${m}» жобалардың жанама әсерінен ${d} балға төмендеді.`,
    riskWeak: (m: string, d: string) => `Ең аз өсім — «${m}» (${d}): бұл салаға ресурс аз тиді.`,
    riskLowEff: (p: string, pct: number) => `«${p}» ұсынылғаннан аз қаржыландырылды: әсердің тек ${pct}%-ы іске асады.`,
    riskSlow: (p: string) => `«${p}» уақытты қажет етеді: бірінші жылы әсері шектеулі.`,
    riskMaint: (p: string, m: number) => `«${p}»: қызмет көрсету шығыны жоғары (${m}/4).`,
    riskModel: 'Модель сыртқы факторларды ескермейді — нәтиже демонстрациялық.',
    recMove: (from: string, fb: number, to: string, tb: number) => `Көрсеткіштердің өсуін теңестіру үшін «${from}» бағытынан (${fb} бірл.) «${to}» бағытына (${tb} бірл.) 3–5 бірлік аударыңыз.`,
    recSwap: (c: string, b: number, m: string) => `«${c}» бағыты ең көп қаржы алады (${b} бірл.), бірақ әлсіз өседі: осы салада «${m}» көрсеткішіне әсері күштірек басқа жобаны таңдап көріңіз.`,
    recBalanced: 'Бөлу теңгерімді; 1 және 3 жылдық көкжиекті салыстырып, тиімділігі ең төмен жобаны ауыстырып көріңіз.',
  },
  en: {
    horizon1: 'after 1 year',
    horizon3: 'after 3 years',
    summaryTotal: (h: string, d: string, b: string, a: string) => `The strategy changed the overall quality-of-life score ${h} by ${d} points (${b} → ${a}).`,
    summaryBest: (bm: string, bd: string, proj: string, wm: string, wd: string) => `The biggest gain is in «${bm}» (${bd}), driven mainly by «${proj}»; the smallest change is in «${wm}» (${wd}).`,
    tradeoff: (mc: string, mb: number, lc: string, lb: number) => `Trade-off: «${mc}» received the most resources (${mb} u.), «${lc}» the least (${lb} u.).`,
    evenSplit: (lo: number, hi: number) => `The budget is split evenly — ${lo} to ${hi} u. per area, with no clear imbalance.`,
    in3y: (v: string, d: string, slow: string, maint: boolean) => `After 3 years AQLS will reach ${v} (${d})${slow ? `: ${slow} will fully pay off` : ''}${maint ? ', but maintenance costs will grow' : ''}.`,
    vs1y: (diff: string, up: boolean) => `Compared with year one, AQLS is ${diff} points ${up ? 'higher' : 'lower'}: long-term projects gain strength while quick wins partly fade.`,
    posMetric: (m: string, d: string, proj: string) => `${m}: ${d} — mainly thanks to «${proj}».`,
    posSynergy: (s: string) => `Synergy: ${s}.`,
    posFast: (p: string) => `«${p}» delivers a quick win in the first year.`,
    posLong: (p: string, x: string) => `«${p}» pays off in the long run (×${x}).`,
    posAll: 'All five areas received funding — no area was left without a project.',
    riskDrop: (m: string, d: string) => `«${m}» fell by ${d} due to project side effects.`,
    riskWeak: (m: string, d: string) => `The smallest gain is in «${m}» (${d}): this area got few resources.`,
    riskLowEff: (p: string, pct: number) => `«${p}» is underfunded: only ${pct}% of its effect is realised.`,
    riskSlow: (p: string) => `«${p}» takes time: limited effect in the first year.`,
    riskMaint: (p: string, m: number) => `«${p}»: high maintenance costs (${m}/4).`,
    riskModel: 'The model ignores external factors — the result is a demo.',
    recMove: (from: string, fb: number, to: string, tb: number) => `Move 3–5 units from «${from}» (${fb} u.) to «${to}» (${tb} u.) to even out the growth.`,
    recSwap: (c: string, b: number, m: string) => `«${c}» already gets the most (${b} u.) but grows the least: try another project in this area with a stronger effect on «${m}».`,
    recBalanced: 'The split is balanced; compare the 1- and 3-year horizons and try replacing the least efficient project.',
  },
}

/** Реакции условных жителей на трёх языках. */
export type Level = 'high' | 'mid' | 'low' | 'none'
export const PERSONAS_L: Record<Lang, { persona: string; metric: Metric }[]> = {
  ru: [
    { persona: 'Пассажир общественного транспорта', metric: 'mobility' },
    { persona: 'Родитель школьника', metric: 'social' },
    { persona: 'Предприниматель', metric: 'services' },
    { persona: 'Житель жилого района', metric: 'ecology' },
  ],
  kk: [
    { persona: 'Қоғамдық көлік жолаушысы', metric: 'mobility' },
    { persona: 'Оқушының ата-анасы', metric: 'social' },
    { persona: 'Кәсіпкер', metric: 'services' },
    { persona: 'Тұрғын аудан тұрғыны', metric: 'ecology' },
  ],
  en: [
    { persona: 'Public transport passenger', metric: 'mobility' },
    { persona: 'Parent of a schoolchild', metric: 'social' },
    { persona: 'Entrepreneur', metric: 'services' },
    { persona: 'Resident of a housing district', metric: 'ecology' },
  ],
}

export const REACTIONS_L: Record<'kk' | 'en', Record<Metric, Record<Level, string>>> = {
  kk: {
    mobility: { high: 'Автобустар мен көліктер айтарлықтай жылдам жүре бастады — жолға аз уақыт кетеді.', mid: 'Кептеліс сәл азайды, бірақ қарбалас уақытта әлі де уақыт қалдыру керек.', low: 'Жолдағы өзгеріс әрең байқалады — бұл тек бастамасы деп үміттенемін.', none: 'Жолда бәрі бұрынғыдай: сол кептеліс, сол аялдамалар.' },
    social: { high: 'Сыныптар кеңейді, дәрігерге ұзақ кезексіз баруға болады.', mid: 'Мектеп пен емханада сәл жеңілдеді, бірақ жүктеме әлі жоғары.', low: 'Біздің мектептің маңында өзгеріс жоқтың қасы.', none: 'Балалы отбасылар үшін ештеңе өзгерген жоқ — кезек пен толы сыныптар қалды.' },
    services: { high: 'Өтінімдер тез шешіледі, қала болжамды жұмыс істейді — бизнеске жоспарлау оңай.', mid: 'Өтініштер тезірек өңделеді, бірақ бәрі бірдей емес.', low: 'Қала сервистері өзгере қоймады — өтінімге жауапты әлі ұзақ күтеміз.', none: 'Бизнес үшін ештеңе өзгерген жоқ: сол мерзімдер, сол бюрократия.' },
    safety: { high: 'Кешке көшелер жарық әрі тыныш, қызметтер тез келеді.', mid: 'Сәл қауіпсізірек болды, бірақ қараңғы учаскелер әлі бар.', low: 'Қауіпсіздікте өзгеріс байқалмайды.', none: 'Қауіпсіздік бұрынғыдай.' },
    ecology: { high: 'Аулада жасылдық көбейіп, тазарды — серуендеу жағымды.', mid: 'Жасылдық көбейді, бірақ үй маңында нағыз саябаққа әлі алыс.', low: 'Бір жерлерге ағаш отырғызды, бірақ біздің ауданда айырма әлі көрінбейді.', none: 'Ауа мен аулалар сол күйі — жасылдық әлі жетіспейді.' },
  },
  en: {
    mobility: { high: 'Buses and cars move noticeably faster — my commute is shorter now.', mid: 'Traffic is a little lighter, but I still leave early at rush hour.', low: 'Barely any change on the roads — hopefully this is just the start.', none: 'Nothing changed on the roads: same jams, same stops.' },
    social: { high: 'Classes are less crowded and I can see a doctor without long queues.', mid: 'Schools and clinics are a bit easier, but still under pressure.', low: 'Almost nothing changed near our school.', none: 'Nothing changed for families — queues and packed classes remain.' },
    services: { high: 'Requests get solved fast and the city works predictably — easier to plan a business.', mid: 'Requests are handled faster, though not everything runs smoothly.', low: 'City services barely changed — we still wait long for replies.', none: 'Nothing changed for business: same deadlines, same red tape.' },
    safety: { high: 'The streets are bright and calm at night, and services arrive fast.', mid: 'It feels a bit safer, but some dark spots remain.', low: 'Hardly any change in safety.', none: 'Safety is the same as before.' },
    ecology: { high: 'Our yard is greener and cleaner — it’s nice to go for a walk.', mid: 'More greenery, but a real park near home is still far away.', low: 'Some trees were planted, but our district doesn’t feel different yet.', none: 'The air and yards are unchanged — still not enough greenery.' },
  },
}

/** Шаги обучения на трёх языках. */
export const TOUR_STEPS: Record<Lang, { target?: string; title: string; text: string }[]> = {
  ru: [
    { title: 'Салем! Я AI-помощник QalaBalance', text: 'За минуту покажу, как управлять городом. У вас 100 бюджетных единиц — это 200 млрд ₸. Задача — поднять качество жизни (AQLS) и не уйти в перекос.' },
    { target: 'categories', title: 'Пять сфер города', text: 'Транспорт, озеленение, социальная сфера, безопасность и сервисы. В каждой нужно выбрать ровно один проект — галочка появится, когда выбор сделан.' },
    { target: 'projects', title: 'Карточки проектов', text: 'На карточке — стоимость в тенге, эффекты по показателям (М, Э, С, Б, ГС), риски, скорость результата и расходы на обслуживание. Нажмите «Выбрать проект».' },
    { target: 'slider', title: 'Бюджет направления', text: 'Двигайте ползунок: от 5 до 40 ед. Эффект растёт как корень из бюджета, поэтому переплата почти не помогает, а меньше 10 или больше 30 ед. — штраф.' },
    { target: 'forecast', title: 'Живой прогноз', text: 'AQLS и радар пересчитываются мгновенно. Здесь же видно найденные синергии — бонусы за удачные пары проектов.' },
    { target: 'budget', title: 'Счётчик бюджета', text: 'Распределите ровно 100 ед. — тогда кнопка «Запустить симуляцию» станет активной.' },
    { target: 'assistant', title: 'Я всегда рядом', text: 'Нажмите на меня: подскажу синергии, выровняю бюджет одной кнопкой и отвечу на вопросы — например, «как снизить пробки?».' },
    { target: 'settings', title: 'Настройки', text: 'Тёмная тема, казахский и английский языки, повтор этого обучения — в настройках. Удачи, аким!' },
  ],
  kk: [
    { title: 'Сәлем! Мен QalaBalance AI-көмекшісімін', text: 'Бір минутта қаланы қалай басқаруды көрсетемін. Сізде 100 бюджет бірлігі бар — бұл 200 млрд ₸. Мақсат — өмір сапасын (AQLS) көтеру және теңгерімді сақтау.' },
    { target: 'categories', title: 'Қаланың бес саласы', text: 'Көлік, көгалдандыру, әлеуметтік сала, қауіпсіздік және сервистер. Әрқайсысында дәл бір жобаны таңдаңыз — таңдау жасалғанда белгі пайда болады.' },
    { target: 'projects', title: 'Жоба карточкалары', text: 'Карточкада — теңгедегі құны, көрсеткіштерге әсері, тәуекелдер, нәтиже жылдамдығы және қызмет көрсету шығыны. «Жобаны таңдау» батырмасын басыңыз.' },
    { target: 'slider', title: 'Бағыт бюджеті', text: 'Жүгірткіні жылжытыңыз: 5-тен 40 бірлікке дейін. Әсер бюджеттің түбірімен өседі, сондықтан артық қаржы көп көмектеспейді, ал 10-нан аз немесе 30-дан көп — айыппұл.' },
    { target: 'forecast', title: 'Тірі болжам', text: 'AQLS пен радар бірден қайта есептеледі. Мұнда табылған синергиялар да көрінеді — сәтті жоба жұптары үшін бонус.' },
    { target: 'budget', title: 'Бюджет санағышы', text: 'Дәл 100 бірлікті бөліңіз — сонда «Симуляцияны іске қосу» батырмасы белсенді болады.' },
    { target: 'assistant', title: 'Мен әрдайым жаныңыздамын', text: 'Маған басыңыз: синергияларды айтамын, бюджетті бір батырмамен теңестіремін және сұрақтарға жауап беремін.' },
    { target: 'settings', title: 'Баптаулар', text: 'Қараңғы тақырып, қазақ және ағылшын тілдері, осы оқытуды қайталау — баптауларда. Сәттілік, әкім!' },
  ],
  en: [
    { title: 'Hi! I’m the QalaBalance AI assistant', text: 'In one minute I’ll show you how to run the city. You have 100 budget units — that’s 200 bn ₸. The goal is to raise quality of life (AQLS) without imbalances.' },
    { target: 'categories', title: 'Five city areas', text: 'Transport, greening, social services, safety and city services. Pick exactly one project in each — a check mark appears once you do.' },
    { target: 'projects', title: 'Project cards', text: 'Each card shows the cost in tenge, effects on indicators, risks, speed of results and maintenance costs. Press «Choose project».' },
    { target: 'slider', title: 'Area budget', text: 'Move the slider from 5 to 40 units. Impact grows with the square root of budget, so overspending barely helps, and under 10 or over 30 units is penalised.' },
    { target: 'forecast', title: 'Live forecast', text: 'AQLS and the radar update instantly. Synergies — bonuses for good project pairs — show up here too.' },
    { target: 'budget', title: 'Budget counter', text: 'Allocate exactly 100 units and the «Run simulation» button becomes active.' },
    { target: 'assistant', title: 'I’m always here', text: 'Click me: I’ll suggest synergies, balance the budget in one click and answer questions like «how do I reduce traffic?».' },
    { target: 'settings', title: 'Settings', text: 'Dark theme, Kazakh and English, and this tutorial again — all in settings. Good luck, akim!' },
  ],
}
