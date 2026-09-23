import { Play } from 'lucide-react'
import { TOTAL_BUDGET } from '../data/baseline'
import { fmtTenge } from '../lib/format'
import { Button } from './ui'
import { useI18n } from '../lib/i18n'

/** Бюджет и кнопка запуска — встраиваются в верхнюю панель на экране решений (п. 14.2). */
export function BudgetHeader({ allocated, canRun, onRun }: { allocated: number; canRun: boolean; onRun: () => void }) {
  const { t } = useI18n()
  const remaining = TOTAL_BUDGET - allocated
  const over = remaining < 0
  return (
    <>
      <dl className="flex items-center gap-1.5 text-sm tabular-nums" aria-live="polite" data-tour="budget">
        <Stat label={t('budget.total')} value={TOTAL_BUDGET} className="hidden sm:flex" />
        <Stat label={t('budget.allocated')} value={allocated} />
        {over ? (
          <Stat label={t('budget.over')} value={-remaining} tone="bg-crit/10 text-crit-ink" />
        ) : (
          <Stat label={t('budget.left')} value={remaining} tone={remaining === 0 ? 'bg-accent-track text-good-ink' : 'bg-warn/10 text-warn'} />
        )}
      </dl>
      <Button onClick={onRun} disabled={!canRun} ariaLabel={t('nav.run')} title={canRun ? undefined : t('budget.fixErrors')}>
        <Play aria-hidden className="size-4" /> <span className="hidden sm:inline">{t('nav.run')}</span>
        <span className="sm:hidden">{t('nav.runShort')}</span>
      </Button>
    </>
  )
}

function Stat({ label, value, tone = 'bg-surface-2 text-ink', className = 'flex' }: { label: string; value: number; tone?: string; className?: string }) {
  const { t, lang } = useI18n()
  return (
    <div className={`${className} flex-col rounded-xl px-2.5 py-1 leading-tight ${tone}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="text-base font-bold">
        {value} <span className="text-[11px] font-semibold opacity-70">{t('budget.units')} · {fmtTenge(Math.abs(value), lang)}</span>
      </dd>
    </div>
  )
}
