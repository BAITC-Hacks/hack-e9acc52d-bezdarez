import { ExternalLink, Gavel, Scale, Wrench } from 'lucide-react'
import { CATEGORIES } from '../data/baseline'
import { localizeRealFine, PENALTY_COPY } from '../data/locales/penalties'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../data/categoryVisuals'
import { KOAP_SOURCE, MRP_2026, MRP_SOURCE, REAL_FINES, mrpToTenge } from '../data/realFines'
import { PROJECTS_BY_ID } from '../data/projects'
import {
  HIGH_BUDGET_THRESHOLD,
  HIGH_PENALTY_PER_UNIT,
  LOW_BUDGET_THRESHOLD,
  LOW_PENALTY_PER_UNIT,
  MAINTENANCE_PENALTY_PER_UNIT,
  MAINTENANCE_THRESHOLD,
  calculateBalancePenalties,
  calculateMaintenancePenalty,
} from '../lib/calculatePenalties'
import { toDecisions } from '../lib/calculateSimulation'
import { fmt, localeFor } from '../lib/format'
import { useI18n } from '../lib/i18n'
import type { DraftDecisions } from '../types/simulation'
import { Modal } from './Modal'

/** Окно «Штрафы»: правила модели, штрафы текущего решения и реальные штрафы КоАП РК для контекста. */
export function PenaltiesModal({ open, onClose, draft }: { open: boolean; onClose: () => void; draft: DraftDecisions }) {
  const { t, lang, category } = useI18n()
  const copy = PENALTY_COPY[lang]
  const tenge = (v: number) => `${v.toLocaleString(localeFor(lang))} ₸`
  const coef = (v: number) => v.toLocaleString(localeFor(lang), { maximumFractionDigits: 2 })
  const decisions = toDecisions(draft)
  const balance = calculateBalancePenalties(decisions)
  const totalMaintenance = decisions.reduce((s, d) => s + PROJECTS_BY_ID[d.projectId].maintenanceCost, 0)
  const maintenance = calculateMaintenancePenalty(totalMaintenance, '3y')

  return (
    <Modal open={open} onClose={onClose} title={t('penalty.title')} wide>
      <div className="space-y-7">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <Scale aria-hidden className="size-5 text-accent" /> {copy.model}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Rule title={copy.under} formula={`(${LOW_BUDGET_THRESHOLD} − ${copy.budget}) × ${coef(LOW_PENALTY_PER_UNIT)}`} text={copy.underText(LOW_BUDGET_THRESHOLD)} />
            <Rule title={copy.over} formula={`(${copy.budget} − ${HIGH_BUDGET_THRESHOLD}) × ${coef(HIGH_PENALTY_PER_UNIT)}`} text={copy.overText(HIGH_BUDGET_THRESHOLD)} />
            <Rule title={copy.upkeep} formula={`(${copy.sumUpkeep} − ${MAINTENANCE_THRESHOLD}) × ${coef(MAINTENANCE_PENALTY_PER_UNIT)}`} text={copy.upkeepText} />
          </div>

          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <p className="mb-2 text-sm font-bold">{copy.current}</p>
            <ul className="space-y-1.5 text-sm">
              {CATEGORIES.map((c) => {
                const b = draft[c].allocatedBudget
                const p = balance.find((x) => x.category === c)
                return (
                  <li key={c} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-ink-2 sm:w-36">{category(c)}</span>
                    <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden>
                      <span className="absolute inset-y-0 bg-accent/15" style={{ left: `${(LOW_BUDGET_THRESHOLD / 40) * 100}%`, width: `${((HIGH_BUDGET_THRESHOLD - LOW_BUDGET_THRESHOLD) / 40) * 100}%` }} />
                      <span className={`absolute inset-y-0 left-0 rounded-full ${p ? 'bg-crit' : 'bg-accent'}`} style={{ width: `${(b / 40) * 100}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-right font-bold tabular-nums">{b} {t('budget.units')}</span>
                    <span className={`w-12 shrink-0 text-right text-xs font-bold ${p ? 'text-crit-ink' : 'text-good-ink'}`}>{p ? `−${fmt(p.points, lang)}` : 'OK'}</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-2">
              <Wrench aria-hidden className="size-4 shrink-0" /> {copy.maintenance(totalMaintenance, MAINTENANCE_THRESHOLD)} —{' '}
              {maintenance ? <b className="text-crit-ink">{copy.penalty(fmt(maintenance.points, lang))}</b> : <b className="text-good-ink">{copy.noPenalty}</b>}
            </p>
            <p className="mt-1 text-xs text-muted">{copy.green}</p>
          </div>
        </section>

        <section>
          <h3 className="mb-1 flex items-center gap-2 text-base font-extrabold">
            <Gavel aria-hidden className="size-5 shrink-0 text-accent" /> {copy.real}
          </h3>
          <p className="mb-3 text-xs text-muted">
            {copy.context}{' '}
            {tenge(MRP_2026)}.
          </p>
          <div className="space-y-2.5">
            {REAL_FINES.map((fine) => {
              const f = localizeRealFine(fine, lang)
              const Icon = CATEGORY_ICONS[f.category]
              return (
                <article key={fine.article} className="flex flex-wrap gap-3 rounded-2xl border border-line p-3.5 sm:flex-nowrap">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `${CATEGORY_COLORS[f.category]}1f` }}>
                    <Icon aria-hidden className="size-5" style={{ color: CATEGORY_COLORS[f.category] }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug">{f.title}</p>
                    <p className="mt-0.5 text-xs text-ink-2">{f.violation}</p>
                    <p className="mt-1.5 text-[11px] text-muted">
                      {f.article} · {copy.reduces}: «{f.relatedProject}»
                    </p>
                  </div>
                  <div className="ml-auto w-full shrink-0 text-right sm:w-auto">
                    <p className="text-base font-extrabold tabular-nums">{tenge(mrpToTenge(f.individualMrp))}</p>
                    <p className="text-[11px] text-muted">{f.individualMrp} {copy.individuals}</p>
                    {f.largeBusinessMrp && <p className="text-[11px] text-muted">{copy.business(tenge(mrpToTenge(f.largeBusinessMrp)))}</p>}
                  </div>
                </article>
              )
            })}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a href={KOAP_SOURCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-good-ink hover:underline">
              {copy.code} <ExternalLink aria-hidden className="size-3" />
            </a>
            <a href={MRP_SOURCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-good-ink hover:underline">
              {copy.law} <ExternalLink aria-hidden className="size-3" />
            </a>
          </p>
        </section>
      </div>
    </Modal>
  )
}

function Rule({ title, formula, text }: { title: string; formula: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line p-3.5">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 rounded-lg bg-surface-2 px-2 py-1 font-mono text-xs">{formula}</p>
      <p className="mt-1.5 text-xs text-ink-2">{text}</p>
    </div>
  )
}
