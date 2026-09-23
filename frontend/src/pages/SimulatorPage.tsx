import { AlertCircle, ArrowLeft, ArrowRight, Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BudgetChart } from '../components/BudgetChart'
import { BudgetSlider } from '../components/BudgetSlider'
import { CategoryNavigation } from '../components/CategoryNavigation'
import { ProjectCard } from '../components/ProjectCard'
import { ScoreRadarChart } from '../components/ScoreRadarChart'
import { Button, DemoBadge, Kicker, Panel } from '../components/ui'
import { BASELINE, CATEGORIES, CATEGORY_LABELS, TOTAL_BUDGET } from '../data/baseline'
import { PROJECTS, PROJECTS_BY_ID } from '../data/projects'
import { calculateAqls, calculateSimulation, toDecisions } from '../lib/calculateSimulation'
import { deltaTone, fmt, fmtDelta } from '../lib/format'
import type { Category } from '../types/project'
import type { DraftDecisions, ValidationIssue } from '../types/simulation'

export function SimulatorPage({
  draft,
  onChange,
  issues,
}: {
  draft: DraftDecisions
  onChange: (d: DraftDecisions) => void
  issues: ValidationIssue[]
}) {
  const [active, setActive] = useState<Category>(
    () => CATEGORIES.find((c) => !draft[c].projectId) ?? 'transport',
  )
  // Предварительный прогноз по уже выбранным проектам — считается локально при каждом движении ползунка.
  const preview = useMemo(() => {
    const decisions = toDecisions(draft)
    return decisions.length ? calculateSimulation(decisions) : null
  }, [draft])

  const setCategory = (c: Category, patch: Partial<DraftDecisions[Category]>) =>
    onChange({ ...draft, [c]: { ...draft[c], ...patch } })

  const idx = CATEGORIES.indexOf(active)
  const budgets = Object.fromEntries(CATEGORIES.map((c) => [c, draft[c].allocatedBudget])) as Record<Category, number>

  const balanceToRecommended = () => {
    // Выставляет рекомендуемые бюджеты выбранных проектов и доводит сумму до 100 пропорционально.
    const rec = CATEGORIES.map((c) => (draft[c].projectId ? PROJECTS_BY_ID[draft[c].projectId!].recommendedBudget : 20))
    const sum = rec.reduce((a, b) => a + b, 0)
    const scaled = rec.map((r) => Math.max(5, Math.min(40, Math.round((r * TOTAL_BUDGET) / sum))))
    let diff = TOTAL_BUDGET - scaled.reduce((a, b) => a + b, 0)
    for (let i = 0; diff !== 0 && i < 50; i++) {
      const j = i % scaled.length
      const step = diff > 0 ? 1 : -1
      if (scaled[j] + step >= 5 && scaled[j] + step <= 40) {
        scaled[j] += step
        diff -= step
      }
    }
    const next = { ...draft }
    CATEGORIES.forEach((c, i) => (next[c] = { ...draft[c], allocatedBudget: scaled[i] }))
    onChange(next)
  }

  return (
    <>
      <main id="main" className="mx-auto grid max-w-[1500px] gap-5 px-3 py-5 sm:px-6 lg:grid-cols-[260px_1fr_360px]">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <CategoryNavigation active={active} draft={draft} onSelect={setActive} />
          <div className="hidden lg:block">
            <DemoBadge compact />
          </div>
        </aside>

        <section aria-labelledby="cat-title" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="kicker">
                Направление {idx + 1} из {CATEGORIES.length}
              </p>
              <h1 id="cat-title" className="text-2xl font-bold">
                {CATEGORY_LABELS[active]}
              </h1>
            </div>
            <div className="w-full sm:w-72">
              <BudgetSlider
                category={active}
                value={draft[active].allocatedBudget}
                recommended={draft[active].projectId ? PROJECTS_BY_ID[draft[active].projectId!].recommendedBudget : undefined}
                onChange={(v) => setCategory(active, { allocatedBudget: v })}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {PROJECTS.filter((p) => p.category === active).map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                selected={draft[active].projectId === p.id}
                onSelect={() => {
                  setCategory(active, { projectId: p.id })
                  const next = CATEGORIES.slice(idx + 1).find((c) => !draft[c].projectId)
                  if (next) setTimeout(() => setActive(next), 250)
                }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" disabled={idx === 0} onClick={() => setActive(CATEGORIES[idx - 1])}>
              <ArrowLeft aria-hidden className="size-4" /> Назад
            </Button>
            <Button variant="ghost" disabled={idx === CATEGORIES.length - 1} onClick={() => setActive(CATEGORIES[idx + 1])}>
              Далее <ArrowRight aria-hidden className="size-4" />
            </Button>
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <Panel>
            <Kicker>Предварительный прогноз · 1 год</Kicker>
            {preview ? (
              <p className="font-mono text-3xl font-bold tabular-nums">
                {fmt(calculateAqls(BASELINE))} → {fmt(preview.overallAfterOneYear)}{' '}
                <span className={`text-lg ${deltaTone(preview.overallAfterOneYear - preview.overallBefore)}`}>
                  {fmtDelta(preview.overallAfterOneYear - preview.overallBefore)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted">Выберите хотя бы один проект, чтобы увидеть прогноз.</p>
            )}
            <ScoreRadarChart before={BASELINE} after={preview?.afterOneYear} afterLabel="Прогноз" />
            {preview && preview.appliedSynergies.length > 0 && (
              <ul className="mt-1 space-y-1 text-xs text-good-ink">
                {preview.appliedSynergies.map((s) => (
                  <li key={s}>✦ {s}</li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <Kicker>Распределение бюджета</Kicker>
              <button onClick={balanceToRecommended} className="-mt-2 flex items-center gap-1 text-xs text-accent-hover hover:underline">
                <Scale aria-hidden className="size-3.5" /> По рекомендациям
              </button>
            </div>
            <BudgetChart budgets={budgets} />
            <div className="mt-4 space-y-3">
              {CATEGORIES.map((c) => (
                <BudgetSlider key={c} category={c} value={draft[c].allocatedBudget} onChange={(v) => setCategory(c, { allocatedBudget: v })} />
              ))}
            </div>
          </Panel>
          {issues.length > 0 && (
            <Panel>
              <Kicker>Что нужно исправить</Kicker>
              <ul className="space-y-1.5 text-sm" aria-live="polite">
                {issues.map((i) => (
                  <li key={i.message} className="flex gap-2 text-warn">
                    <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {i.category && i.code === 'missing_project' ? (
                      <button className="text-left underline-offset-2 hover:underline" onClick={() => setActive(i.category!)}>
                        {i.message}
                      </button>
                    ) : (
                      <span>{i.message}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <div className="lg:hidden">
            <DemoBadge compact />
          </div>
        </aside>
      </main>
    </>
  )
}
