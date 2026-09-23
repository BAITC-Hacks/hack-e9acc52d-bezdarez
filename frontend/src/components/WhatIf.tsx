import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import type { ComparisonResult, Game, Selection, SimulationResult, ValidationReport } from '../types'
import { districtName, fmt, signed } from '../lib/format'
import { AnalysisView, SourceBadge } from './AIAnalyst'
import { useAnalysis } from '../hooks/useAnalysis'
import { Button, Code, Panel, Spinner, StatusBadge } from './ui'

export function WhatIf({ game, selections, result }: { game: Game; selections: Selection[]; result: SimulationResult }) {
  const [replace, setReplace] = useState(selections[selections.length - 1]?.measure_id ?? '')
  const [withId, setWithId] = useState('')
  const [district, setDistrict] = useState<string | null>(null)
  const [avail, setAvail] = useState<ValidationReport | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [cmp, setCmp] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [explain, setExplain] = useState(false)
  const pending = useRef<AbortController | null>(null)

  const others = useMemo(() => selections.filter((s) => s.measure_id !== replace), [selections, replace])
  const withMeasure = game.initiatives.find((m) => m.id === withId)

  // Backend availability for the 4 remaining measures drives which replacements are allowed.
  useEffect(() => {
    const controller = new AbortController()
    api.validate(others, controller.signal)
      .then((report) => { if (!controller.signal.aborted) setAvail(report) })
      .catch((failure) => { if (!controller.signal.aborted) setAvailabilityError(failure instanceof Error ? failure.message : 'Не удалось проверить альтернативы') })
    return () => controller.abort()
  }, [others, validationAttempt])

  useEffect(() => () => pending.current?.abort(), [])

  const clearComparison = () => { setCmp(null); setExplain(false); setError(null) }
  const changeReplacement = (measureId: string) => {
    setReplace(measureId); setWithId(''); setDistrict(null); setAvail(null); setAvailabilityError(null); clearComparison()
  }
  const changeMeasure = (measureId: string) => { setWithId(measureId); setDistrict(null); clearComparison() }
  const changeDistrict = (districtId: string) => { setDistrict(districtId); clearComparison() }

  const alternative: Selection[] | null = withMeasure && (withMeasure.type === 'city' || district)
    ? selections.map((s) => (s.measure_id === replace ? { measure_id: withMeasure.id, district_id: withMeasure.type === 'city' ? null : district } : s))
    : null

  const run = async () => {
    if (!alternative || !avail || loading) return
    const controller = new AbortController()
    pending.current?.abort()
    pending.current = controller
    setLoading(true)
    setError(null)
    setExplain(false)
    try {
      const comparison = await api.compare(selections, alternative, controller.signal)
      if (!controller.signal.aborted) setCmp(comparison)
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Ошибка сравнения')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const current = selections.find((s) => s.measure_id === replace)
  const alternativeSpent = alternative?.reduce((sum, item) => sum + (game.initiatives.find((measure) => measure.id === item.measure_id)?.cost ?? 0), 0)

  return (
    <Panel kicker="What if?" title="Сравнить альтернативу: заменить одну меру" className="rise">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="block min-w-0">
          <span className="kicker">Заменить</span>
          <select value={replace} disabled={loading} onChange={(e) => changeReplacement(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink">
            {selections.map((s) => {
              const m = game.initiatives.find((x) => x.id === s.measure_id)!
              return <option key={s.measure_id} value={s.measure_id}>{m.id} · {m.name}{s.district_id ? ` · ${districtName(game, s.district_id)}` : ''}</option>
            })}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="kicker">На</span>
          <select value={withId} disabled={loading || !avail} onChange={(e) => changeMeasure(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink">
            <option value="">{availabilityError ? 'Проверка недоступна' : !avail ? 'Проверяем доступность…' : '— выберите меру —'}</option>
            {game.initiatives.filter((m) => !others.some((s) => s.measure_id === m.id) && !(m.id === replace && m.type === 'city')).map((m) => {
              const a = avail?.availability[m.id]
              const ok = !!a?.available
              return (
                <option key={m.id} value={m.id} disabled={!ok}>
                  {m.id} · {m.name} · {m.cost} у.е.{m.id === current?.measure_id ? ' (другой район)' : ''}{!ok && a?.reasons[0] ? ` — ${a.reasons[0]}` : ''}
                </option>
              )
            })}
          </select>
        </label>
        <Button variant="primary" onClick={run} disabled={!alternative || loading || !avail}>
          {loading && <Spinner />} Compare alternative
        </Button>
      </div>

      {withMeasure?.type === 'district' && (
        <div role="group" aria-label="Район альтернативной меры" className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-ink-2">Район:</span>
          {game.districts.map((d) => {
            const reason = avail?.availability[withMeasure.id]?.blocked_districts[d.id]
            const same = withMeasure.id === current?.measure_id && current?.district_id === d.id
            const disabled = !!reason || same || loading || !avail
            return (
              <button key={d.id} type="button" disabled={disabled} title={reason ?? (same ? 'Это текущий вариант' : undefined)}
                aria-pressed={district === d.id}
                onClick={() => changeDistrict(d.id)}
                className={`min-h-9 rounded-lg border px-2.5 py-1 text-xs ${district === d.id ? 'border-accent bg-accent/20 text-ink'
                  : disabled ? 'cursor-not-allowed border-line text-muted line-through' : 'border-line text-ink-2 hover:border-white/30'}`}>
                {district === d.id ? '●' : '○'} {d.name}
              </button>
            )
          })}
        </div>
      )}
      {withMeasure?.type === 'city' && <div className="mt-3 text-xs text-ink-2">Городская мера — применяется ко всем районам.</div>}
      {alternativeSpent !== undefined && <p className="mt-3 text-xs text-ink-2">Бюджет альтернативы: {alternativeSpent} / {game.rules.budget} · остаток {game.rules.budget - alternativeSpent}</p>}
      {availabilityError && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-warn">{availabilityError}<Button onClick={() => { setAvailabilityError(null); setAvail(null); setValidationAttempt((attempt) => attempt + 1) }}>Повторить проверку</Button></div>}

      {error && <div role="alert" className="mt-4 text-sm text-crit-ink">⚠ {error}</div>}

      {cmp && <ComparisonView game={game} cmp={cmp} result={result} />}

      {cmp?.alternative.valid && alternative && (
        <div className="mt-5">
          {!explain ? (
            <Button onClick={() => setExplain(true)}>◈ Объяснить разницу (AI)</Button>
          ) : (
            <ExplainDiff selections={cmp.base.selections} alternative={cmp.alternative.selections} />
          )}
        </div>
      )}
    </Panel>
  )
}

function ComparisonView({ game, cmp, result }: { game: Game; cmp: ComparisonResult; result: SimulationResult }) {
  if (!cmp.alternative.valid) {
    return (
      <div className="mt-5 space-y-2">
        <StatusBadge tone="crit">Альтернатива недопустима и не получает Score</StatusBadge>
        {cmp.alternative.issues.map((i) => <div key={i.message} className="text-sm text-crit-ink">⚠ {i.message}</div>)}
      </div>
    )
  }
  const diff = cmp.score_difference!
  const alt = cmp.alternative
  const swappedIn = alt.selections.find((s) => !result.selections.some((x) => x.measure_id === s.measure_id && x.district_id === s.district_id))
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
      <div className="rounded-xl border border-line bg-white/[0.02] p-4">
        <div className="kicker">Current scenario</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">{fmt(cmp.base.scenario!.score)}</div>
        <div className="text-xs text-muted">потрачено {cmp.base.spent}</div>
      </div>
      <div className={`rounded-xl border p-4 ${diff > 0 ? 'border-good/50 bg-good/[0.06]' : 'border-line bg-white/[0.02]'}`}>
        <div className="kicker">Alternative {swappedIn && <Code>{swappedIn.measure_id}</Code>}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{fmt(alt.scenario!.score)}</span>
          <span className={`text-sm font-semibold ${diff > 0 ? 'text-good-ink' : diff < 0 ? 'text-crit-ink' : 'text-muted'}`}>{signed(diff)}</span>
        </div>
        <div className="text-xs text-muted">потрачено {alt.spent} · критических {alt.scenario!.n_crit}</div>
      </div>
      <div className="rounded-xl border border-line bg-white/[0.02] p-4">
        <div className="kicker mb-1.5">Разница по районам</div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
          {game.districts.map((d) => {
            const v = cmp.district_differences[d.id]
            return (
              <li key={d.id} className="flex justify-between">
                <span className="text-ink-2">{d.name}</span>
                <span className={v > 0.004 ? 'text-good-ink' : v < -0.004 ? 'text-crit-ink' : 'text-muted'}>{signed(v)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function ExplainDiff({ selections, alternative }: { selections: Selection[]; alternative: Selection[] }) {
  const { data, loading, error, run } = useAnalysis(selections, alternative)
  return (
    <div className="rounded-2xl border border-line bg-page/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="kicker text-accent">AI: разница между сценариями</div>
        {data && <SourceBadge data={data} />}
      </div>
      {loading && <div className="flex items-center gap-2 text-sm text-ink-2"><Spinner /> Аналитик сравнивает сценарии через движок…</div>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-crit-ink">⚠ {error}<Button onClick={run}>Повторить анализ</Button></div>}
      {data && <AnalysisView data={data} verdictOnly />}
    </div>
  )
}
