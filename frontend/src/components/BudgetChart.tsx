import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { CATEGORIES, TOTAL_BUDGET } from '../data/baseline'
import { CATEGORY_COLORS } from '../data/categoryVisuals'
import type { Category } from '../types/project'
import { useI18n } from '../lib/i18n'

export function BudgetChart({ budgets }: { budgets: Record<Category, number> }) {
  const { t, category } = useI18n()
  const total = CATEGORIES.reduce((s, c) => s + budgets[c], 0)
  const data = CATEGORIES.map((c) => ({ name: category(c), value: budgets[c], c }))
  if (total < TOTAL_BUDGET) data.push({ name: t('budget.unallocated'), value: TOTAL_BUDGET - total, c: 'rest' as Category })
  return (
    <div className="flex items-center gap-4">
      <div className="size-32 shrink-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="58%" outerRadius="100%" stroke="none" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={CATEGORY_COLORS[d.c] ?? 'var(--color-grid)'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1 text-sm">
        {CATEGORIES.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c] }} aria-hidden />
            <span className="text-ink-2">{category(c)}</span>
            <span className="ml-auto font-mono tabular-nums">{budgets[c]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
