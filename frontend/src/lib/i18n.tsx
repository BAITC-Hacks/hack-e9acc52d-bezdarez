import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Category, Metric } from '../types/project'

export type Lang = 'ru' | 'kk' | 'en'
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
  'nav.sections': 'Разделы',
  'nav.goHome': 'На главную',
  'nav.skipContent': 'К основному содержимому',
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
  'budget.unallocated': 'Не распределено',
  'budget.categoryLabel': 'Бюджет: {category}',
  'budget.belowThreshold': 'Меньше {n} — штраф за несбалансированность',
  'budget.aboveThreshold': 'Больше {n} — штраф за несбалансированность',

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
  'start.initialValue': 'стартовое значение {value}',
  'start.projectCount': 'Проектов на выбор: {n}',

  'sim.direction': 'Направление {n} из {total}',
  'sim.back': 'Назад',
  'sim.next': 'Далее',
  'sim.forecast': 'Предварительный прогноз · 1 год',
  'sim.pickOne': 'Выберите хотя бы один проект, чтобы увидеть прогноз.',
  'sim.toFix': 'Что нужно исправить',
  'sim.notSelected': 'Проект не выбран',
  'sim.projects': 'Проекты',
  'sim.categories': 'Направления',
  'sim.forecastLabel': 'Прогноз',

  'card.min': 'Мин.',
  'card.rec': 'Рекоменд.',
  'card.max': 'Макс.',
  'card.select': 'Выбрать проект',
  'card.selected': 'Выбрано',
  'card.risk': 'Риск',
  'card.in3y': 'через 3 года',
  'card.maintenance': 'Обслуживание',
  'card.effects': 'Эффект за 1 год при рекомендуемом бюджете',
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
  'result.horizon': 'Горизонт планирования',
  'result.efficiency': 'Эффективность вложений',
  'result.metric': 'Показатель',
  'result.before': 'До',
  'result.after': 'После',
  'result.change': 'Изменение',
  'result.tableCaption': 'Показатели до и после',
  'result.scoreLabel': 'Индекс качества жизни Астаны',
  'result.scoreOf': '{label}: {value} из 100',
  'result.penalties': 'штрафы',

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
  'settings.close': 'Закрыть',
  'settings.api': 'AI-сервис',
  'settings.apiOn': 'Подключён: {model}',
  'settings.apiOff': 'Не подключён — используется системная аналитика',

  'assistant.title': 'AI-помощник',
  'assistant.subtitle': 'Отвечу на вопросы и помогу с симулятором',
  'assistant.ask': 'Спросить',
  'assistant.placeholder': 'Задайте любой вопрос…',
  'assistant.tour': 'Пройти обучение',
  'assistant.thinking': 'Думаю…',

  'tour.skip': 'Пропустить',
  'tour.next': 'Далее',
  'tour.back': 'Назад',
  'tour.done': 'Понятно, начинаем!',
  'tour.step': 'Шаг {n} из {total}',

  'penalty.title': 'Штрафы и ограничения',
  'issue.missing_project': 'Выберите проект в категории «{category}».',
  'issue.category_range': 'Бюджет направления «{category}» должен быть от 5 до 40 единиц.',
  'issue.under_budget': 'Распределите ещё {n} бюджетных единиц.',
  'issue.over_budget': 'Бюджет превышен на {n} единиц. Уменьшите финансирование одного или нескольких направлений.',
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
  'nav.sections': 'Бөлімдер',
  'nav.goHome': 'Басты бетке өту',
  'nav.skipContent': 'Негізгі мазмұнға өту',
  'brand.sub': '5 сағатқа әкім',

  'budget.total': 'Бюджет',
  'budget.allocated': 'Бөлінді',
  'budget.left': 'Қалды',
  'budget.over': 'Артық бөлінді',
  'budget.units': 'бірл.',
  'budget.fixErrors': 'Бюджетті бөлудегі қателерді түзетіңіз',
  'budget.distribution': 'Бюджетті бөлу',
  'budget.byRecommended': 'Ұсыныс бойынша',
  'budget.recommendedShort': 'ұсын.',
  'budget.unallocated': 'Бөлінбеген қаражат',
  'budget.categoryLabel': 'Бюджет: {category}',
  'budget.belowThreshold': '{n} бірліктен аз — теңгерімсіздік үшін балл шегеріледі',
  'budget.aboveThreshold': '{n} бірліктен көп — теңгерімсіздік үшін балл шегеріледі',

  'start.chip': 'Қала бюджетінің AI-симуляторы',
  'start.title': '5 сағатқа әкім',
  'start.youGot': 'Сіздің қарамағыңызда',
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
  'start.rule3': 'Бір бағытқа 10 бірліктен аз немесе 30 бірліктен көп бөлінсе, теңгерімсіздік үшін балл шегеріледі.',
  'start.rule4': 'Бюджет артқан сайын әсер баяу өседі: қосымша қаржы әсерді ең көбі 15%-ға арттырады.',
  'start.rule5': '1 жылдан және 3 жылдан кейінгі нәтижелерді салыстырыңыз.',
  'start.penaltyRules': 'Айып ұпайлары қалай есептеледі',
  'start.initialValue': 'бастапқы мәні {value}',
  'start.projectCount': 'Таңдауға болатын жобалар: {n}',

  'sim.direction': 'Бағыт: {n}/{total}',
  'sim.back': 'Артқа',
  'sim.next': 'Келесі',
  'sim.forecast': 'Алдын ала болжам · 1 жыл',
  'sim.pickOne': 'Болжамды көру үшін кемінде бір жобаны таңдаңыз.',
  'sim.toFix': 'Нені түзету керек',
  'sim.notSelected': 'Жоба таңдалмаған',
  'sim.projects': 'Жобалар',
  'sim.categories': 'Бағыттар',
  'sim.forecastLabel': 'Болжам',

  'card.min': 'Ең аз',
  'card.rec': 'Ұсынылған',
  'card.max': 'Ең көп',
  'card.select': 'Жобаны таңдау',
  'card.selected': 'Таңдалды',
  'card.risk': 'Тәуекел',
  'card.in3y': '3 жылдан кейін',
  'card.maintenance': 'Қызмет көрсету',
  'card.effects': 'Ұсынылған бюджет бөлінгенде 1 жылдағы әсер',
  'speed.fast': 'Жылдам әсер',
  'speed.medium': 'Орта мерзімді',
  'speed.slow': 'Ұзақ мерзімді',

  'result.title': 'Симуляция нәтижесі',
  'result.in1y': '1 жылдан кейін',
  'result.in3y': '3 жылдан кейін',
  'result.1y': '1 жыл',
  'result.3y': '3 жыл',
  'result.cityProfile': 'Қала көрсеткіштері',
  'result.beforeAfter': 'Дейін және кейін',
  'result.selectedProjects': 'Таңдалған жобалар',
  'result.synergiesPenalties': 'Бірлескен әсерлер мен айып ұпайлары',
  'result.noSynergies': 'Бірлескен әсерлер мен айып ұпайлары жоқ.',
  'result.penaltiesTotal': 'Айып ұпайлары: −{points} (AQLS-те ескерілген)',
  'result.penaltyDetails': 'Айып ұпайлары туралы толығырақ',
  'result.districtEffect': 'Аудандар бойынша әсер',
  'result.yourProfile': 'Сіздің бейініңіз',
  'result.profileNote': 'Бейінді бюджет бөлінісіне қарай алгоритм анықтайды. Тіл моделі оны өзгертпейді.',
  'result.points': 'балл',
  'result.scale': '0–100 шкаласы · модельдік көрсеткіш',
  'result.horizon': 'Жоспарлау мерзімі',
  'result.efficiency': 'Қаржының тиімділігі',
  'result.metric': 'Көрсеткіш',
  'result.before': 'Бұрын',
  'result.after': 'Кейін',
  'result.change': 'Өзгеріс',
  'result.tableCaption': 'Бастапқы және кейінгі көрсеткіштер',
  'result.scoreLabel': 'Астанадағы өмір сапасының индексі',
  'result.scoreOf': '{label}: 100 балдан {value}',
  'result.penalties': 'шегерілген балдар',

  'ai.titleAi': 'Нәтиженің AI түсіндірмесі',
  'ai.titleSystem': 'Нәтижені талдау',
  'ai.loading': 'AI есептелген нәтижені талдап жатыр…',
  'ai.byModel': 'Түсіндірмені {model} моделі тек есептелген деректер негізінде жасады',
  'ai.bySystem': 'Түсіндірмені жүйе есептелген деректер негізінде жасады',
  'ai.retry': 'AI-дан қайта сұрау',
  'ai.unavailable': 'AI-түсіндірме уақытша қолжетімсіз. Жүйе жасаған түсіндірме көрсетілді.',
  'ai.reason': 'Себебі',
  'ai.positives': 'Оң нәтижелер',
  'ai.risks': 'Тәуекелдер мен шектеулер',
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
  'settings.theme': 'Түс режимі',
  'settings.light': 'Ашық',
  'settings.dark': 'Қараңғы',
  'settings.system': 'Жүйедегідей',
  'settings.language': 'Интерфейс тілі',
  'settings.tour': 'Оқыту',
  'settings.tourText': 'AI көмекші симуляторды пайдалануды қадамдап түсіндіреді.',
  'settings.tourStart': 'Оқытудан өту',
  'settings.reset': 'Таңдауларды өшіру',
  'settings.resetText': 'Осы браузерде сақталған жобалар мен бюджет таңдауын жою.',
  'settings.close': 'Жабу',
  'settings.api': 'AI қызметі',
  'settings.apiOn': 'Қосылған: {model}',
  'settings.apiOff': 'Қосылмаған — жүйелік талдау қолданылады',

  'assistant.title': 'AI-көмекші',
  'assistant.subtitle': 'Сұрақтарға жауап беріп, симуляторды пайдалануға көмектесемін',
  'assistant.ask': 'Сұрау',
  'assistant.placeholder': 'Кез келген сұрағыңызды қойыңыз…',
  'assistant.tour': 'Оқытудан өту',
  'assistant.thinking': 'Ойланып жатырмын…',

  'tour.skip': 'Өткізіп жіберу',
  'tour.next': 'Келесі',
  'tour.back': 'Артқа',
  'tour.done': 'Түсінікті, бастаймыз!',
  'tour.step': 'Қадам: {n}/{total}',

  'penalty.title': 'Айып ұпайлары, айыппұлдар және шектеулер',
  'issue.missing_project': '«{category}» санатында жобаны таңдаңыз.',
  'issue.category_range': '«{category}» бағытының бюджеті 5-тен 40 бірлікке дейін болуы керек.',
  'issue.under_budget': 'Тағы {n} бюджет бірлігін бөліңіз.',
  'issue.over_budget': 'Бюджет {n} бірлікке асып кетті. Бір немесе бірнеше бағыттың қаржысын азайтыңыз.',
}

