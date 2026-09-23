import { Play } from 'lucide-react'
import { TOTAL_BUDGET } from '../data/baseline'
import { fmtTenge } from '../lib/format'
import { Button } from './ui'

/** Бюджет и кнопка запуска — встраиваются в верхнюю панель на экране решений (п. 14.2). */
export function BudgetHeader({ allocated, canRun, onRun }: { allocated: number; canRun: boolean; onRun: () => void }) {
  const remaining = TOTAL_BUDGET - allocated
  const over = remaining < 0
  return (
    <>
      <dl className="flex items-center gap-1.5 text-sm tabular-nums" aria-live="polite">
        <Stat label="Бюджет" value={TOTAL_BUDGET} className="hidden sm:flex" />
        <Stat label="Распределено" value={allocated} />
        {over ? (
          <Stat label="Превышение" value={-remaining} tone="bg-crit/10 text-crit-ink" />
        ) : (
          <Stat label="Осталось" value={remaining} tone={remaining === 0 ? 'bg-accent-track text-good-ink' : 'bg-warn/10 text-warn'} />
        )}
      </dl>
      <Button onClick={onRun} disabled={!canRun} ariaLabel="Запустить симуляцию" title={canRun ? undefined : 'Исправьте ошибки распределения'}>
        <Play aria-hidden className="size-4" /> <span className="hidden sm:inline">Запустить симуляцию</span>
        <span className="sm:hidden">Запуск</span>
      </Button>
    </>
  )
}

function Stat({ label, value, tone = 'bg-surface-2 text-ink', className = 'flex' }: { label: string; value: number; tone?: string; className?: string }) {
  return (
    <div className={`${className} flex-col rounded-xl px-2.5 py-1 leading-tight ${tone}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="text-base font-bold">
        {value} <span className="text-[11px] font-semibold opacity-70">ед. · {fmtTenge(Math.abs(value))}</span>
      </dd>
    </div>
  )
}
