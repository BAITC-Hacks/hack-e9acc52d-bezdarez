import { Check } from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS } from '../data/baseline'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../data/categoryVisuals'
import { PROJECTS_BY_ID } from '../data/projects'
import type { Category } from '../types/project'
import type { DraftDecisions } from '../types/simulation'

export function CategoryNavigation({
  active,
  draft,
  onSelect,
}: {
  active: Category
  draft: DraftDecisions
  onSelect: (c: Category) => void
}) {
  return (
    <nav aria-label="Направления" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
      {CATEGORIES.map((c, i) => {
        const Icon = CATEGORY_ICONS[c]
        const chosen = draft[c].projectId ? PROJECTS_BY_ID[draft[c].projectId!] : null
        const isActive = c === active
        return (
          <button
            key={c}
            onClick={() => onSelect(c)}
            aria-current={isActive ? 'step' : undefined}
            className={`flex min-w-48 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition lg:min-w-0 ${
              isActive ? 'border-accent bg-accent-track shadow-sm' : 'border-line bg-surface hover:border-accent/40'
            }`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `${CATEGORY_COLORS[c]}1f` }}>
              <Icon aria-hidden className="size-5" style={{ color: CATEGORY_COLORS[c] }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {i + 1}. {CATEGORY_LABELS[c]}
              </span>
              <span className={`block truncate text-xs ${chosen ? 'text-good-ink' : 'text-muted'}`}>
                {chosen ? chosen.title : 'Проект не выбран'}
              </span>
            </span>
            <span className="text-sm font-bold tabular-nums text-ink-2">{draft[c].allocatedBudget}</span>
            {chosen && <Check aria-label="выбрано" className="size-4 text-good-ink" />}
          </button>
        )
      })}
    </nav>
  )
}
