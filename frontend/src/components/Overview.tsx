import { useState } from 'react'
import type { Game } from '../types'
import { categoryValue, fmt, heat, heatInk, num, valueTone } from '../lib/format'
import { CityMap } from './CityMap'
import { Button, Meter, Panel, StatusBadge } from './ui'

export function Overview({ game, onStart, onDemo }: { game: Game; onStart: () => void; onDemo: () => void }) {
  const { rules, districts, baseline } = game
  const threshold = rules.critical_threshold
  const [activeDistrict, setActiveDistrict] = useState(baseline.d_min_district)
  const selectedDistrict = districts.find((district) => district.id === activeDistrict)!

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="panel rise relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="kicker text-accent">Astana city simulator</div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Аким на 5 часов</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-2">
              У вас {rules.budget} условных единиц бюджета и ровно {rules.required_decisions} решений. Расставьте приоритеты
              в пяти направлениях — не более {rules.max_per_category} мер в каждом. Модель покажет изменение 10 показателей в 5 районах за{' '}
              {rules.horizon_quarters} кварталов, а AI-аналитик объяснит компромиссы.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={onStart} className="px-5 py-2.5">Принять 5 решений →</Button>
              <Button onClick={onDemo} className="px-5 py-2.5">Загрузить демо-сценарий</Button>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Бюджет" value={`${rules.budget} / ${rules.budget}`} />
            <Stat label="Районов" value={String(districts.length)} />
            <Stat label="Показателей" value={String(rules.indicators.length)} />
            <Stat label="Мероприятий" value={String(game.initiatives.length)} />
            <Stat label="Решений" value={String(rules.required_decisions)} />
            <Stat label="Score сейчас" value={fmt(baseline.score)} accent />
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Panel kicker="Карта" title="Исходное состояние районов" className="rise">
          <CityMap data={districts.map((d) => ({ id: d.id, name: d.name, value: baseline.district_scores[d.id] }))} highlight={activeDistrict} onSelect={setActiveDistrict} />
          <div className="mt-4 rounded-xl border border-line bg-page/40 p-3" aria-live="polite">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{selectedDistrict.name}</h3>
              <span className="text-xs text-muted">{num(selectedDistrict.population_share * 100)}% жителей</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{selectedDistrict.profile}</p>
            <p className="mt-2 text-xs text-muted">Выберите район на карте, чтобы изучить его приоритеты. Схема условная.</p>
          </div>
        </Panel>

        <Panel
          kicker="Heatmap"
          title="10 показателей × 5 районов"
          className="rise"
          right={
            baseline.n_crit > 0 ? (
              <StatusBadge tone="crit">{baseline.n_crit} критических · штраф −{num(baseline.penalty)}</StatusBadge>
            ) : null
          }
        >
          <Heatmap game={game} highlight={activeDistrict} onSelect={setActiveDistrict} />
          <p className="mt-3 text-xs text-muted">
            0–100, больше — лучше. Значения ниже {threshold} считаются критическими и дают штраф −1 к Score за каждое.
          </p>
          <details className="mt-3 rounded-xl border border-line p-3 text-xs">
            <summary className="cursor-pointer font-medium text-ink-2">Что означают показатели и их веса?</summary>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {rules.indicators.map((indicator) => <div key={indicator.id} className="flex gap-2"><dt className="font-mono text-accent-hover">{indicator.id}</dt><dd className="text-ink-2">{indicator.name} <span className="text-muted">· вес {num(indicator.weight)}</span></dd></div>)}
            </dl>
            <p className="mt-3 text-muted">Оценки направлений в карточках — среднее двух показателей. District Score учитывает веса всех десяти показателей.</p>
          </details>
        </Panel>
      </div>

      <section>
        <div className="kicker mb-3">Районы</div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {districts.map((d, i) => {
            const score = baseline.district_scores[d.id]
            const lowest = baseline.d_min_district === d.id
            return (
              <article key={d.id} className={`panel rise rounded-2xl p-4 ${activeDistrict === d.id ? 'ring-1 ring-accent/60' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{d.name}</h3>
                    <div className="text-xs text-muted">{Math.round(d.population_share * 100)}% населения</div>
                  </div>
                  {lowest && <StatusBadge tone="warn">Аутсайдер</StatusBadge>}
                </header>
                <p className="mt-2 min-h-[2.5rem] text-xs leading-relaxed text-ink-2">{d.profile}</p>
                <ul className="mt-3 space-y-2">
                  {rules.categories.map((c) => {
                    const v = categoryValue(d.indicators, c)
                    const worst = Math.min(...c.indicators.map((k) => d.indicators[k]))
                    return (
                      <li key={c.id}>
                        <div className="flex justify-between text-xs">
                          <span className="text-ink-2">{c.name}</span>
                          <span className="tabular-nums font-medium">{num(v)}</span>
                        </div>
                        <Meter value={v} tone={valueTone(worst, threshold) === 'crit' ? 'crit' : 'neutral'} className="mt-1" />
                      </li>
                    )
                  })}
                </ul>
                <footer className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
                  <span className="kicker">District score</span>
                  <span className="text-xl font-semibold">{fmt(score)}</span>
                </footer>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-4 py-3">
      <dt className="kicker">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold ${accent ? 'text-accent-hover' : ''}`}>{value}</dd>
    </div>
  )
}

export function Heatmap({ game, values, compact, highlight, onSelect }: {
  game: Game
  values?: Record<string, Record<string, number>>
  compact?: boolean
  highlight?: string
  onSelect?: (id: string) => void
}) {
  const { rules, districts } = game
  const names = Object.fromEntries(rules.indicators.map((i) => [i.id, i.name]))
  return (
    <div className="relative w-full min-w-0 overflow-x-auto" tabIndex={0} role="region" aria-label="Таблица показателей; доступна горизонтальная прокрутка">
      <table className="w-full border-separate border-spacing-[2px] text-center text-xs">
        <caption className="sr-only left-0 top-0">Показатели по районам от 0 до 100; больше — лучше</caption>
        <thead>
          <tr>
            <th />
            {rules.categories.map((c) => (
              <th key={c.id} scope="colgroup" colSpan={c.indicators.length} className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {c.name}
              </th>
            ))}
          </tr>
          <tr>
            <th />
            {rules.indicators.map((i) => (
              <th key={i.id} scope="col" className="relative pb-1 font-mono text-[11px] font-semibold text-ink-2" title={i.name}><span aria-hidden>{i.id}</span><span className="sr-only left-0 top-0">{i.id}: {i.name}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {districts.map((d) => (
            <tr key={d.id} className={highlight === d.id ? 'bg-accent/10' : ''}>
              <th scope="row" className="pr-2 text-left text-xs font-medium text-ink-2 whitespace-nowrap">{onSelect ? <button type="button" className="min-h-9 text-left" aria-pressed={highlight === d.id} onClick={() => onSelect(d.id)}>{d.name}</button> : d.name}</th>
              {rules.indicators.map((i) => {
                const v = values?.[d.id]?.[i.id] ?? d.indicators[i.id]
                const crit = v < rules.critical_threshold
                return (
                  <td
                    key={i.id}
                    title={`${d.name} · ${i.id} ${names[i.id]}: ${num(v)}${crit ? ' — критическое значение' : ''}`}
                    className={`min-w-8 rounded-md px-1 font-semibold tabular-nums ${compact ? 'h-7' : 'h-9'} ${crit ? 'ring-2 ring-crit ring-inset' : ''}`}
                    style={{ background: heat(v), color: heatInk(v) }}
                  >
                    {crit && <span aria-label="критическое" className="mr-0.5">⚠</span>}
                    {num(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
