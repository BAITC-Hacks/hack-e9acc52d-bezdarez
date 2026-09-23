import type { CityScores } from '../types/project'

export type DistrictId = 'esil' | 'almaty' | 'saryarka' | 'baikonur' | 'nura'

export interface District {
  id: DistrictId
  name: string
  short: string
  /** Условная доля населения — вес района при агрегации до уровня города. */
  share: number
  /** Модельные стартовые показатели района. Взвешенное среднее ≈ стартовые показатели города (FR-02). */
  baseline: CityScores
  profile: string
  problems: string[]
}

/**
 * Пять районов Астаны. Границы — реальные (OpenStreetMap), а показатели, доли и
 * проблемы — демонстрационные: это не официальная статистика районов.
 */
export const DISTRICTS: District[] = [
  {
    id: 'esil',
    short: 'Есиль',
    name: 'Есильский район',
    share: 0.22,
    baseline: { mobility: 48, ecology: 58, social: 56, safety: 76, services: 70 },
    profile: 'Левый берег: новый деловой центр, быстрый рост жилья.',
    problems: ['Пробки на мостах через Есиль в часы пик', 'Переполненные школы в новых микрорайонах', 'Нехватка парковок у бизнес-центров'],
  },
  {
    id: 'almaty',
    short: 'Алматы',
    name: 'Район Алматы',
    share: 0.27,
    baseline: { mobility: 50, ecology: 46, social: 63, safety: 66, services: 57 },
    profile: 'Правый берег: плотная застройка и частный сектор на окраинах.',
    problems: ['Изношенные сети тепло- и водоснабжения', 'Смог от печного отопления в частном секторе', 'Долгие ответы на обращения жителей'],
  },
  {
    id: 'saryarka',
    short: 'Сарыарка',
    name: 'Район Сарыарка',
    share: 0.17,
    baseline: { mobility: 60, ecology: 50, social: 66, safety: 64, services: 58 },
    profile: 'Исторический центр и старый жилой фонд.',
    problems: ['Тёмные дворы и недостаточное освещение', 'Старый жилой фонд и тесные дворы', 'Мало зелёных зон в плотной застройке'],
  },
  {
    id: 'baikonur',
    short: 'Байконыр',
    name: 'Район Байконыр',
    share: 0.18,
    baseline: { mobility: 58, ecology: 44, social: 64, safety: 67, services: 56 },
    profile: 'Север города: промышленные зоны и вокзал.',
    problems: ['Промышленная нагрузка на воздух', 'Переполненные контейнерные площадки', 'Долгая дорога до центра на общественном транспорте'],
  },
  {
    id: 'nura',
    short: 'Нура',
    name: 'Район Нура',
    share: 0.16,
    baseline: { mobility: 57, ecology: 54, social: 55, safety: 66, services: 60 },
    profile: 'Самый молодой район: новые кварталы и частная застройка.',
    problems: ['Не хватает школ и поликлиник рядом с домом', 'Грунтовые дороги и мало остановок', 'Неосвещённые улицы в частном секторе'],
  },
]

export const DISTRICTS_BY_ID = Object.fromEntries(DISTRICTS.map((d) => [d.id, d])) as Record<DistrictId, District>
