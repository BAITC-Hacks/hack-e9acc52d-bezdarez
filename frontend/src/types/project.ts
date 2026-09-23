export type Category = 'transport' | 'greening' | 'social' | 'safety' | 'services'

export type Metric = 'mobility' | 'ecology' | 'social' | 'safety' | 'services'

export type CityScores = Record<Metric, number>

export type Speed = 'fast' | 'medium' | 'slow'

export interface CityProject {
  id: string
  category: Category
  title: string
  shortDescription: string
  fullDescription: string

  minBudget: number
  recommendedBudget: number
  maxBudget: number

  /** Изменение показателей при рекомендуемом бюджете на горизонте 1 года. */
  effects: CityScores

  longTermMultiplier: number
  /** 1–4: чем выше, тем сильнее давит на результат через три года. */
  maintenanceCost: number
  speed: Speed

  benefits: string[]
  risks: string[]
  tags: string[]
}

export interface Synergy {
  id: string
  projects: [string, string]
  bonus: Partial<CityScores>
  description: string
}
