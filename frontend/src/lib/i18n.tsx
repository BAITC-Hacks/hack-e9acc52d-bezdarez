import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CITY_PROBLEMS } from '../data/baseline'
import type { District } from '../data/districts'
import {
  CITY_PROBLEMS_TEXT,
  DISTRICT_TEXT,
  PROFILE_TEXT,
  PROJECT_TEXT,
  SYNERGY_TEXT,
  type DistrictText,
  type ProjectText,
} from '../data/translations'
import type { Category, CityProject, Metric } from '../types/project'
import { CATEGORY_LABELS_I18N, METRIC_LABELS_I18N } from '../data/translations'

import type { Lang } from '../data/translations'
export type { Lang }
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
  'settings.kkNote': '',
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
  'issue.missing_project': '«{category}» санатында жобаны таңдаңыз.',
  'issue.category_range': '«{category}» бағытының бюджеті 5-тен 40 бірлікке дейін болуы керек.',
  'issue.under_budget': 'Тағы {n} бюджет бірлігін бөліңіз.',
  'issue.over_budget': 'Бюджет {n} бірлікке асып кетті. Бір немесе бірнеше бағыттың қаржысын азайтыңыз.',
}

const en: Record<I18nKey, string> = {
  "nav.home": "Home",
  "nav.simulator": "Simulator",
  "nav.result": "Result",
  "nav.settings": "Settings",
  "nav.tour": "Tutorial",
  "nav.start": "Start governing",
  "nav.continue": "Continue governing",
  "nav.edit": "Change decisions",
  "nav.restart": "Start over",
  "nav.run": "Run simulation",
  "nav.runShort": "Run",
  "brand.sub": "Akim for 5 hours",
  "budget.total": "Budget",
  "budget.allocated": "Allocated",
  "budget.left": "Left",
  "budget.over": "Over",
  "budget.units": "u.",
  "budget.fixErrors": "Fix the allocation errors",
  "budget.distribution": "Budget allocation",
  "budget.byRecommended": "By recommendations",
  "budget.recommendedShort": "rec.",
  "start.chip": "AI city budget simulator",
  "start.title": "Akim for 5 hours",
  "start.youGot": "You have",
  "start.budgetUnits": "budget units",
  "start.lead": "Split them across five areas, choose projects and see how your decisions change the quality of life in a virtual city.",
  "start.noReg": "No sign-up · about 3 minutes",
  "start.projectsToChoose": "to choose from",
  "start.initialState": "Initial state of the city",
  "start.beforeDecisions": "before your decisions",
  "start.startAqls": "Starting AQLS",
  "start.problems": "City problems",
  "start.rules": "Rules",
  "start.rule1": "Choose exactly one project in each of the five areas.",
  "start.rule2": "Allocate exactly {total} units ({tenge}, 1 u. = {unit}): 5 to 40 per area.",
  "start.rule3": "Less than 10 or more than 30 units per area is penalised as an imbalance.",
  "start.rule4": "Impact grows slower than budget: overspending adds at most +15%.",
  "start.rule5": "Compare the result after 1 year and after 3 years.",
  "start.penaltyRules": "How penalties work",
  "sim.direction": "Area {n} of {total}",
  "sim.back": "Back",
  "sim.next": "Next",
  "sim.forecast": "Preliminary forecast · 1 year",
  "sim.pickOne": "Choose at least one project to see a forecast.",
  "sim.toFix": "What to fix",
  "sim.notSelected": "No project selected",
  "sim.projects": "Projects",
  "card.min": "Min",
  "card.rec": "Recommended",
  "card.max": "Max",
  "card.select": "Choose project",
  "card.selected": "Selected",
  "card.risk": "Risk",
  "card.in3y": "after 3 years",
  "card.maintenance": "Maintenance",
  "speed.fast": "Quick impact",
  "speed.medium": "Medium term",
  "speed.slow": "Long term",
  "result.title": "Simulation result",
  "result.in1y": "After 1 year",
  "result.in3y": "After 3 years",
  "result.1y": "1 year",
  "result.3y": "3 years",
  "result.cityProfile": "City profile",
  "result.beforeAfter": "Before and after",
  "result.selectedProjects": "Selected projects",
  "result.synergiesPenalties": "Synergies and penalties",
  "result.noSynergies": "No synergies or penalties.",
  "result.penaltiesTotal": "Penalties: −{points} points (included in AQLS)",
  "result.penaltyDetails": "Penalty details",
  "result.districtEffect": "Impact by district",
  "result.yourProfile": "Your profile",
  "result.profileNote": "Determined by an algorithm from your budget split, not by a language model.",
  "result.points": "points",
  "result.scale": "Scale 0–100 · model indicator",
  "ai.titleAi": "AI explanation",
  "ai.titleSystem": "Impact breakdown",
  "ai.loading": "AI is analysing the computed result…",
  "ai.byModel": "Generated by {model} from computed data only",
  "ai.bySystem": "Generated by the system from computed data",
  "ai.retry": "Retry AI",
  "ai.unavailable": "The AI explanation is temporarily unavailable. Showing the system-generated explanation.",
  "ai.reason": "Reason",
  "ai.positives": "Positive effects",
  "ai.risks": "Risks and trade-offs",
  "ai.recommendation": "Recommendation",
  "ai.disclaimer": "The AI only receives values computed by the system and never changes scores. The model is a demo, not a forecast for Astana.",
  "ai.citizens": "What residents say",
  "map.title": "Astana district map",
  "map.hint": "Hover over a district or pick it with the buttons below",
  "map.index": "District index",
  "map.district": "District",
  "map.districtIndex": "district index",
  "map.problems": "District problems",
  "map.vsCity": "vs city",
  "map.eqCity": "= city",
  "map.river": "Esil river",
  "map.note": "District boundaries © OpenStreetMap contributors (ODbL). District indicators and problems are demo data, not official statistics.",
  "map.noteAfter": " District impact is a visual projection of the city result weighted by each district’s needs.",
  "demo.short": "Demo data — not an official assessment of Astana",
  "demo.long": "All indicators, coefficients and results are model and demo values. This is not an official assessment or forecast for the city of Astana.",
  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.light": "Light",
  "settings.dark": "Dark",
  "settings.system": "System",
  "settings.language": "Interface language",
  "settings.tour": "Tutorial",
  "settings.tourText": "A step-by-step tour of the simulator with the AI assistant.",
  "settings.tourStart": "Take the tutorial",
  "settings.reset": "Reset decisions",
  "settings.resetText": "Delete the saved project and budget choices in this browser.",
  "settings.kkNote": "",
  "settings.close": "Close",
  "settings.api": "AI service",
  "settings.apiOn": "Connected: {model}",
  "settings.apiOff": "Not connected — using system analytics",
  "assistant.title": "AI assistant",
  "assistant.subtitle": "I’ll suggest what to do next",
  "assistant.ask": "Ask",
  "assistant.placeholder": "E.g.: how can I improve ecology?",
  "assistant.tour": "Take the tutorial",
  "assistant.thinking": "Thinking…",
  "tour.skip": "Skip",
  "tour.next": "Next",
  "tour.back": "Back",
  "tour.done": "Got it, let’s go!",
  "tour.step": "Step {n} of {total}",
  "penalty.title": "Penalties and limits",
  "issue.missing_project": "Choose a project in «{category}».",
  "issue.category_range": "The budget for «{category}» must be between 5 and 40 units.",
  "issue.under_budget": "Allocate {n} more budget units.",
  "issue.over_budget": "Budget exceeded by {n} units. Reduce funding for one or more areas.",
}

