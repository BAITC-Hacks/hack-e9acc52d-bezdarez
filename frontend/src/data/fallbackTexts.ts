import type { Metric } from '../types/project'
import type { Lang } from '../lib/i18n'

type Level = 'high' | 'mid' | 'low' | 'none'

/** Четыре условных жителя (FR-10) и показатель, на который они смотрят. */
export const PERSONAS: { persona: string; metric: Metric }[] = [
  { persona: 'Пассажир общественного транспорта', metric: 'mobility' },
  { persona: 'Родитель школьника', metric: 'social' },
  { persona: 'Предприниматель', metric: 'services' },
  { persona: 'Житель жилого района', metric: 'ecology' },
]

export const REACTION_TEMPLATES: Record<Metric, Record<Level, string>> = {
  mobility: {
    high: 'Автобусы и машины стали двигаться заметно быстрее — на дорогу трачу меньше времени.',
    mid: 'Пробок стало чуть меньше, но в час пик всё ещё приходится закладывать запас.',
    low: 'Изменения на дорогах почти незаметны — надеюсь, это только начало.',
    none: 'На дорогах всё по-прежнему: те же пробки и те же остановки.',
  },
  social: {
    high: 'Классы стали свободнее, а до врача теперь можно попасть без долгих очередей.',
    mid: 'В школе и поликлинике стало чуть легче, но нагрузка всё ещё высокая.',
    low: 'Возле нашей школы изменений почти нет.',
    none: 'Для семей с детьми ничего не поменялось — очереди и переполненные классы остались.',
  },
  services: {
    high: 'Заявки решаются быстро, город работает предсказуемо — бизнесу так проще планировать.',
    mid: 'Обращения стали обрабатывать быстрее, хотя не всё идёт гладко.',
    low: 'Сервисы города почти не изменились — ответа по заявкам по-прежнему ждём долго.',
    none: 'Для бизнеса ничего не поменялось: те же сроки и та же бюрократия.',
  },
  safety: {
    high: 'Вечером на улицах светло и спокойно, службы приезжают быстро.',
    mid: 'Стало чуть безопаснее, но тёмные участки ещё остались.',
    low: 'Изменений в безопасности почти не заметно.',
    none: 'С безопасностью всё по-прежнему.',
  },
  ecology: {
    high: 'Во дворе стало зеленее и чище — приятно выйти погулять.',
    mid: 'Зелени стало больше, но до настоящего парка рядом с домом ещё далеко.',
    low: 'Кое-где посадили деревья, но в нашем районе разницы пока не видно.',
    none: 'Воздух и дворы остались такими же — зелени по-прежнему не хватает.',
  },
}

const LOCALIZED_PERSONAS: Record<Exclude<Lang, 'ru'>, string[]> = {
  kk: ['Қоғамдық көлік жолаушысы', 'Оқушының ата-анасы', 'Кәсіпкер', 'Аудан тұрғыны'],
  en: ['Public transport passenger', 'Parent of a schoolchild', 'Business owner', 'Neighborhood resident'],
}

const LOCALIZED_REACTIONS: Record<Exclude<Lang, 'ru'>, Record<Metric, Record<Level, string>>> = {
  kk: {
    mobility: {
      high: 'Автобустар мен көліктер жылдамырақ жүретін болды, жолға аз уақыт жұмсаймын.',
      mid: 'Кептеліс аздап азайды, бірақ қарбалас уақытта әлі де ертерек шығу керек.',
      low: 'Жолдағы өзгерістер әзірге көп байқалмайды. Алда жақсара түседі деп үміттенемін.',
      none: 'Жолдағы жағдай бұрынғыдай: сол кептеліс, сол аялдамалар.',
    },
    social: {
      high: 'Сыныптарда бала саны азайды, дәрігерге де ұзақ кезексіз кіруге болады.',
      mid: 'Мектеп пен емханадағы жағдай сәл жақсарды, бірақ жүктеме әлі де жоғары.',
      low: 'Біздің мектеп маңында өзгеріс көп байқалмайды.',
      none: 'Балалы отбасылар үшін ештеңе өзгермеді: кезек те, лық толған сыныптар да сол қалпы.',
    },
    services: {
      high: 'Өтініштер тез қаралады, қала қызметтері тұрақты жұмыс істейді. Кәсіпті жоспарлау жеңілдеді.',
      mid: 'Өтініштерге жылдамырақ жауап береді, дегенмен әлі де шешілмеген мәселелер бар.',
      low: 'Қала қызметтері аса өзгерген жоқ, өтініштің жауабын әлі ұзақ күтеміз.',
      none: 'Кәсіп жүргізу жағынан ештеңе өзгермеді: баяғы күту мерзімі мен қағазбастылық.',
    },
    safety: {
      high: 'Кешке көшелер жарық әрі тыныш, жедел қызметтер тез келеді.',
      mid: 'Қауіпсіздік сәл жақсарды, бірақ қараңғы жерлер әлі бар.',
      low: 'Қауіпсіздік жағынан өзгеріс көп байқалмайды.',
      none: 'Қауіпсіздік жағдайы бұрынғыдай.',
    },
    ecology: {
      high: 'Аула жасыл әрі таза бола түсті, серуендеуге шыққан ұнайды.',
      mid: 'Жасыл желек көбейді, бірақ үйдің жанында толыққанды саябақ әлі жоқ.',
      low: 'Кей жерлерге ағаш отырғызылды, бірақ біздің ауданда айырмашылық әзірге байқалмайды.',
      none: 'Ауа мен аулалардың жағдайы өзгермеді, жасыл желек әлі де аз.',
    },
  },
  en: {
    mobility: {
      high: 'Buses and cars move noticeably faster, so I spend less time traveling.',
      mid: 'There is a little less congestion, but I still need extra time during rush hour.',
      low: 'I can barely see a change on the roads. I hope this is just the beginning.',
      none: 'The roads are much the same: the same congestion and the same bus stops.',
    },
    social: {
      high: 'Classrooms are less crowded, and seeing a doctor no longer means a long wait.',
      mid: 'Schools and clinics are under a little less pressure, but demand is still high.',
      low: 'Not much has changed around our school.',
      none: 'Nothing has changed for families with children: the queues and crowded classrooms remain.',
    },
    services: {
      high: 'Requests are handled quickly and city services are reliable. Planning for my business is easier.',
      mid: 'Requests are handled faster, although some problems remain.',
      low: 'City services have barely changed. We still wait a long time for replies.',
      none: 'Nothing has changed for businesses: the same delays and paperwork.',
    },
    safety: {
      high: 'The streets feel bright and calm in the evening, and emergency services arrive quickly.',
      mid: 'It feels a little safer, but some areas are still dark.',
      low: 'I can barely notice any change in safety.',
      none: 'Safety feels much the same.',
    },
    ecology: {
      high: 'Our courtyard is greener and cleaner. It is pleasant to go for a walk.',
      mid: 'There is more greenery, but we are still a long way from having a proper park nearby.',
      low: 'Some trees have been planted, but our neighborhood does not feel different yet.',
      none: 'The air and courtyards have not changed. There is still too little greenery.',
    },
  },
}

export function personasFor(lang: Lang) {
  return lang === 'ru' ? PERSONAS : PERSONAS.map((p, index) => ({ ...p, persona: LOCALIZED_PERSONAS[lang][index] }))
}

export function reactionsFor(lang: Lang) {
  return lang === 'ru' ? REACTION_TEMPLATES : LOCALIZED_REACTIONS[lang]
}
