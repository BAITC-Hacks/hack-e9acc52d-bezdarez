import { useState } from 'react'
import type { Game, Selection, SimulationResult } from '../types'
import { districtName, fmt, num, signed } from '../lib/format'
import { AIAnalyst } from './AIAnalyst'
import { CityMap } from './CityMap'
import { Heatmap } from './Overview'
import { Button, Code, Panel, StatusBadge } from './ui'
import { WhatIf } from './WhatIf'

export function Results({ game, result, selections, onEdit, onRestart }: {
  game: Game
  result: SimulationResult
  selections: Selection[]
  onEdit: () => void
  onRestart: () => void
}) {
  const scenario = result.scenario!
  const lowest = result.districts.find((d) => d.id === scenario.d_min_district)!

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="kicker">Результат симуляции · горизонт {game.rules.horizon_quarters} кварталов</div>
          <h1 className="mt-1 text-2xl font-semibold">Итоги вашего сценария</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit}>← Изменить решения</Button>
          <Button variant="quiet" onClick={onRestart}>Новая игра</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <ScoreHero game={game} result={result} />
        <div className="grid gap-6">
          <Panel kicker="Lowest district" className="rise">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold">{lowest.name}</div>
                <div className="mt-1 text-sm text-ink-2">
                  было {fmt(lowest.score_before)} · вес min(D<sub>d</sub>) в Score — {game.rules.score.min_weight}
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-semibold">{fmt(lowest.score_after)}</div>
                <div className="text-sm text-good-ink">{signed(lowest.score_delta)}</div>
              </div>
            </div>
          </Panel>
          <CriticalPanel game={game} result={result} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <DistrictComparison result={result} />
        <Panel kicker="Карта после сценария" title="Оценка районов и прирост" className="rise">
          <CityMap data={result.districts.map((d) => ({ id: d.id, name: d.name, value: d.score_after, delta: d.score_delta }))} />
        </Panel>
      </div>

      <AIAnalyst selections={selections} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <IndicatorImpact game={game} result={result} />
        <AppliedEffects game={game} result={result} />
      </div>

      <Panel kicker="Heatmap после сценария" title="Показатели районов" className="rise">
        <Heatmap game={game} values={Object.fromEntries(result.districts.map((d) => [d.id, d.after]))} compact />
      </Panel>

      <WhatIf game={game} selections={selections} result={result} />
    </div>
  )
}

