export type IndicatorId = 'T1' | 'T2' | 'E1' | 'E2' | 'S1' | 'S2' | 'B1' | 'B2' | 'C1' | 'C2'
export type Indicators = Record<string, number>

export interface Category { id: string; name: string; indicators: IndicatorId[] }
export interface IndicatorMeta { id: IndicatorId; name: string; weight: number }

export interface Rules {
  budget: number
  required_decisions: number
  max_per_category: number
  horizon_quarters: number
  critical_threshold: number
  score: { avg_weight: number; min_weight: number; critical_penalty: number }
  categories: Category[]
  indicators: IndicatorMeta[]
  synergies: { id: string; measures: string[]; anchor: string; indicator: string; bonus: number }[]
  conflicts: { measures: string[]; scope: 'global' | 'same_district' }[]
}

export interface District {
  id: string
  name: string
  profile: string
  population_share: number
  indicators: Indicators
}

export interface Initiative {
  id: string
  category: string
  name: string
  type: 'district' | 'city'
  cost: number
  lag: number
  effects: Indicators
}

export interface Selection { measure_id: string; district_id: string | null }

export interface CriticalValue { district_id: string; district_name: string; indicator: string; value: number }

export interface ScoreBreakdown {
  score: number
  d_avg: number
  d_min: number
  d_min_district: string
  n_crit: number
  penalty: number
  district_scores: Record<string, number>
  critical: CriticalValue[]
}

export interface Game {
  rules: Rules
  districts: District[]
  initiatives: Initiative[]
  baseline: ScoreBreakdown
  demo_scenario: Selection[]
}

export interface ValidationIssue { code: string; message: string; measure_ids: string[] }

export interface Availability {
  available: boolean
  selected: boolean
  reasons: string[]
  blocked_districts: Record<string, string>
}

export interface ValidationReport {
  valid: boolean
  complete: boolean
  issues: ValidationIssue[]
  decisions: number
  required_decisions: number
  budget: number
  spent: number
  remaining: number
  category_counts: Record<string, number>
  availability: Record<string, Availability>
}

export interface DistrictResult {
  id: string
  name: string
  population_share: number
  before: Indicators
  after: Indicators
  delta: Indicators
  score_before: number
  score_after: number
  score_delta: number
}

export interface AppliedEffect {
  measure_id: string
  measure_name: string
  district_ids: string[]
  lag: number
  realized_share: number
  full_effects: Indicators
  realized_effects: Indicators
}

export interface AppliedSynergy { id: string; measures: string[]; district_id: string; indicator: string; bonus: number }

export interface SimulationResult {
  valid: boolean
  issues: ValidationIssue[]
  budget: number
  spent: number
  remaining: number
  selections: Selection[]
  baseline: ScoreBreakdown
  scenario: ScoreBreakdown | null
  score_delta: number | null
  districts: DistrictResult[]
  indicator_deltas: Indicators
  applied_effects: AppliedEffect[]
  applied_synergies: AppliedSynergy[]
}

export interface ComparisonResult {
  base: SimulationResult
  alternative: SimulationResult
  score_difference: number | null
  district_differences: Record<string, number>
  indicator_differences: Indicators
}

export interface AnalysisReport {
  summary: string
  strengths: string[]
  tradeoffs: string[]
  risks: string[]
  district_impacts: { district: string; impact: string }[]
  recommendations: string[]
  alternative_verdict: string
  data_sufficient: boolean
}

export interface AnalysisResponse {
  source: 'llm' | 'rule_based'
  model: string | null
  note: string | null
  tool_calls: string[]
  report: AnalysisReport
  grounding: { checked_numbers: number; unverified_numbers: string[] }
}
