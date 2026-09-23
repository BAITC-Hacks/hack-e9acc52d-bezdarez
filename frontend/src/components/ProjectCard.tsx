import { AlertTriangle, CheckCircle2, Circle, Clock, Wrench } from 'lucide-react'
import { METRICS } from '../data/baseline'
import { fmtDelta, fmtTenge } from '../lib/format'
import type { CityProject } from '../types/project'
import { useI18n } from '../lib/i18n'

const METRIC_SHORT = { mobility: 'М', ecology: 'Э', social: 'С', safety: 'Б', services: 'ГС' } as const

export function ProjectCard({
  project,
  selected,
  onSelect,
}: {
  project: CityProject
  selected: boolean
  onSelect: () => void
}) {
  const { t, project: tr } = useI18n()
  const text = tr(project)
  return (
    <article
      className={`flex flex-col rounded-3xl border bg-surface p-5 shadow-[0_12px_32px_-22px_rgba(48,42,54,0.35)] transition ${
        selected ? 'border-accent ring-4 ring-accent/15' : 'border-line hover:-translate-y-0.5 hover:border-accent/40'
      }`}
    >
      <header className="mb-2 flex items-start gap-2">
        <h3 className="flex-1 text-base font-semibold leading-snug">{text.title}</h3>
        <span className="pill shrink-0 bg-lavender px-2.5 py-1 text-[11px] text-ink-2">{t(`speed.${project.speed}`)}</span>
      </header>
      <p className="mb-3 text-sm text-ink-2">{text.short}</p>

      <dl className="mb-3 grid grid-cols-3 gap-2 text-center font-mono text-xs tabular-nums">
        <Budget label={t('card.min')} value={project.minBudget} />
        <Budget label={t('card.rec')} value={project.recommendedBudget} strong />
        <Budget label={t('card.max')} value={project.maxBudget} />
      </dl>

      <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Эффект за 1 год при рекомендуемом бюджете">
        {METRICS.filter((m) => project.effects[m] !== 0).map((m) => (
          <li
            key={m}
            className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
              project.effects[m] > 0 ? 'bg-accent-track text-good-ink' : 'bg-crit/10 text-crit-ink'
            }`}
          >
            {METRIC_SHORT[m]} {fmtDelta(project.effects[m])}
          </li>
        ))}
      </ul>

      <ul className="mb-2 space-y-1 text-xs text-ink-2">
        {text.benefits.map((b) => (
          <li key={b} className="flex gap-1.5">
            <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-good-ink" /> {b}
          </li>
        ))}
        {text.risks.map((r) => (
          <li key={r} className="flex gap-1.5">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warn" /> <span>{t('card.risk')}: {r}</span>
          </li>
        ))}
      </ul>

      <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Clock aria-hidden className="size-3.5" /> ×{project.longTermMultiplier} {t('card.in3y')}
        </span>
        <span className="flex items-center gap-1">
          <Wrench aria-hidden className="size-3.5" /> {t('card.maintenance')} {project.maintenanceCost}/4
        </span>
      </p>

      <button
        onClick={onSelect}
        aria-pressed={selected}
        className={`mt-auto flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          selected ? 'bg-accent text-white' : 'bg-surface-2 text-ink hover:bg-accent-track hover:text-good-ink'
        }`}
      >
        {selected ? <CheckCircle2 aria-hidden className="size-4" /> : <Circle aria-hidden className="size-4" />}
        {selected ? t('card.selected') : t('card.select')}
      </button>
    </article>
  )
}

function Budget({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="rounded-xl bg-surface-2 px-1 py-1.5">
      <dt className="font-sans text-[10px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className={strong ? 'text-sm font-bold text-ink' : 'text-ink-2'}>{fmtTenge(value)}</dd>
      <dd className="text-[10px] text-muted">{value} {t('budget.units')}</dd>
    </div>
  )
}
