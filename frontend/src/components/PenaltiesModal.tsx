import { ExternalLink, Gavel, Scale, Wrench } from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS } from '../data/baseline'
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
import { num, toDecisions } from '../lib/calculateSimulation'
import { useI18n } from '../lib/i18n'
import type { DraftDecisions } from '../types/simulation'
import { Modal } from './Modal'

const tenge = (v: number) => `${v.toLocaleString('ru-RU')} ₸`
/** Коэффициент без округления: 0.25 → «0,25». */
const coef = (v: number) => String(v).replace('.', ',')

/** Окно «Штрафы»: правила модели, штрафы текущего решения и реальные штрафы КоАП РК для контекста. */
export function PenaltiesModal({ open, onClose, draft }: { open: boolean; onClose: () => void; draft: DraftDecisions }) {
  const { t } = useI18n()
  const decisions = toDecisions(draft)
  const balance = calculateBalancePenalties(decisions)
  const totalMaintenance = decisions.reduce((s, d) => s + PROJECTS_BY_ID[d.projectId].maintenanceCost, 0)
  const maintenance = calculateMaintenancePenalty(totalMaintenance, '3y')

  return (
    <Modal open={open} onClose={onClose} title={t('penalty.title')} wide>
      <div className="space-y-7">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <Scale aria-hidden className="size-5 text-accent" /> Штрафы модели — снижают AQLS
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Rule title="Недофинансирование" formula={`(${LOW_BUDGET_THRESHOLD} − бюджет) × ${coef(LOW_PENALTY_PER_UNIT)}`} text={`Сфера получила меньше ${LOW_BUDGET_THRESHOLD} ед. — проекты «голодают».`} />
            <Rule title="Перекос" formula={`(бюджет − ${HIGH_BUDGET_THRESHOLD}) × ${coef(HIGH_PENALTY_PER_UNIT)}`} text={`Больше ${HIGH_BUDGET_THRESHOLD} ед. в одну сферу — остальные страдают.`} />
            <Rule title="Обслуживание (3 года)" formula={`(Σ обслуживания − ${MAINTENANCE_THRESHOLD}) × ${coef(MAINTENANCE_PENALTY_PER_UNIT)}`} text="Дорогие в содержании проекты давят на бюджет в долгосрочной перспективе." />
          </div>

          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <p className="mb-2 text-sm font-bold">Ваше текущее решение</p>
            <ul className="space-y-1.5 text-sm">
              {CATEGORIES.map((c) => {
                const b = draft[c].allocatedBudget
                const p = balance.find((x) => x.category === c)
                return (
                  <li key={c} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 text-ink-2">{CATEGORY_LABELS[c]}</span>
                    <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden>
                      <span className="absolute inset-y-0 bg-accent/15" style={{ left: `${(LOW_BUDGET_THRESHOLD / 40) * 100}%`, width: `${((HIGH_BUDGET_THRESHOLD - LOW_BUDGET_THRESHOLD) / 40) * 100}%` }} />
                      <span className={`absolute inset-y-0 left-0 rounded-full ${p ? 'bg-crit' : 'bg-accent'}`} style={{ width: `${(b / 40) * 100}%` }} />
                    </span>
                    <span className="w-14 text-right font-bold tabular-nums">{b} ед.</span>
                    <span className={`w-16 text-right text-xs font-bold ${p ? 'text-crit-ink' : 'text-good-ink'}`}>{p ? `−${num(p.points)}` : 'OK'}</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-2">
              <Wrench aria-hidden className="size-4" /> Обслуживание выбранных проектов: {totalMaintenance} (порог {MAINTENANCE_THRESHOLD}) —{' '}
              {maintenance ? <b className="text-crit-ink">штраф −{num(maintenance.points)} через 3 года</b> : <b className="text-good-ink">без штрафа</b>}
            </p>
            <p className="mt-1 text-xs text-muted">Зелёная зона полосы — 10–30 ед., без штрафа.</p>
          </div>
        </section>

        <section>
          <h3 className="mb-1 flex items-center gap-2 text-base font-extrabold">
            <Gavel aria-hidden className="size-5 text-accent" /> Реальные штрафы в городе — КоАП РК
          </h3>
          <p className="mb-3 text-xs text-muted">
            Для контекста: какие нарушения в сферах города наказываются по закону. В расчёт AQLS не входят. 1 МРП в 2026 году ={' '}
            {tenge(MRP_2026)}.
          </p>
          <div className="space-y-2.5">
            {REAL_FINES.map((f) => {
              const Icon = CATEGORY_ICONS[f.category]
              return (
                <article key={f.article} className="flex gap-3 rounded-2xl border border-line p-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `${CATEGORY_COLORS[f.category]}1f` }}>
                    <Icon aria-hidden className="size-5" style={{ color: CATEGORY_COLORS[f.category] }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug">{f.title}</p>
                    <p className="mt-0.5 text-xs text-ink-2">{f.violation}</p>
                    <p className="mt-1.5 text-[11px] text-muted">
                      {f.article} · снижает риск: «{f.relatedProject}»
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-extrabold tabular-nums">{tenge(mrpToTenge(f.individualMrp))}</p>
                    <p className="text-[11px] text-muted">{f.individualMrp} МРП · физлица</p>
                    {f.largeBusinessMrp && <p className="text-[11px] text-muted">до {tenge(mrpToTenge(f.largeBusinessMrp))} · крупный бизнес</p>}
                  </div>
                </article>
              )
            })}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a href={KOAP_SOURCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-good-ink hover:underline">
              Кодекс РК об административных правонарушениях <ExternalLink aria-hidden className="size-3" />
            </a>
            <a href={MRP_SOURCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-good-ink hover:underline">
              Закон о бюджете 2026–2028 (МРП) <ExternalLink aria-hidden className="size-3" />
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
