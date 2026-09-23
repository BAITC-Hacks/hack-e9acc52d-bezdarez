import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Category, Metric } from '../types/project'

export type Lang = 'ru' | 'kk'
export type Theme = 'light' | 'dark' | 'system'

const ru = {
  'nav.home': 'Главная',
  'nav.simulator': 'Симулятор',
  'nav.result': 'Результат',
  'nav.settings': 'Настройки',
  'nav.tour': 'Обучение',
  'nav.start': 'Начать управление',
  'nav.continue': 'Продолжить управление',
  'nav.edit': 'Изменить решения',
  'nav.restart': 'Начать заново',
  'nav.run': 'Запустить симуляцию',
  'nav.runShort': 'Запуск',
  'brand.sub': 'Аким на 5 часов',

  'budget.total': 'Бюджет',
  'budget.allocated': 'Распределено',
  'budget.left': 'Осталось',
  'budget.over': 'Превышение',
  'budget.units': 'ед.',
  'budget.fixErrors': 'Исправьте ошибки распределения',
  'budget.distribution': 'Распределение бюджета',
  'budget.byRecommended': 'По рекомендациям',
  'budget.recommendedShort': 'рек.',

  'start.chip': 'AI-симулятор городского бюджета',
  'start.title': 'Аким на 5 часов',
  'start.youGot': 'Вы получили',
  'start.budgetUnits': 'бюджетных единиц',
  'start.lead': 'Распределите их между пятью направлениями, выберите проекты и узнайте, как ваши решения повлияют на качество жизни виртуального города.',
  'start.noReg': 'Без регистрации · около 3 минут',
  'start.projectsToChoose': 'на выбор',
  'start.initialState': 'Исходное состояние города',
  'start.beforeDecisions': 'до ваших решений',
  'start.startAqls': 'Стартовый AQLS',
  'start.problems': 'Проблемы города',
  'start.rules': 'Правила',
  'start.rule1': 'В каждом из пяти направлений выберите ровно один проект.',
  'start.rule2': 'Распределите ровно {total} единиц ({tenge}, 1 ед. = {unit}): на направление — от 5 до 40.',
  'start.rule3': 'Меньше 10 или больше 30 единиц на направление — штраф за перекос.',
  'start.rule4': 'Эффект растёт медленнее бюджета: переплата даёт не больше +15%.',
  'start.rule5': 'Сравните результат через 1 год и через 3 года.',
  'start.penaltyRules': 'Как считаются штрафы',

  'sim.direction': 'Направление {n} из {total}',
  'sim.back': 'Назад',
  'sim.next': 'Далее',
  'sim.forecast': 'Предварительный прогноз · 1 год',
  'sim.pickOne': 'Выберите хотя бы один проект, чтобы увидеть прогноз.',
  'sim.toFix': 'Что нужно исправить',
  'sim.notSelected': 'Проект не выбран',
  'sim.projects': 'Проекты',

  'card.min': 'Мин.',
  'card.rec': 'Рекоменд.',
  'card.max': 'Макс.',
  'card.select': 'Выбрать проект',
  'card.selected': 'Выбрано',
  'card.risk': 'Риск',
  'card.in3y': 'через 3 года',
  'card.maintenance': 'Обслуживание',
  'speed.fast': 'Быстрый эффект',
  'speed.medium': 'Средний срок',
  'speed.slow': 'Долгосрочный',

  'result.title': 'Результат симуляции',
  'result.in1y': 'Через 1 год',
  'result.in3y': 'Через 3 года',
  'result.1y': '1 год',
  'result.3y': '3 года',
  'result.cityProfile': 'Профиль города',
  'result.beforeAfter': 'До и после',
  'result.selectedProjects': 'Выбранные проекты',
  'result.synergiesPenalties': 'Синергии и штрафы',
  'result.noSynergies': 'Синергий и штрафов нет.',
  'result.penaltiesTotal': 'Штрафы: −{points} балла (учтены в AQLS)',
  'result.penaltyDetails': 'Подробнее о штрафах',
  'result.districtEffect': 'Эффект по районам',
  'result.yourProfile': 'Ваш профиль',
  'result.profileNote': 'Определён алгоритмом по распределению бюджета, а не языковой моделью.',
  'result.points': 'балла',
  'result.scale': 'Шкала 0–100 · модельный показатель',

  'ai.titleAi': 'AI-объяснение последствий',
  'ai.titleSystem': 'Разбор последствий',
  'ai.loading': 'AI анализирует рассчитанный результат…',
  'ai.byModel': 'Сформировано моделью {model} только по рассчитанным данным',
  'ai.bySystem': 'Сформировано системой по рассчитанным данным',
  'ai.retry': 'Повторить AI',
  'ai.unavailable': 'AI-объяснение временно недоступно. Показано объяснение, сформированное системой.',
  'ai.reason': 'Причина',
  'ai.positives': 'Положительные последствия',
  'ai.risks': 'Риски и компромиссы',
  'ai.recommendation': 'Рекомендация',
  'ai.disclaimer': 'AI получает только рассчитанные системой значения и не меняет баллы. Модель демонстрационная и не является прогнозом для Астаны.',
  'ai.citizens': 'Что скажут жители',

  'map.title': 'Карта районов Астаны',
  'map.hint': 'Наведите курсор на район или выберите его кнопкой ниже',
  'map.index': 'Индекс района',
  'map.district': 'Район',
  'map.districtIndex': 'индекс района',
  'map.problems': 'Проблемы района',
  'map.vsCity': 'к городу',
  'map.eqCity': '= город',
  'map.river': 'р. Есиль',
  'map.note': 'Границы районов — © участники OpenStreetMap (ODbL). Показатели и проблемы районов — демонстрационные, не официальная статистика.',
  'map.noteAfter': ' Районный эффект — визуальная проекция городского результата с учётом потребности района.',

  'demo.short': 'Демонстрационные данные — не официальная оценка Астаны',
  'demo.long': 'Все показатели, коэффициенты и результаты — модельные и демонстрационные. Это не официальная оценка и не прогноз для города Астаны.',

  'settings.title': 'Настройки',
  'settings.theme': 'Тема оформления',
  'settings.light': 'Светлая',
  'settings.dark': 'Тёмная',
  'settings.system': 'Как в системе',
  'settings.language': 'Язык интерфейса',
  'settings.tour': 'Обучение',
  'settings.tourText': 'Пошаговый тур по симулятору с AI-помощником.',
  'settings.tourStart': 'Пройти обучение',
  'settings.reset': 'Сбросить решения',
  'settings.resetText': 'Удалить сохранённый выбор проектов и бюджета в этом браузере.',
  'settings.kkNote': 'Каталог проектов и аналитические тексты пока на русском языке.',
  'settings.close': 'Закрыть',
  'settings.api': 'AI-сервис',
  'settings.apiOn': 'Подключён: {model}',
  'settings.apiOff': 'Не подключён — используется системная аналитика',

  'assistant.title': 'AI-помощник',
  'assistant.subtitle': 'Подскажу, что делать дальше',
  'assistant.ask': 'Спросить',
  'assistant.placeholder': 'Например: как поднять экологию?',
  'assistant.tour': 'Пройти обучение',
  'assistant.thinking': 'Думаю…',

  'tour.skip': 'Пропустить',
  'tour.next': 'Далее',
  'tour.back': 'Назад',
  'tour.done': 'Понятно, начинаем!',
  'tour.step': 'Шаг {n} из {total}',

  'penalty.title': 'Штрафы и ограничения',
} as const