const DICTS: Record<Lang, Record<I18nKey, string>> = { ru, kk, en }

interface Settings {
  lang: Lang
  theme: Theme
}

interface I18nValue extends Settings {
  t: (key: I18nKey, vars?: Record<string, string | number>) => string
  metric: (m: Metric) => string
  category: (c: Category) => string
  /** Переведённые тексты проекта (название, описание, плюсы, риски). */
  project: (p: CityProject) => ProjectText
  district: (d: District) => DistrictText
  cityProblems: () => string[]
  profile: (id: string, fallback: { title: string; description: string }) => { title: string; description: string }
  synergy: (id: string, fallback: string) => string
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
      project: (p) =>
        settings.lang === 'ru'
          ? { title: p.title, short: p.shortDescription, benefits: p.benefits, risks: p.risks }
          : (PROJECT_TEXT[settings.lang][p.id] ?? { title: p.title, short: p.shortDescription, benefits: p.benefits, risks: p.risks }),
      district: (d) =>
        settings.lang === 'ru'
          ? { name: d.name, short: d.short, profile: d.profile, problems: d.problems }
          : DISTRICT_TEXT[settings.lang][d.id],
      cityProblems: () => (settings.lang === 'ru' ? CITY_PROBLEMS : CITY_PROBLEMS_TEXT[settings.lang]),
      profile: (id, fb) => (settings.lang === 'ru' ? fb : (PROFILE_TEXT[settings.lang][id] ?? fb)),
      synergy: (id, fb) => (settings.lang === 'ru' ? fb : (SYNERGY_TEXT[settings.lang][id] ?? fb)),
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
