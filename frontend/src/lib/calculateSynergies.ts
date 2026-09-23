import { SYNERGIES } from '../data/synergies'
import type { Synergy } from '../types/project'

export function findSynergies(projectIds: string[], catalog: Synergy[] = SYNERGIES): Synergy[] {
  const chosen = new Set(projectIds)
  return catalog.filter((s) => chosen.has(s.projects[0]) && chosen.has(s.projects[1]))
}
