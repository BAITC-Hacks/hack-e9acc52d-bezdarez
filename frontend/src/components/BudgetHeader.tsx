import { Building2, Play } from 'lucide-react'
import { TOTAL_BUDGET } from '../data/baseline'
import { Button } from './ui'

export function BudgetHeader({
  allocated,
  canRun,
  onRun,
  onHome,
}: {
  allocated: number
  canRun: boolean
  onRun: () => void
  onHome: () => void
}) {
  const remaining = TOTAL_BUDGET - allocated
  const over = remaining < 0
  return (
    <header className="panel sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-b-2xl px-4 py-3 sm:px-6">
      <button onClick={onHome} className="flex items-center gap-2 text-left" aria-label="На стартовый экран">
        <Building2 aria-hidden className="size-6 text-accent" />
        <span>
          <span className="block text-sm font-bold leading-tight">Аким на 5 часов</span>
          <span className="block text-xs text-muted">QalaBalance</span>
        </span>
      </button>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm tabular-nums" aria-live="polite">
        <Stat label="Общий бюджет" value={TOTAL_BUDGET} />
        <Stat label="Распределено" value={allocated} />
        {over ? (
          <Stat label="Превышение" value={-remaining} tone="text-crit-ink" />
        ) : (
          <Stat label="Осталось" value={remaining} tone={remaining === 0 ? 'text-good-ink' : 'text-warn'} />
        )}
      </dl>
      <div className="ml-auto">
        <Button onClick={onRun} disabled={!canRun} title={canRun ? undefined : 'Исправьте ошибки распределения'}>
          <Play aria-hidden className="size-4" /> Запустить симуляцию
        </Button>
      </div>
    </header>
  )
}

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-sans text-xs text-muted">{label}:</dt>
      <dd className={`text-lg font-bold ${tone}`}>{value}</dd>
    </div>
  )
}
