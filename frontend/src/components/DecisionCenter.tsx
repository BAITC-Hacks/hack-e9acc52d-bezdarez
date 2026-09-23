import type { Availability, Game, Initiative, Selection, ValidationReport } from '../types'
import { CATEGORY_CHIP, CATEGORY_SHORT, districtName, num, realized } from '../lib/format'
import { CityMap } from './CityMap'
import { Button, Code, Meter, Panel, Spinner, StatusBadge } from './ui'

interface Props {
  game: Game
  selections: Selection[]
  onChange: (next: Selection[]) => void
  report: ValidationReport | null
  validating: boolean
  onSimulate: () => void
  simulating: boolean
  onDemo: () => void
  onReset: () => void
}

export function DecisionCenter(props: Props) {
  const { game, selections, onChange, report } = props
  const { rules, initiatives } = game

  const spent = selections.reduce((s, x) => s + (game.initiatives.find((m) => m.id === x.measure_id)?.cost ?? 0), 0)
  const categoryCounts = Object.fromEntries(
    rules.categories.map((c) => [c.id, selections.filter((s) => initiatives.find((m) => m.id === s.measure_id)?.category === c.id).length]),
  )

  const toggle = (m: Initiative) => {
    if (props.simulating) return
    const exists = selections.some((s) => s.measure_id === m.id)
    if (!exists && !report?.availability[m.id]?.available) return
    if (exists) onChange(selections.filter((s) => s.measure_id !== m.id))
    else onChange([...selections, { measure_id: m.id, district_id: null }])
  }
  const setDistrict = (measureId: string, districtId: string) =>
    onChange(selections.map((s) => (s.measure_id === measureId ? { ...s, district_id: districtId } : s)))

  return (
    <div className="space-y-6">
      <div>
        <div className="kicker">Ваш мандат · {rules.horizon_quarters} кварталов</div>
        <h1 className="mt-1 text-2xl font-semibold">Пять решений для города</h1>
        <p className="mt-2 text-sm text-ink-2">Выберите ровно {rules.required_decisions} мер. Можно усилить одно направление двумя решениями — охватывать все пять необязательно.</p>
      </div>
      <Hud {...props} spent={spent} categoryCounts={categoryCounts} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {rules.categories.map((c) => (
            <section key={c.id}>
              <header className="mb-3 flex items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-sm font-bold tracking-[0.16em] text-ink">{CATEGORY_SHORT[c.id]}</h2>
                  <span className="text-xs text-muted">{c.name} · {c.indicators.join(', ')}</span>
                </div>
                <CategoryCounter used={categoryCounts[c.id]} max={rules.max_per_category} />
              </header>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {initiatives.filter((m) => m.category === c.id).map((m) => (
                  <MeasureCard
                    key={m.id}
                    game={game}
                    measure={m}
                    selection={selections.find((s) => s.measure_id === m.id)}
                    availability={report?.availability[m.id]}
                    busy={props.simulating}
                    onToggle={() => toggle(m)}
                    onDistrict={(d) => setDistrict(m.id, d)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[136px] xl:self-start">
          <PlanPanel game={game} selections={selections} report={report} spent={spent} />
          <Panel kicker="Где работают меры" title="Карта размещения">
            <CityMap
              data={game.districts.map((d) => {
                const count = selections.filter((s) => s.district_id === d.id).length
                return { id: d.id, name: d.name, value: game.baseline.district_scores[d.id], badge: count ? String(count) : undefined }
              })}
              caption="Цифра в круге — районные меры в районе"
            />
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function Hud({ game, report, validating, onSimulate, simulating, onDemo, onReset, spent, categoryCounts, selections }: Props & {
  spent: number
  categoryCounts: Record<string, number>
}) {
  const { rules } = game
  const n = selections.length
  const remaining = rules.budget - spent
  const ready = report?.valid && !validating
  return (
    <div aria-busy={validating || simulating} className="sticky top-[64px] z-20 -mx-4 border-y border-line bg-page/95 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:justify-start sm:gap-x-8">
        <div>
          <div className="kicker">Decisions</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-2xl font-semibold tabular-nums">{n} <span className="text-muted">/ {rules.required_decisions}</span></span>
            <span className="hidden gap-1 sm:flex" aria-hidden>
              {Array.from({ length: rules.required_decisions }, (_, i) => (
                <span key={i} className={`h-2 w-5 rounded-full ${i < n ? 'bg-accent' : 'bg-white/10'}`} />
              ))}
            </span>
          </div>
        </div>
        <div className="min-w-[96px] sm:min-w-[150px]">
          <div className="kicker">Budget</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{spent} <span className="text-muted">/ {rules.budget}</span></div>
          <Meter value={spent} max={rules.budget} tone={spent > rules.budget ? 'crit' : 'neutral'} className="mt-1" />
        </div>
        <div>
          <div className="kicker">Remaining</div>
          <div className={`mt-1 text-2xl font-semibold tabular-nums ${remaining < 0 ? 'text-crit-ink' : ''}`}>{remaining}</div>
        </div>
        <div className="order-last w-full lg:order-none lg:w-auto">
          <div className="kicker">Направления</div>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            {rules.categories.map((c) => {
              const used = categoryCounts[c.id]
              return (
                <span
                  key={c.id}
                  title={`${c.name}: ${used} из ${rules.max_per_category}`}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wider ${
                    used >= rules.max_per_category ? 'border-accent/60 bg-accent/15 text-ink'
                      : used > 0 ? 'border-accent/30 text-ink-2' : 'border-line text-muted'
                  }`}
                >
                  {CATEGORY_CHIP[c.id]} {used}/{rules.max_per_category}
                </span>
              )
            })}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          {validating && <Spinner />}
          <Button variant="quiet" onClick={onReset} disabled={!n || simulating}>Сбросить</Button>
          <Button onClick={onDemo} disabled={simulating}>Демо-сценарий</Button>
          <Button variant="primary" onClick={onSimulate} disabled={!ready || simulating} className="px-5"
            title={ready ? 'Рассчитать сценарий' : 'Сначала примите 5 допустимых решений'}>
            {simulating ? <Spinner /> : null} {simulating ? 'Считаем…' : 'Simulate →'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CategoryCounter({ used, max }: { used: number; max: number }) {
  if (used >= max) return <StatusBadge tone="neutral">лимит {used}/{max}</StatusBadge>
  return <span className="text-xs tabular-nums text-muted">{used}/{max} выбрано</span>
}

function MeasureCard({ game, measure: m, selection, availability, busy, onToggle, onDistrict }: {
  game: Game
  measure: Initiative
  selection?: Selection
  availability?: Availability
  busy: boolean
  onToggle: () => void
  onDistrict: (id: string) => void
}) {
  const H = game.rules.horizon_quarters
  const share = Math.max(0, H - m.lag) / H
  const selected = !!selection
  const blocked = !selected && !!availability && !availability.available
  const awaitingValidation = !availability
  const needsDistrict = selected && m.type === 'district' && !selection?.district_id

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border p-4 transition-colors ${
        selected ? 'border-accent/70 bg-accent/[0.08] shadow-[0_0_0_1px_rgba(57,135,229,0.25)]'
          : blocked ? 'border-line bg-white/[0.015]'
            : 'border-line bg-surface/60 hover:border-white/25 hover:bg-surface'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={blocked || busy || (!selected && awaitingValidation)}
        aria-pressed={selected}
        aria-label={`${selected ? 'Убрать' : 'Выбрать'} ${m.id}: ${m.name}, ${m.cost} у.е.`}
        aria-describedby={blocked ? `blocked-${m.id}` : undefined}
        className="text-left disabled:cursor-not-allowed"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code>{m.id}</Code>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${m.type === 'city' ? 'bg-white/10 text-ink' : 'bg-white/[0.04] text-ink-2'}`}>
              {m.type === 'city' ? 'ГОРОД' : 'РАЙОН'}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className={`text-xl font-semibold leading-none tabular-nums ${blocked ? 'text-muted' : ''}`}>{m.cost}</div>
              <div className="text-[10px] text-muted">у.е.</div>
            </div>
            {!blocked && (
              <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${selected ? 'bg-accent text-white' : 'border border-line text-muted group-hover:border-white/30 group-hover:text-ink'}`} aria-hidden>
                {selected ? '✓' : '+'}
              </span>
            )}
          </div>
        </div>
        <h3 className={`mt-2 text-sm font-semibold leading-snug ${blocked ? 'text-muted' : 'text-ink'}`}>{m.name}</h3>
        <div className="mt-1 text-xs text-muted">
          Лаг {m.lag} кв. · реализуется {num(share * 100)}% эффекта
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(m.effects).map(([k, v]) => (
            <li key={k} title={game.rules.indicators.find((indicator) => indicator.id === k)?.name} className="rounded-md border border-line bg-white/[0.03] px-2 py-1 text-[11px] tabular-nums">
              <span className="font-mono font-semibold">{k}</span>{' '}
              <span className={v < 0 ? 'text-crit-ink' : 'text-ink-2'}>{v > 0 ? '+' : ''}{v}</span>
              <span className="text-muted"> → </span>
              <span className={`font-semibold ${v < 0 ? 'text-crit-ink' : 'text-ink'}`}>{v > 0 ? '+' : ''}{num(realized(v, m.lag, H))}</span>
            </li>
          ))}
        </ul>
      </button>
      <div className="mt-2 text-[10px] text-muted">Полный эффект → эффект с учётом лага{awaitingValidation ? ' · проверяем доступность' : selected ? ' · выбрано' : blocked ? '' : ' · доступно'}</div>

      {blocked && availability && (
        <div id={`blocked-${m.id}`} className="mt-3 rounded-lg border border-crit/40 bg-crit/10 px-3 py-2 text-xs text-crit-ink">
          <div className="font-semibold">⚠ Нельзя выбрать {m.id}</div>
          {availability.reasons.map((r) => <div key={r} className="mt-0.5 text-ink-2">{r}</div>)}
        </div>
      )}

      {selected && m.type === 'city' && (
        <div className="mt-3 rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-xs">
          <div className="font-semibold tracking-wider text-ink">ГОРОДСКАЯ МЕРА</div>
          <div className="text-ink-2">Применяется ко всем районам.</div>
        </div>
      )}

      {selected && m.type === 'district' && (
        <fieldset className="mt-3" disabled={busy || awaitingValidation}>
          <legend className={`mb-1.5 text-xs font-medium ${needsDistrict ? 'text-warn' : 'text-ink-2'}`}>
            {needsDistrict ? '! Выберите район:' : 'Район:'}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {game.districts.map((d) => {
              const reason = availability?.blocked_districts[d.id]
              const checked = selection?.district_id === d.id
              return (
                <label
                  key={d.id}
                  title={reason}
                  className={`district-choice flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    checked ? 'border-accent bg-accent/20 text-ink' : reason ? 'cursor-not-allowed border-line text-muted line-through' : 'border-line text-ink-2 hover:border-white/30'
                  }`}
                >
                  <input type="radio" className="sr-only" name={`d-${m.id}`} checked={checked} disabled={!!reason}
                    onChange={() => onDistrict(d.id)} />
                  <span aria-hidden>{checked ? '●' : '○'}</span>
                  {d.name}
                </label>
              )
            })}
          </div>
          {Object.values(availability?.blocked_districts ?? {}).map((r) => (
            <div key={r} className="mt-1.5 text-[11px] text-warn">! {r}</div>
          ))}
        </fieldset>
      )}

      {selected && (selection?.district_id || m.type === 'city') && (
        <ImpactPreview game={game} measure={m} districtId={selection?.district_id ?? null} />
      )}
    </article>
  )
}

function ImpactPreview({ game, measure: m, districtId }: { game: Game; measure: Initiative; districtId: string | null }) {
  const H = game.rules.horizon_quarters
  const district = game.districts.find((d) => d.id === districtId)
  return (
    <div className="mt-3 rounded-lg border border-line bg-page/60 px-3 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-ink">{district ? district.name : 'Все районы'}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">effect after lag</span>
      </div>
      <table className="mt-1 w-full text-[11px] tabular-nums">
        <tbody>
          {Object.entries(m.effects).map(([k, v]) => {
            const r = realized(v, m.lag, H)
            const before = district?.indicators[k]
            return (
              <tr key={k}>
                <td className="py-0.5 font-mono font-semibold">{k}</td>
                <td className="text-ink-2">
                  {before !== undefined ? <>{before} → <span className="text-ink">{num(Math.min(100, Math.max(0, before + r)))}</span></> : 'во всех'}
                </td>
                <td className={`text-right font-semibold ${r < 0 ? 'text-crit-ink' : 'text-good-ink'}`}>{r > 0 ? '+' : ''}{num(r)}</td>
                <td className="pl-2 text-right text-muted">{v} × ({H}−{m.lag})/{H}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted">Вклад одной меры. Совместный эффект и синергии учитываются при симуляции.</p>
    </div>
  )
}

function PlanPanel({ game, selections, report, spent }: {
  game: Game
  selections: Selection[]
  report: ValidationReport | null
  spent: number
}) {
  const { rules } = game
  const issues = (report?.issues ?? []).filter((i) => i.code !== 'too_few_measures')
  const left = rules.required_decisions - selections.length
  return (
    <Panel kicker="Ваш план" title={`${selections.length} из ${rules.required_decisions} решений · ${spent} у.е.`}>
      {selections.length === 0 ? (
        <p className="text-sm text-muted">Выберите меры слева. Ровно {rules.required_decisions} решений, не более {rules.max_per_category} на направление, бюджет {rules.budget}.</p>
      ) : (
        <ol className="space-y-2">
          {selections.map((s, i) => {
            const m = game.initiatives.find((x) => x.id === s.measure_id)!
            return (
              <li key={s.measure_id} className="flex items-center gap-3 rounded-lg border border-line bg-white/[0.02] px-3 py-2">
                <span className="w-4 text-xs text-muted tabular-nums">{i + 1}</span>
                <Code>{m.id}</Code>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-ink">{m.name}</div>
                  <div className={`text-[11px] ${m.type === 'district' && !s.district_id ? 'text-warn' : 'text-muted'}`}>
                    {m.type === 'city' ? 'весь город' : s.district_id ? districtName(game, s.district_id) : '! район не выбран'}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{m.cost}</span>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-4 space-y-2" aria-live="polite">
        {issues.map((i) => (
          <div key={i.code + i.message} className="rounded-lg border border-crit/40 bg-crit/10 px-3 py-2 text-xs text-crit-ink">⚠ {i.message}</div>
        ))}
        {left > 0 && selections.length > 0 && <StatusBadge tone="neutral">Осталось принять решений: {left}</StatusBadge>}
        {report?.valid && <StatusBadge tone="good">Сценарий допустим — можно запускать симуляцию</StatusBadge>}
      </div>
    </Panel>
  )
}
