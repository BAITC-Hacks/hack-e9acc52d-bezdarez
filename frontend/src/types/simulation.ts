import type { Category, CityScores } from './project'

export type Horizon = '1y' | '3y'

export interface SelectedDecision {
  category: Category
  projectId: string
  allocatedBudget: number
}

/** Черновик выбора: проект может быть ещё не выбран. */
export type DraftDecisions = Record<Category, { projectId: string | null; allocatedBudget: number }>

export interface ProjectContribution {
  projectId: string
  title: string
  category: Category
  allocatedBudget: number
  efficiency: number
  effectOneYear: CityScores
  effectThreeYears: CityScores
}

export interface AppliedPenalty {
  kind: 'underfunded' | 'overfunded' | 'maintenance'
  category?: Category
  points: number
  description: string
}

export interface HorizonOutcome {
  scores: CityScores
  overall: number
  penalties: AppliedPenalty[]
  penaltyTotal: number
  positiveEffects: string[]
  risks: string[]
}

export type StrategyProfileId =
  | 'technocrat'
  | 'green'
  | 'social'
  | 'safety'
  | 'services'
  | 'balanced'

export interface StrategyProfile {
  id: StrategyProfileId
  title: string
  description: string
}

export interface SimulationResult {
  before: CityScores
  afterOneYear: CityScores
  afterThreeYears: CityScores

  overallBefore: number
  overallAfterOneYear: number
  overallAfterThreeYears: number

  selectedDecisions: SelectedDecision[]
  contributions: ProjectContribution[]

  appliedSynergies: string[]
  oneYear: HorizonOutcome
  threeYears: HorizonOutcome

  strategyProfile: StrategyProfile
}

export interface ValidationIssue {
  code: 'missing_project' | 'under_budget' | 'over_budget' | 'category_range'
  category?: Category
  message: string
}
