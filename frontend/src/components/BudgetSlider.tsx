import { CATEGORY_LABELS, CATEGORY_MAX_BUDGET, CATEGORY_MIN_BUDGET } from '../data/baseline'
import { CATEGORY_COLORS } from '../data/categoryVisuals'
import { HIGH_BUDGET_THRESHOLD, LOW_BUDGET_THRESHOLD } from '../lib/calculatePenalties'
import type { Category } from '../types/project'

export function BudgetSlider({
  category,
  value,
  recommended,
  onChange,
}: {
  category: Category
  value: number
  recommended?: number
  onChange: (v: number) => void
}) {
  const id = `budget-${category}`
  const set = (raw: number) => {
    if (!Number.isFinite(raw)) return
    onChange(Math.max(CATEGORY_MIN_BUDGET, Math.min(CATEGORY_MAX_BUDGET, Math.round(raw))))
  }
  const warn =
    value < LOW_BUDGET_THRESHOLD
      ? `меньше ${LOW_BUDGET_THRESHOLD} — штраф за несбалансированность`
      : value > HIGH_BUDGET_THRESHOLD
        ? `больше ${HIGH_BUDGET_THRESHOLD} — штраф за несбалансированность`
        : null
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLORS[category] }} aria-hidden />
        <label htmlFor={id} className="flex-1 text-sm font-medium">
          {CATEGORY_LABELS[category]}
        </label>
        <input
          type="number"
          min={CATEGORY_MIN_BUDGET}
          max={CATEGORY_MAX_BUDGET}
          value={value}
          onChange={(e) => set(e.target.valueAsNumber)}
          aria-label={`Бюджет: ${CATEGORY_LABELS[category]}`}
          className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-right font-mono text-sm tabular-nums"
        />
      </div>
      <input
        id={id}
        type="range"
        min={CATEGORY_MIN_BUDGET}
        max={CATEGORY_MAX_BUDGET}
        step={1}
        value={value}
        onChange={(e) => set(e.target.valueAsNumber)}
        className="w-full accent-[var(--color-accent)]"
      />
      <p className="flex justify-between text-xs text-muted">
        <span>{CATEGORY_MIN_BUDGET}</span>
        {recommended !== undefined && <span>рекомендуется {recommended}</span>}
        <span>{CATEGORY_MAX_BUDGET}</span>
      </p>
      {warn && <p className="text-xs text-warn">⚠ {warn}</p>}
    </div>
  )
}
