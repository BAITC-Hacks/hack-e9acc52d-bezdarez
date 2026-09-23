import type { Category, CityScores, Metric } from '../types/project'

export const TOTAL_BUDGET = 100
/**
 * Условный курс: 1 бюджетная единица = 2 млрд ₸, весь бюджет — 200 млрд ₸.
 * Порядок величины соответствует крупным городским программам развития, значение модельное.
 */
export const TENGE_BN_PER_UNIT = 2
export const CATEGORY_MIN_BUDGET = 5
export const CATEGORY_MAX_BUDGET = 40

/** Исходное состояние виртуального города (FR-02). */
export const BASELINE: CityScores = {
  mobility: 54,
  ecology: 50,
  social: 61,
  safety: 68,
  services: 60,
}

/** Веса AQLS (п. 10.1 ТЗ), сумма = 1. */
export const WEIGHTS: CityScores = {
  mobility: 0.25,
  ecology: 0.2,
  social: 0.2,
  safety: 0.2,
  services: 0.15,
}

export const METRICS: Metric[] = ['mobility', 'ecology', 'social', 'safety', 'services']

export const METRIC_LABELS: Record<Metric, string> = {
  mobility: 'Мобильность',
  ecology: 'Экология',
  social: 'Социальный комфорт',
  safety: 'Безопасность',
  services: 'Городские сервисы',
}

export const CATEGORIES: Category[] = ['transport', 'greening', 'social', 'safety', 'services']

export const CATEGORY_LABELS: Record<Category, string> = {
  transport: 'Транспорт',
  greening: 'Озеленение',
  social: 'Социальная сфера',
  safety: 'Безопасность',
  services: 'Городские сервисы',
}

/** Главный показатель, на который работает каждая сфера. */
export const CATEGORY_MAIN_METRIC: Record<Category, Metric> = {
  transport: 'mobility',
  greening: 'ecology',
  social: 'social',
  safety: 'safety',
  services: 'services',
}

export const CITY_PROBLEMS: string[] = [
  'Загруженность дорог в часы пик',
  'Недостаток зелёных зон',
  'Нагрузка на школы и поликлиники',
  'Недостаточное освещение отдельных территорий',
  'Длительная обработка обращений жителей',
]

export const DEMO_DISCLAIMER =
  'Все показатели, коэффициенты и результаты — модельные и демонстрационные. Это не официальная оценка и не прогноз для города Астаны.'
