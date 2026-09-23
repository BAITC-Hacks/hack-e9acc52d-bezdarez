import { Pencil, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { AiExplanation } from '../components/AiExplanation'
import { CityMap } from '../components/CityMap'
import { ResultComparison } from '../components/ResultComparison'
import { ScoreGauge } from '../components/ScoreGauge'
import { ScoreRadarChart } from '../components/ScoreRadarChart'
import { StrategyProfile } from '../components/StrategyProfile'
import { Button, DemoBadge, Kicker, Panel } from '../components/ui'
import { outcomeFor } from '../lib/calculateSimulation'
import { fmt, fmtTenge } from '../lib/format'
import type { Horizon, SimulationResult } from '../types/simulation'
import { useI18n } from '../lib/i18n'

export function ResultPage({
  result,
  onEdit,
  onRestart,
  onPenalties,
}: {
  result: SimulationResult
  onEdit: () => void
  onRestart: () => void
  onPenalties: () => void
}) {
  const { t, category } = useI18n()
  const [horizon, setHorizon] = useState<Horizon>('1y')
  const outcome = outcomeFor(result, horizon)

  return (
    <main id="main" className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('result.title')}</h1>
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
              {h === '1y' ? t('result.in1y') : t('result.in3y')}
            </button>
          ))}
        </div>
      </header>
      <DemoBadge compact />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Panel className="rise">
          <ScoreGauge value={outcome.overall} before={result.overallBefore} />
          {outcome.penaltyTotal > 0 && (
            <p className="mt-3 text-sm text-warn">{t('result.penaltiesTotal', { points: fmt(outcome.penaltyTotal) })}</p>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <StrategyProfile profile={result.strategyProfile} />
          </div>
        </Panel>
        <Panel className="rise">
          <Kicker>{t('result.cityProfile')}</Kicker>
          <ScoreRadarChart before={result.before} after={outcome.scores} afterLabel={horizon === '1y' ? t('result.in1y') : t('result.in3y')} />
        </Panel>
      </div>

      <Panel className="rise">
        <Kicker>{t('result.beforeAfter')} · {horizon === '1y' ? t('result.1y') : t('result.3y')}</Kicker>
        <ResultComparison before={result.before} after={outcome.scores} />
      </Panel>

      <CityMap cityAfter={outcome.scores} title={`${t('result.districtEffect')} · ${horizon === '1y' ? t('result.1y') : t('result.3y')}`} />

      <div className="grid gap-5 md:grid-cols-2">
        <Panel className="rise">
          <Kicker>{t('result.selectedProjects')}</Kicker>
          <ul className="space-y-2 text-sm">
            {result.contributions.map((c) => (
              <li key={c.projectId} className="flex items-baseline gap-2">
                <span className="w-32 shrink-0 text-xs text-muted">{category(c.category)}</span>
                <span className="flex-1">{c.title}</span>
                <span className="text-right tabular-nums">
                  <span className="block font-semibold">{fmtTenge(c.allocatedBudget)}</span>
                  <span className="block text-xs text-muted">{c.allocatedBudget} {t('budget.units')}</span>
                </span>
                <span className="w-14 text-right font-mono text-xs tabular-nums text-ink-2" title="Эффективность вложений">
                  {Math.round(c.efficiency * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="rise">
          <Kicker>{t('result.synergiesPenalties')}</Kicker>
          {result.appliedSynergies.length === 0 && outcome.penalties.length === 0 && (
            <p className="text-sm text-muted">{t('result.noSynergies')}</p>
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
          <button onClick={onPenalties} className="mt-3 text-sm font-bold text-good-ink hover:underline">
            ⚖ {t('result.penaltyDetails')} →
          </button>
        </Panel>
      </div>

      <AiExplanation result={result} horizon={horizon} />

      <div className="flex flex-wrap justify-center gap-3 pb-6">
        <Button onClick={onEdit}>
          <Pencil aria-hidden className="size-4" /> {t('nav.edit')}
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw aria-hidden className="size-4" /> {t('nav.restart')}
        </Button>
      </div>
    </main>
  )
}