const en: Record<I18nKey, string> = {
  'nav.home': 'Home',
  'nav.simulator': 'Simulator',
  'nav.result': 'Results',
  'nav.settings': 'Settings',
  'nav.tour': 'Tutorial',
  'nav.start': 'Start managing',
  'nav.continue': 'Continue managing',
  'nav.edit': 'Edit decisions',
  'nav.restart': 'Start over',
  'nav.run': 'Run simulation',
  'nav.runShort': 'Run',
  'nav.sections': 'Sections',
  'nav.goHome': 'Go to home page',
  'nav.skipContent': 'Skip to main content',
  'brand.sub': 'Mayor for 5 hours',

  'budget.total': 'Budget',
  'budget.allocated': 'Allocated',
  'budget.left': 'Remaining',
  'budget.over': 'Over budget',
  'budget.units': 'units',
  'budget.fixErrors': 'Fix the budget allocation errors',
  'budget.distribution': 'Budget allocation',
  'budget.byRecommended': 'Use recommended amounts',
  'budget.recommendedShort': 'rec.',
  'budget.unallocated': 'Unallocated',
  'budget.categoryLabel': 'Budget: {category}',
  'budget.belowThreshold': 'Below {n} — imbalance penalty applies',
  'budget.aboveThreshold': 'Above {n} — imbalance penalty applies',

  'start.chip': 'AI city budget simulator',
  'start.title': 'Mayor for 5 hours',
  'start.youGot': 'You have',
  'start.budgetUnits': 'budget units',
  'start.lead': 'Allocate them across five areas, choose projects, and see how your decisions affect quality of life in a virtual city.',
  'start.noReg': 'No sign-up · about 3 minutes',
  'start.projectsToChoose': 'to choose from',
  'start.initialState': 'The city at the start',
  'start.beforeDecisions': 'before your decisions',
  'start.startAqls': 'Starting AQLS',
  'start.problems': 'City challenges',
  'start.rules': 'Rules',
  'start.rule1': 'Choose exactly one project in each of the five areas.',
  'start.rule2': 'Allocate exactly {total} units ({tenge}; 1 unit = {unit}), with 5 to 40 units per area.',
  'start.rule3': 'Allocating fewer than 10 or more than 30 units to an area incurs an imbalance penalty.',
  'start.rule4': 'Impact grows more slowly than spending: extra funding adds at most 15% to a project’s effect.',
  'start.rule5': 'Compare the results after 1 year and after 3 years.',
  'start.penaltyRules': 'How penalties are calculated',
  'start.initialValue': 'starting value {value}',
  'start.projectCount': 'Projects to choose from: {n}',

  'sim.direction': 'Area {n} of {total}',
  'sim.back': 'Back',
  'sim.next': 'Next',
  'sim.forecast': 'Initial forecast · 1 year',
  'sim.pickOne': 'Choose at least one project to see a forecast.',
  'sim.toFix': 'What needs fixing',
  'sim.notSelected': 'No project selected',
  'sim.projects': 'Projects',
  'sim.categories': 'Areas',
  'sim.forecastLabel': 'Forecast',

  'card.min': 'Min.',
  'card.rec': 'Rec.',
  'card.max': 'Max.',
  'card.select': 'Select project',
  'card.selected': 'Selected',
  'card.risk': 'Risk',
  'card.in3y': 'after 3 years',
  'card.maintenance': 'Maintenance',
  'card.effects': 'Impact after 1 year at the recommended budget',
  'speed.fast': 'Quick impact',
  'speed.medium': 'Medium term',
  'speed.slow': 'Long term',

  'result.title': 'Simulation results',
  'result.in1y': 'After 1 year',
  'result.in3y': 'After 3 years',
  'result.1y': '1 year',
  'result.3y': '3 years',
  'result.cityProfile': 'City indicators',
  'result.beforeAfter': 'Before and after',
  'result.selectedProjects': 'Selected projects',
  'result.synergiesPenalties': 'Synergies and penalties',
  'result.noSynergies': 'No synergies or penalties.',
  'result.penaltiesTotal': 'Penalties: −{points} points (included in AQLS)',
  'result.penaltyDetails': 'More about penalties',
  'result.districtEffect': 'Impact by district',
  'result.yourProfile': 'Your approach',
  'result.profileNote': 'Determined by an algorithm based on your budget allocation, independently of the language model.',
  'result.points': 'points',
  'result.scale': '0–100 scale · simulated indicator',
  'result.horizon': 'Planning horizon',
  'result.efficiency': 'Spending efficiency',
  'result.metric': 'Indicator',
  'result.before': 'Before',
  'result.after': 'After',
  'result.change': 'Change',
  'result.tableCaption': 'Indicators before and after',
  'result.scoreLabel': 'Astana Quality of Life Score',
  'result.scoreOf': '{label}: {value} out of 100',
  'result.penalties': 'penalties',

  'ai.titleAi': 'AI explanation of the results',
  'ai.titleSystem': 'Results explained',
  'ai.loading': 'AI is reviewing the calculated results…',
  'ai.byModel': 'Generated by {model} using only the calculated data',
  'ai.bySystem': 'Generated by the system using the calculated data',
  'ai.retry': 'Try AI again',
  'ai.unavailable': 'The AI explanation is temporarily unavailable. A system-generated explanation is shown instead.',
  'ai.reason': 'Reason',
  'ai.positives': 'Positive outcomes',
  'ai.risks': 'Risks and trade-offs',
  'ai.recommendation': 'Recommendation',
  'ai.disclaimer': 'AI receives only values calculated by the system and does not change scores. This is a demonstration model, not a forecast for Astana.',
  'ai.citizens': 'What residents might say',

  'map.title': 'Map of Astana’s districts',
  'map.hint': 'Hover over a district or select it using a button below',
  'map.index': 'District score',
  'map.district': 'District',
  'map.districtIndex': 'district score',
  'map.problems': 'District challenges',
  'map.vsCity': 'vs. city',
  'map.eqCity': '= city',
  'map.river': 'Ishim River',
  'map.note': 'District boundaries © OpenStreetMap contributors (ODbL). District indicators and challenges are examples, not official statistics.',
  'map.noteAfter': ' District impact is a visual projection of the citywide results adjusted for each district’s needs.',

  'demo.short': 'Demonstration data — not an official assessment of Astana',
  'demo.long': 'All indicators, coefficients, and results are simulated for demonstration. They are not an official assessment or forecast for Astana.',

  'settings.title': 'Settings',
  'settings.theme': 'Appearance',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.system': 'System',
  'settings.language': 'Interface language',
  'settings.tour': 'Tutorial',
  'settings.tourText': 'A step-by-step tour of the simulator with the AI assistant.',
  'settings.tourStart': 'Start tutorial',
  'settings.reset': 'Reset decisions',
  'settings.resetText': 'Clear the project choices and budget saved in this browser.',
  'settings.close': 'Close',
  'settings.api': 'AI service',
  'settings.apiOn': 'Connected: {model}',
  'settings.apiOff': 'Not connected — system analysis is available',

  'assistant.title': 'AI assistant',
  'assistant.subtitle': 'Ask a question or get help with the simulator',
  'assistant.ask': 'Ask',
  'assistant.placeholder': 'Ask any question…',
  'assistant.tour': 'Start tutorial',
  'assistant.thinking': 'Thinking…',

  'tour.skip': 'Skip',
  'tour.next': 'Next',
  'tour.back': 'Back',
  'tour.done': 'Got it, let’s start!',
  'tour.step': 'Step {n} of {total}',

  'penalty.title': 'Penalties and limits',
  'issue.missing_project': 'Choose a project in “{category}”.',
  'issue.category_range': 'The budget for “{category}” must be between 5 and 40 units.',
  'issue.under_budget': 'Allocate the remaining {n} budget units.',
  'issue.over_budget': 'You are {n} units over budget. Reduce funding in one or more areas.',
}