export type I18nKey = keyof typeof ru

const kk: Record<I18nKey, string> = {
  'nav.home': 'Басты бет',
  'nav.simulator': 'Симулятор',
  'nav.result': 'Нәтиже',
  'nav.settings': 'Баптаулар',
  'nav.tour': 'Оқыту',
  'nav.start': 'Басқаруды бастау',
  'nav.continue': 'Басқаруды жалғастыру',
  'nav.edit': 'Шешімдерді өзгерту',
  'nav.restart': 'Қайта бастау',
  'nav.run': 'Симуляцияны іске қосу',
  'nav.runShort': 'Іске қосу',
  'brand.sub': '5 сағатқа әкім',

  'budget.total': 'Бюджет',
  'budget.allocated': 'Бөлінді',
  'budget.left': 'Қалды',
  'budget.over': 'Асып кетті',
  'budget.units': 'бірл.',
  'budget.fixErrors': 'Бөлу қателерін түзетіңіз',
  'budget.distribution': 'Бюджетті бөлу',
  'budget.byRecommended': 'Ұсыныс бойынша',
  'budget.recommendedShort': 'ұсын.',

  'start.chip': 'Қала бюджетінің AI-симуляторы',
  'start.title': '5 сағатқа әкім',
  'start.youGot': 'Сізге берілді',
  'start.budgetUnits': 'бюджет бірлігі',
  'start.lead': 'Оларды бес бағыт арасында бөліп, жобаларды таңдаңыз және шешімдеріңіз виртуалды қаланың өмір сапасына қалай әсер ететінін біліңіз.',
  'start.noReg': 'Тіркелусіз · шамамен 3 минут',
  'start.projectsToChoose': 'таңдауға',
  'start.initialState': 'Қаланың бастапқы жағдайы',
  'start.beforeDecisions': 'шешімдеріңізге дейін',
  'start.startAqls': 'Бастапқы AQLS',
  'start.problems': 'Қала мәселелері',
  'start.rules': 'Ережелер',
  'start.rule1': 'Бес бағыттың әрқайсысында дәл бір жобаны таңдаңыз.',
  'start.rule2': 'Дәл {total} бірлікті бөліңіз ({tenge}, 1 бірл. = {unit}): бір бағытқа 5-тен 40-қа дейін.',
  'start.rule3': 'Бір бағытқа 10-нан аз немесе 30-дан көп бірлік — теңгерімсіздік айыппұлы.',
  'start.rule4': 'Әсер бюджеттен баяу өседі: артық қаржы +15%-дан аспайды.',
  'start.rule5': 'Нәтижені 1 жылдан және 3 жылдан кейін салыстырыңыз.',
  'start.penaltyRules': 'Айыппұлдар қалай есептеледі',

  'sim.direction': '{total} бағыттың {n}-шісі',
  'sim.back': 'Артқа',
  'sim.next': 'Келесі',
  'sim.forecast': 'Алдын ала болжам · 1 жыл',
  'sim.pickOne': 'Болжамды көру үшін кемінде бір жобаны таңдаңыз.',
  'sim.toFix': 'Нені түзету керек',
  'sim.notSelected': 'Жоба таңдалмаған',
  'sim.projects': 'Жобалар',

  'card.min': 'Ең аз',
  'card.rec': 'Ұсынылған',
  'card.max': 'Ең көп',
  'card.select': 'Жобаны таңдау',
  'card.selected': 'Таңдалды',
  'card.risk': 'Тәуекел',
  'card.in3y': '3 жылдан кейін',
  'card.maintenance': 'Қызмет көрсету',
  'speed.fast': 'Жылдам әсер',
  'speed.medium': 'Орта мерзім',
  'speed.slow': 'Ұзақ мерзімді',

  'result.title': 'Симуляция нәтижесі',
  'result.in1y': '1 жылдан кейін',
  'result.in3y': '3 жылдан кейін',
  'result.1y': '1 жыл',
  'result.3y': '3 жыл',
  'result.cityProfile': 'Қала бейнесі',
  'result.beforeAfter': 'Дейін және кейін',
  'result.selectedProjects': 'Таңдалған жобалар',
  'result.synergiesPenalties': 'Синергиялар мен айыппұлдар',
  'result.noSynergies': 'Синергиялар мен айыппұлдар жоқ.',
  'result.penaltiesTotal': 'Айыппұлдар: −{points} балл (AQLS-те ескерілген)',
  'result.penaltyDetails': 'Айыппұлдар туралы толығырақ',
  'result.districtEffect': 'Аудандар бойынша әсер',
  'result.yourProfile': 'Сіздің бейініңіз',
  'result.profileNote': 'Тіл моделімен емес, бюджетті бөлу алгоритмімен анықталды.',
  'result.points': 'балл',
  'result.scale': '0–100 шкаласы · модельдік көрсеткіш',

  'ai.titleAi': 'Салдарлардың AI-түсіндірмесі',
  'ai.titleSystem': 'Салдарларды талдау',
  'ai.loading': 'AI есептелген нәтижені талдап жатыр…',
  'ai.byModel': '{model} моделі тек есептелген деректер бойынша жасады',
  'ai.bySystem': 'Жүйе есептелген деректер бойынша жасады',
  'ai.retry': 'AI-ды қайталау',
  'ai.unavailable': 'AI-түсіндірме уақытша қолжетімсіз. Жүйе жасаған түсіндірме көрсетілді.',
  'ai.reason': 'Себебі',
  'ai.positives': 'Оң салдарлар',
  'ai.risks': 'Тәуекелдер мен ымыралар',
  'ai.recommendation': 'Ұсыныс',
  'ai.disclaimer': 'AI тек жүйе есептеген мәндерді алады және балдарды өзгертпейді. Модель демонстрациялық, Астана үшін болжам емес.',
  'ai.citizens': 'Тұрғындар не дейді',

  'map.title': 'Астана аудандарының картасы',
  'map.hint': 'Курсорды ауданға апарыңыз немесе төмендегі батырмамен таңдаңыз',
  'map.index': 'Аудан индексі',
  'map.district': 'Аудан',
  'map.districtIndex': 'аудан индексі',
  'map.problems': 'Аудан мәселелері',
  'map.vsCity': 'қалаға қарағанда',
  'map.eqCity': '= қала',
  'map.river': 'Есіл өз.',
  'map.note': 'Аудан шекаралары — © OpenStreetMap қатысушылары (ODbL). Аудандардың көрсеткіштері мен мәселелері демонстрациялық, ресми статистика емес.',
  'map.noteAfter': ' Аудандық әсер — аудан қажеттілігін ескеретін қалалық нәтиженің визуалды проекциясы.',

  'demo.short': 'Демонстрациялық деректер — Астананың ресми бағасы емес',
  'demo.long': 'Барлық көрсеткіштер, коэффициенттер мен нәтижелер модельдік және демонстрациялық. Бұл Астана қаласының ресми бағасы немесе болжамы емес.',

  'settings.title': 'Баптаулар',
  'settings.theme': 'Безендіру тақырыбы',
  'settings.light': 'Ашық',
  'settings.dark': 'Қараңғы',
  'settings.system': 'Жүйедегідей',
  'settings.language': 'Интерфейс тілі',
  'settings.tour': 'Оқыту',
  'settings.tourText': 'AI-көмекшімен симулятор бойынша қадамдық тур.',
  'settings.tourStart': 'Оқытудан өту',
  'settings.reset': 'Шешімдерді тазалау',
  'settings.resetText': 'Осы браузерде сақталған жобалар мен бюджет таңдауын жою.',
  'settings.kkNote': 'Жобалар каталогы мен талдау мәтіндері әзірге орыс тілінде.',
  'settings.close': 'Жабу',
  'settings.api': 'AI-сервис',
  'settings.apiOn': 'Қосылған: {model}',
  'settings.apiOff': 'Қосылмаған — жүйелік талдау қолданылады',

  'assistant.title': 'AI-көмекші',
  'assistant.subtitle': 'Келесі қадамды айтып беремін',
  'assistant.ask': 'Сұрау',
  'assistant.placeholder': 'Мысалы: экологияны қалай көтеруге болады?',
  'assistant.tour': 'Оқытудан өту',
  'assistant.thinking': 'Ойланып жатырмын…',

  'tour.skip': 'Өткізіп жіберу',
  'tour.next': 'Келесі',
  'tour.back': 'Артқа',
  'tour.done': 'Түсінікті, бастаймыз!',
  'tour.step': '{total} қадамның {n}-шісі',

  'penalty.title': 'Айыппұлдар мен шектеулер',
}

