import type { Synergy } from '../types/project'

/** Синергии проектов (п. 11 ТЗ): бонус начисляется, если выбраны оба проекта. */
export const SYNERGIES: Synergy[] = [
  {
    id: 'lights-digital',
    projects: ['adaptive-traffic-lights', 'digital-requests'],
    bonus: { services: 2 },
    description: 'Адаптивные светофоры + Цифровая платформа обращений: +2 к городским сервисам',
  },
  {
    id: 'buslanes-trees',
    projects: ['bus-lanes', 'tree-planting'],
    bonus: { ecology: 2 },
    description: 'Автобусные полосы + Посадка деревьев: +2 к экологии',
  },
  {
    id: 'courtyards-lighting',
    projects: ['courtyard-improvement', 'street-lighting'],
    bonus: { safety: 2, social: 1 },
    description: 'Благоустройство дворов + Освещение улиц: +2 к безопасности, +1 к социальной сфере',
  },
  {
    id: 'clinics-emergency',
    projects: ['mobile-clinics', 'emergency-center'],
    bonus: { social: 2, safety: 1 },
    description: 'Мобильные медпункты + Центр реагирования: +2 к социальной сфере, +1 к безопасности',
  },
  {
    id: 'snow-analytics',
    projects: ['smart-snow-removal', 'incident-analytics'],
    bonus: { mobility: 1, services: 2 },
    description: 'Умная уборка снега + Аналитика инцидентов: +1 к мобильности, +2 к сервисам',
  },
  {
    id: 'irrigation-waste',
    projects: ['smart-irrigation', 'waste-optimization'],
    bonus: { ecology: 2, services: 1 },
    description: 'Умный полив + Оптимизация вывоза отходов: +2 к экологии, +1 к сервисам',
  },
]