const METRIC_LABELS_I18N: Record<Lang, Record<Metric, string>> = {
  ru: { mobility: 'Мобильность', ecology: 'Экология', social: 'Социальный комфорт', safety: 'Безопасность', services: 'Городские сервисы' },
  kk: { mobility: 'Қозғалыс қолайлылығы', ecology: 'Экология', social: 'Әлеуметтік жайлылық', safety: 'Қауіпсіздік', services: 'Қала қызметтері' },
  en: { mobility: 'Mobility', ecology: 'Environment', social: 'Social well-being', safety: 'Safety', services: 'City services' },
}

const METRIC_SHORT_I18N: Record<Lang, Record<Metric, string>> = {
  ru: { mobility: 'М', ecology: 'Э', social: 'С', safety: 'Б', services: 'ГС' },
  kk: { mobility: 'Қозғ.', ecology: 'Эко.', social: 'Әл.', safety: 'Қау.', services: 'Қыз.' },
  en: { mobility: 'M', ecology: 'E', social: 'W', safety: 'S', services: 'CS' },
}

const METRIC_COMPACT_I18N: Record<Lang, Record<Metric, string>> = {
  ru: { mobility: 'Мобильность', ecology: 'Экология', social: 'Соц. комфорт', safety: 'Безопасность', services: 'Сервисы' },
  kk: { mobility: 'Қозғалыс', ecology: 'Экология', social: 'Жайлылық', safety: 'Қауіпсіздік', services: 'Қызметтер' },
  en: { mobility: 'Mobility', ecology: 'Environment', social: 'Well-being', safety: 'Safety', services: 'Services' },
}

