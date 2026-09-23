import { CATEGORIES } from '../data/baseline'
import { PROJECTS_BY_ID } from '../data/projects'
import type { DraftDecisions } from '../types/simulation'

const KEY = 'qalabalance:draft:v1'

export function emptyDraft(): DraftDecisions {
  return Object.fromEntries(CATEGORIES.map((c) => [c, { projectId: null, allocatedBudget: 20 }])) as DraftDecisions
}

/** Черновик из LocalStorage; повреждённые или устаревшие данные молча заменяются пустыми. */
export function loadDraft(): DraftDecisions {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDraft()
    const parsed = JSON.parse(raw) as Partial<DraftDecisions>
    const draft = emptyDraft()
    for (const c of CATEGORIES) {
      const d = parsed?.[c]
      if (!d) continue
      const id = typeof d.projectId === 'string' && PROJECTS_BY_ID[d.projectId]?.category === c ? d.projectId : null
      const b = Number(d.allocatedBudget)
      draft[c] = { projectId: id, allocatedBudget: Number.isFinite(b) ? Math.round(b) : 20 }
    }
    return draft
  } catch {
    return emptyDraft()
  }
}

export function saveDraft(draft: DraftDecisions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* приватный режим браузера — просто не сохраняем */
  }
}
