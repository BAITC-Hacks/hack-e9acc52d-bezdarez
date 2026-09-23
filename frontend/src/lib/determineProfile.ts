import type { Category } from '../types/project'
import type { SelectedDecision, StrategyProfile, StrategyProfileId } from '../types/simulation'

const PROFILES: Record<StrategyProfileId, Omit<StrategyProfile, 'id'>> = {
  technocrat: {
    title: 'Технократ',
    description:
      'Основная часть бюджета направлена на транспорт и городские сервисы. Город стал эффективнее, однако социальная сфера и озеленение получили меньше ресурсов.',
  },
  green: {
    title: 'Зелёный управленец',
    description: 'Приоритет — озеленение и экология. Эффект сильнее проявится в долгосрочной перспективе.',
  },
  social: {
    title: 'Социально ориентированный управленец',
    description: 'Главный фокус — школы, медицина и доступная среда. Жители получают больше социальных гарантий.',
  },
  safety: {
    title: 'Приоритет безопасности',
    description: 'Наибольшая доля бюджета ушла на безопасность: освещение, реагирование и профилактику.',
  },
  services: {
    title: 'Сервисный реформатор',
    description: 'Ставка на городские сервисы: обращения, уборку и вывоз отходов. Город работает удобнее каждый день.',
  },
  balanced: {
    title: 'Сбалансированный управленец',
    description: 'Бюджет распределён без резких перекосов. Ни одна сфера не осталась без внимания.',
  },
}

const DOMINANT_PROFILE: Record<Category, StrategyProfileId> = {
  transport: 'technocrat',
  greening: 'green',
  social: 'social',
  safety: 'safety',
  services: 'services',
}

/**
 * Профиль определяется алгоритмом (FR-11), не языковой моделью:
 * 1) транспорт + сервисы ≥ 55% бюджета → технократ;
 * 2) разброс между максимумом и минимумом ≤ 10 ед. → сбалансированный;
 * 3) иначе — по сфере с наибольшим бюджетом (при равенстве — по порядку категорий).
 */
export function determineProfile(decisions: SelectedDecision[]): StrategyProfile {
  const byCategory = Object.fromEntries(decisions.map((d) => [d.category, d.allocatedBudget])) as Record<
    Category,
    number
  >
  const total = decisions.reduce((s, d) => s + d.allocatedBudget, 0) || 1
  const budgets = decisions.map((d) => d.allocatedBudget)
  const spread = Math.max(...budgets) - Math.min(...budgets)

  let id: StrategyProfileId
  if (((byCategory.transport ?? 0) + (byCategory.services ?? 0)) / total >= 0.55) {
    id = 'technocrat'
  } else if (spread <= 10) {
    id = 'balanced'
  } else {
    const top = decisions.reduce((a, b) => (b.allocatedBudget > a.allocatedBudget ? b : a))
    id = DOMINANT_PROFILE[top.category]
  }
  return { id, ...PROFILES[id] }
}