const CATEGORY_LABELS_I18N: Record<Lang, Record<Category, string>> = {
  ru: { transport: 'Транспорт', greening: 'Озеленение', social: 'Социальная сфера', safety: 'Безопасность', services: 'Городские сервисы' },
  kk: { transport: 'Көлік', greening: 'Көгалдандыру', social: 'Әлеуметтік сала', safety: 'Қауіпсіздік', services: 'Қала қызметтері' },
  en: { transport: 'Transport', greening: 'Green spaces', social: 'Social services', safety: 'Safety', services: 'City services' },
}

const DICTS: Record<Lang, Record<I18nKey, string>> = { ru, kk, en }

// eslint-disable-next-line react-refresh/only-export-components
export const localizedCategory = (category: Category, lang: Lang): string => CATEGORY_LABELS_I18N[lang][category]

// eslint-disable-next-line react-refresh/only-export-components
export const localizedMetric = (metric: Metric, lang: Lang): string => METRIC_LABELS_I18N[lang][metric]

interface Settings {
  lang: Lang
  theme: Theme
}

interface I18nValue extends Settings {
  t: (key: I18nKey, vars?: Record<string, string | number>) => string
  metric: (m: Metric) => string
  metricShort: (m: Metric) => string
  metricCompact: (m: Metric) => string
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
      lang: s.lang === 'kk' || s.lang === 'en' ? s.lang : 'ru',
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
    document.documentElement.lang = settings.lang
    document.title = `QALA BALANCE — ${DICTS[settings.lang]['brand.sub']}`
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
      metric: (m) => localizedMetric(m, settings.lang),
      metricShort: (m) => METRIC_SHORT_I18N[settings.lang][m],
      metricCompact: (m) => METRIC_COMPACT_I18N[settings.lang][m],
      category: (c) => localizedCategory(c, settings.lang),
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