const METRIC_LABELS_I18N: Record<Lang, Record<Metric, string>> = {
  ru: { mobility: 'Мобильность', ecology: 'Экология', social: 'Социальный комфорт', safety: 'Безопасность', services: 'Городские сервисы' },
  kk: { mobility: 'Мобильділік', ecology: 'Экология', social: 'Әлеуметтік жайлылық', safety: 'Қауіпсіздік', services: 'Қалалық сервистер' },
}

const CATEGORY_LABELS_I18N: Record<Lang, Record<Category, string>> = {
  ru: { transport: 'Транспорт', greening: 'Озеленение', social: 'Социальная сфера', safety: 'Безопасность', services: 'Городские сервисы' },
  kk: { transport: 'Көлік', greening: 'Көгалдандыру', social: 'Әлеуметтік сала', safety: 'Қауіпсіздік', services: 'Қалалық сервистер' },
}

const DICTS: Record<Lang, Record<I18nKey, string>> = { ru, kk }

interface Settings {
  lang: Lang
  theme: Theme
}

interface I18nValue extends Settings {
  t: (key: I18nKey, vars?: Record<string, string | number>) => string
  metric: (m: Metric) => string
  category: (c: Category) => string
  setLang: (l: Lang) => void
  setTheme: (t: Theme) => void
}

const KEY = 'qalabalance:settings:v1'
const Ctx = createContext<I18nValue | null>(null)

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return {
      lang: s.lang === 'kk' ? 'kk' : 'ru',
      theme: s.theme === 'dark' || s.theme === 'system' ? s.theme : 'light',
    }
  } catch {
    return { lang: 'ru', theme: 'light' }
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* приватный режим — настройки живут до перезагрузки */
    }
    document.documentElement.lang = settings.lang === 'kk' ? 'kk' : 'ru'
    const apply = () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings])

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => {
      let s: string = DICTS[settings.lang][key] ?? ru[key]
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    },
    [settings.lang],
  )

  const value = useMemo<I18nValue>(
    () => ({
      ...settings,
      t,
      metric: (m) => METRIC_LABELS_I18N[settings.lang][m],
      category: (c) => CATEGORY_LABELS_I18N[settings.lang][c],
      setLang: (lang) => setSettings((s) => ({ ...s, lang })),
      setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
    }),
    [settings, t],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n вне SettingsProvider')
  return v
}
