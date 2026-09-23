import { Pencil, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { AiExplanation } from '../components/AiExplanation'
import { ResultComparison } from '../components/ResultComparison'
import { ScoreGauge } from '../components/ScoreGauge'
import { ScoreRadarChart } from '../components/ScoreRadarChart'
import { StrategyProfile } from '../components/StrategyProfile'
import { Button, DemoBadge, Kicker, Panel } from '../components/ui'
import { CATEGORY_LABELS } from '../data/baseline'
import { outcomeFor } from '../lib/calculateSimulation'
import { fmt } from '../lib/format'
import type { Horizon, SimulationResult } from '../types/simulation'

export function ResultPage({
  result,
  onEdit,
  onRestart,
}: {
  result: SimulationResult
  onEdit: () => void
  onRestart: () => void
}) {
  const [horizon, setHorizon] = useState<Horizon>('1y')
  const outcome = outcomeFor(result, horizon)

  return (
    <main id="main" className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Результат симуляции</h1>
        <div role="radiogroup" aria-label="Горизонт планирования" className="ml-auto flex rounded-2xl border border-line bg-surface p-1 shadow-sm">
          {(['1y', '3y'] as const).map((h) => (
            <button
              key={h}
              role="radio"
              aria-checked={horizon === h}
              onClick={() => setHorizon(h)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                horizon === h ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {h === '1y' ? 'Через 1 год' : 'Через 3 года'}
            </button>
          ))}
        </div>
      </header>
      <DemoBadge compact />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Panel className="rise">
          <ScoreGauge value={outcome.overall} before={result.overallBefore} />
          {outcome.penaltyTotal > 0 && (
            <p className="mt-3 text-sm text-warn">Штрафы: −{fmt(outcome.penaltyTotal)} балла (учтены в AQLS)</p>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <StrategyProfile profile={result.strategyProfile} />
          </div>
        </Panel>
        <Panel className="rise">
          <Kicker>Профиль города</Kicker>
          <ScoreRadarChart before={result.before} after={outcome.scores} afterLabel={horizon === '1y' ? 'Через 1 год' : 'Через 3 года'} />
        </Panel>
      </div>

      <Panel className="rise">
        <Kicker>До и после · {horizon === '1y' ? '1 год' : '3 года'}</Kicker>
        <ResultComparison before={result.before} after={outcome.scores} />
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="rise">
          <Kicker>Выбранные проекты</Kicker>
          <ul className="space-y-2 text-sm">
            {result.contributions.map((c) => (
              <li key={c.projectId} className="flex items-baseline gap-2">
                <span className="w-32 shrink-0 text-xs text-muted">{CATEGORY_LABELS[c.category]}</span>
                <span className="flex-1">{c.title}</span>
                <span className="font-mono tabular-nums">{c.allocatedBudget} ед.</span>
                <span className="w-14 text-right font-mono text-xs tabular-nums text-ink-2" title="Эффективность вложений">
                  {Math.round(c.efficiency * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="rise">
          <Kicker>Синергии и штрафы</Kicker>
          {result.appliedSynergies.length === 0 && outcome.penalties.length === 0 && (
            <p className="text-sm text-muted">Синергий и штрафов нет.</p>
          )}
          <ul className="space-y-1.5 text-sm">
            {result.appliedSynergies.map((s) => (
              <li key={s} className="flex gap-2 text-good-ink">
                <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" /> {s}
              </li>
            ))}
            {outcome.penalties.map((p) => (
              <li key={p.description} className="text-warn">
                − {p.description}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <AiExplanation result={result} horizon={horizon} />

      <div className="flex flex-wrap justify-center gap-3 pb-6">
        <Button onClick={onEdit}>
          <Pencil aria-hidden className="size-4" /> Изменить решения
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw aria-hidden className="size-4" /> Начать заново
        </Button>
      </div>
    </main>
  )
}