function ScoreHero({ game, result }: { game: Game; result: SimulationResult }) {
  const s = result.scenario!
  const b = result.baseline
  const w = game.rules.score
  const up = (result.score_delta ?? 0) >= 0
  return (
    <section className="panel rise relative min-w-0 overflow-hidden rounded-3xl p-5 sm:p-8">
      <div className="kicker text-accent">Astana quality of life score</div>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="text-7xl font-bold leading-none tracking-tight sm:text-8xl">{fmt(s.score)}</div>
        <div className="pb-2">
          <div className={`text-3xl font-semibold ${up ? 'text-good-ink' : 'text-crit-ink'}`}>
            {up ? '▲' : '▼'} {signed(result.score_delta!)}
          </div>
          <div className="text-sm text-muted">vs baseline</div>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Baseline" value={fmt(b.score)} />
        <Kpi label="Scenario" value={fmt(s.score)} strong />
        <Kpi label="Потрачено" value={`${result.spent} / ${result.budget}`} />
        <Kpi label="Остаток" value={String(result.remaining)} />
      </dl>

      <div className="mt-6 min-w-0 rounded-xl border border-line bg-page/50 p-3 sm:p-4">
        <div className="kicker mb-2">Как получен Score</div>
        <div className="overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="Формула Score, таблицу можно прокрутить">
        <table className="w-full min-w-[420px] text-sm tabular-nums">
          <caption className="sr-only">Сравнение компонентов Score до и после сценария</caption>
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th className="font-medium" />
              <th className="font-medium">{w.avg_weight} × D<sub>avg</sub></th>
              <th className="font-medium">+ {w.min_weight} × min D<sub>d</sub></th>
              <th className="font-medium">− {w.critical_penalty} × N<sub>crit</sub></th>
              <th className="text-right font-medium">= Score</th>
            </tr>
          </thead>
          <tbody>
            {[['Baseline', b], ['Scenario', s]].map(([label, x]) => {
              const v = x as typeof s
              return (
                <tr key={label as string} className={label === 'Scenario' ? 'text-ink' : 'text-ink-2'}>
                  <td className="py-1 pr-2 text-xs text-muted">{label as string}</td>
                  <td>{w.avg_weight} × {fmt(v.d_avg, 4)}</td>
                  <td>{w.min_weight} × {fmt(v.d_min, 4)}</td>
                  <td>{w.critical_penalty} × {v.n_crit}</td>
                  <td className="text-right font-semibold">{fmt(v.score, 4)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Все числа считает детерминированный движок на бэкенде. D<sub>avg</sub> — средняя оценка районов, взвешенная по населению.
        </p>
      </div>
    </section>
  )
}

function Kpi({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
      <dt className="kicker">{label}</dt>
      <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${strong ? 'text-accent-hover' : ''}`}>{value}</dd>
    </div>
  )
}

function CriticalPanel({ game, result }: { game: Game; result: SimulationResult }) {
  const s = result.scenario!
  const names = Object.fromEntries(game.rules.indicators.map((i) => [i.id, i.name]))
  const resolved = result.baseline.critical.filter(
    (c) => !s.critical.some((x) => x.district_id === c.district_id && x.indicator === c.indicator),
  )
  return (
    <Panel kicker="Critical indicators" className="rise">
      {s.critical.length ? (
        <ul className="space-y-1.5">
          {s.critical.map((c) => (
            <li key={c.district_id + c.indicator} className="text-sm text-crit-ink">
              ⚠ {c.district_name} / {c.indicator} {names[c.indicator]} — {num(c.value)}
            </li>
          ))}
        </ul>
      ) : (
        <StatusBadge tone="good">No critical indicators</StatusBadge>
      )}
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3 text-sm">
        <span className="text-ink-2">Penalty</span>
        <span className="font-semibold tabular-nums">{s.penalty ? `−${num(s.penalty)}` : '0'}
          <span className="ml-2 text-xs font-normal text-muted">было −{num(result.baseline.penalty)}</span>
        </span>
      </div>
      {resolved.length > 0 && (
        <div className="mt-2 text-xs text-good-ink">
          ✓ Выведены из критической зоны:{' '}
          {resolved.map((c) => {
            const after = result.districts.find((d) => d.id === c.district_id)!.after[c.indicator]
            return `${c.district_name} ${c.indicator} ${num(c.value)} → ${num(after)}`
          }).join(', ')}
        </div>
      )}
    </Panel>
  )
}

/** Dumbbell chart: a before→after dot pair per district on a shared axis. */
function DistrictComparison({ result }: { result: SimulationResult }) {
  const [hover, setHover] = useState<string | null>(null)
  const all = result.districts.flatMap((d) => [d.score_before, d.score_after])
  const lo = Math.floor(Math.min(...all) / 5) * 5 - 5
  const hi = Math.ceil(Math.max(...all) / 5) * 5
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5)

  return (
    <Panel
      kicker="District comparison"
      title="Оценка района до и после"
      className="rise"
      right={
        <div className="flex items-center gap-4 text-xs text-ink-2">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-baseline-bar" />До</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent" />После</span>
        </div>
      }
    >
      <div className="overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="График оценок районов до и после; доступна горизонтальная прокрутка">
      <div className="min-w-[440px]">
      <div className="grid grid-cols-[78px_1fr_150px] items-center gap-x-3 text-[11px] text-muted">
        <span />
        <div className="relative h-4">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${x(t)}%` }}>{t}</span>
          ))}
        </div>
        <div className="grid grid-cols-3 text-right"><span>до</span><span>после</span><span>Δ</span></div>
      </div>
      <div className="mt-1">
        {result.districts.map((d) => {
          const a = x(d.score_before)
          const b = x(d.score_after)
          const isHover = hover === d.id
          return (
            <div
              key={d.id}
              onMouseEnter={() => setHover(d.id)}
              onMouseLeave={() => setHover(null)}
              className={`grid grid-cols-[78px_1fr_150px] items-center gap-x-3 rounded-lg py-2 ${isHover ? 'bg-white/[0.04]' : ''}`}
            >
              <span className="pl-1 text-sm text-ink">{d.name}</span>
              <div className="relative h-6">
                {ticks.map((t) => (
                  <span key={t} className="absolute top-0 h-full w-px bg-grid" style={{ left: `${x(t)}%` }} />
                ))}
                <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-accent/60" style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%` }} />
                <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-baseline-bar ring-2 ring-surface" style={{ left: `${a}%` }} />
                <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface" style={{ left: `${b}%` }} />
                {isHover && (
                  <span className="absolute -top-7 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink shadow-lg" style={{ left: `${b}%` }}>
                    {d.name}: {fmt(d.score_before)} → {fmt(d.score_after)} ({signed(d.score_delta)})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 text-right text-sm tabular-nums">
                <span className="text-ink-2">{fmt(d.score_before)}</span>
                <span className="font-semibold text-ink">{fmt(d.score_after)}</span>
                <span className={d.score_delta > 0.004 ? 'text-good-ink' : d.score_delta < -0.004 ? 'text-crit-ink' : 'text-muted'}>{signed(d.score_delta)}</span>
              </div>
            </div>
          )
        })}
      </div>
      </div>
      </div>
    </Panel>
  )
}

/** Diverging horizontal bars of the population-weighted city change per indicator. */
function IndicatorImpact({ game, result }: { game: Game; result: SimulationResult }) {
  const names = Object.fromEntries(game.rules.indicators.map((i) => [i.id, i.name]))
  const values = Object.values(result.indicator_deltas)
  const maxAbs = Math.max(1, ...values.map(Math.abs))
  const hasNeg = values.some((v) => v < -1e-9)
  const zero = hasNeg ? 50 : 0

  return (
    <Panel kicker="Indicator impact" title="Изменение показателей по городу" className="rise">
      <p className="-mt-2 mb-4 text-xs text-muted">Средневзвешенно по населению. Нажмите на показатель, чтобы увидеть изменение по районам.</p>
      <div className="space-y-4">
        {game.rules.categories.map((c) => (
          <div key={c.id}>
            <div className="kicker mb-1.5">{c.name}</div>
            {c.indicators.map((k) => {
              const v = result.indicator_deltas[k]
              const width = (Math.abs(v) / maxAbs) * (hasNeg ? 48 : 100)
              const byDistrict = result.districts.filter((d) => Math.abs(d.delta[k]) > 1e-9)
                .map((d) => `${d.name} ${signed(d.delta[k])}`).join(' · ')
              return (
                <details key={k} className="group rounded-lg py-1.5 open:bg-white/[0.03]">
                  <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="font-mono font-semibold text-ink-2">{k}</span>
                      <span className="min-w-0 flex-1 text-ink-2">{names[k]}</span>
                      <span className={`shrink-0 tabular-nums ${v < 0 ? 'text-crit-ink' : v > 0 ? 'text-good-ink' : 'text-muted'}`}>{signed(v)}</span>
                      <span className="text-muted" aria-hidden>⌄</span>
                    </div>
                  <div className="relative mt-1.5 h-2 rounded bg-page/70" aria-hidden>
                    {hasNeg && <span className="absolute top-0 h-full w-px bg-axis" style={{ left: `${zero}%` }} />}
                    {Math.abs(v) > 1e-9 && (
                      <span
                        className={`absolute top-1/2 h-2 -translate-y-1/2 ${v > 0 ? 'rounded-r bg-accent' : 'rounded-l bg-neg'}`}
                        style={v > 0 ? { left: `${zero}%`, width: `${width}%` } : { left: `${zero - width}%`, width: `${width}%` }}
                      />
                    )}
                  </div>
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-ink-2">{byDistrict || 'Во всех районах без изменений.'}</p>
                </details>
              )
            })}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function AppliedEffects({ game, result }: { game: Game; result: SimulationResult }) {
  return (
    <Panel kicker="Прозрачность модели" title="Что именно применил движок" className="rise">
      <ul className="space-y-2.5">
        {result.applied_effects.map((e) => {
          const m = game.initiatives.find((x) => x.id === e.measure_id)!
          return (
            <li key={e.measure_id} className="rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Code>{e.measure_id}</Code>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{e.measure_name}</span>
                <span className="text-xs text-muted">{m.type === 'city' ? 'весь город' : districtName(game, e.district_ids[0])}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] tabular-nums">
                <span className="text-muted">лаг {e.lag} → ×{num(e.realized_share)}</span>
                {Object.entries(e.realized_effects).map(([k, v]) => (
                  <span key={k} className="rounded border border-line px-1.5">
                    <span className="font-mono font-semibold">{k}</span>{' '}
                    <span className={v < 0 ? 'text-crit-ink' : 'text-good-ink'}>{v > 0 ? '+' : ''}{num(v)}</span>
                  </span>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 border-t border-line pt-3">
        <div className="kicker mb-2">Синергии</div>
        {result.applied_synergies.length ? (
          result.applied_synergies.map((s) => (
            <div key={s.id + s.district_id} className="text-sm text-ink-2">
              <span className="text-good-ink">✓</span> {s.measures.join(' + ')} → {s.indicator} +{s.bonus} в районе {districtName(game, s.district_id)}
              <span className="text-xs text-muted"> (без лага)</span>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted">
            Нет. Доступные пары: {game.rules.synergies.map((s) => s.measures.join('+')).join(', ')}.
          </div>
        )}
      </div>
    </Panel>
  )
}
