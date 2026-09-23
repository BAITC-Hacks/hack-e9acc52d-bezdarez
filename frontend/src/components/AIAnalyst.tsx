import type { AnalysisResponse, Selection } from '../types'
import { useAnalysis } from '../hooks/useAnalysis'
import { Button, Spinner, StatusBadge } from './ui'

export function AIAnalyst({ selections }: { selections: Selection[] }) {
  const { data, loading, error, run } = useAnalysis(selections)

  return (
    <section className="panel rise overflow-hidden rounded-3xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-lg text-accent-hover" aria-hidden>◈</span>
          <div>
            <div className="kicker text-accent">AI city strategy analyst</div>
            <div className="text-sm text-ink-2">Интерпретирует результат движка. Не считает и не придумывает числа.</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && <SourceBadge data={data} />}
          <Button onClick={run} disabled={loading}>{loading ? <Spinner /> : '↻'} Перезапустить</Button>
        </div>
      </header>

      <div className="px-6 py-5">
        {loading && !data && <AnalystLoading />}
        {error && <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 px-4 py-3 text-sm text-crit-ink">⚠ {error}</div>}
        {data && <AnalysisView data={data} />}
      </div>
    </section>
  )
}

function AnalystLoading() {
  return (
    <div role="status" className="flex flex-col gap-3 py-6">
      <div className="flex items-center gap-3 text-sm text-ink-2"><Spinner /> Готовим аналитический отчёт по рассчитанному сценарию…</div>
      <p className="text-xs text-muted">Результат симуляции уже готов. Анализ может занять до трёх минут.</p>
    </div>
  )
}

export function SourceBadge({ data }: { data: AnalysisResponse }) {
  return data.source === 'llm'
    ? <StatusBadge tone="neutral" icon={false}>LLM · {data.model}</StatusBadge>
    : <StatusBadge tone="warn">Анализ по правилам · без LLM</StatusBadge>
}

export function AnalysisView({ data, verdictOnly }: { data: AnalysisResponse; verdictOnly?: boolean }) {
  const r = data.report
  const g = data.grounding
  return (
    <div className="space-y-5">
      {data.note && <div className="rounded-lg border border-warn/30 bg-warn/[0.07] px-4 py-2.5 text-xs text-ink-2">! {data.note}</div>}

      {r.alternative_verdict && (
        <div className="rounded-xl border border-accent/40 bg-accent/[0.08] px-4 py-3">
          <div className="kicker mb-1 text-accent">Вердикт по альтернативе</div>
          <p className="text-[15px] leading-relaxed text-ink">{r.alternative_verdict}</p>
        </div>
      )}

      {!verdictOnly && (
        <>
          <div>
            <div className="kicker mb-1.5">Главное</div>
            <p className="max-w-4xl text-[15px] leading-relaxed text-ink">{r.summary}</p>
            {!r.data_sufficient && <div className="mt-2"><StatusBadge tone="warn">Аналитик сообщил о нехватке данных</StatusBadge></div>}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ListBlock title="Сильные стороны" icon="✓" iconClass="text-good-ink" items={r.strengths} />
            <ListBlock title="Компромиссы" icon="↔" iconClass="text-ink-2" items={r.tradeoffs} />
            <ListBlock title="Риски" icon="⚠" iconClass="text-warn" items={r.risks} />
            <ListBlock title="Рекомендации" icon="→" iconClass="text-accent-hover" items={r.recommendations} />
          </div>

          {r.district_impacts.length > 0 && (
            <div>
              <div className="kicker mb-2">Влияние на районы</div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {r.district_impacts.map((d) => (
                  <div key={d.district} className="rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
                    <div className="text-sm font-semibold text-ink">{d.district}</div>
                    <div className="mt-1 text-xs leading-relaxed text-ink-2">{d.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <details className="border-t border-line pt-4 text-xs text-muted">
        <summary className="cursor-pointer">Источники и проверка отчёта</summary>
        <div className="mt-3 flex flex-wrap items-center gap-2">
        {g.unverified_numbers.length === 0 ? (
          <StatusBadge tone="good">{g.checked_numbers} числовых значений найдены в данных движка</StatusBadge>
        ) : (
          <StatusBadge tone="warn">Не найдены в данных движка: {g.unverified_numbers.join(', ')}</StatusBadge>
        )}
        {data.tool_calls.length > 0 && (
          <>
            <span className="ml-2">Вызовы инструментов:</span>
            {data.tool_calls.map((t, i) => (
              <span key={i} className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-2">{t}()</span>
            ))}
          </>
        )}
        </div>
        <p className="mt-2">Проверка чисел не гарантирует точность каждой интерпретации. Источник Score и показателей — результат симуляции.</p>
      </details>
    </div>
  )
}

function ListBlock({ title, icon, iconClass, items }: { title: string; icon: string; iconClass: string; items: string[] }) {
  return (
    <div>
      <div className="kicker mb-2">{title}</div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-2">
            <span className={`mt-px shrink-0 ${iconClass}`} aria-hidden>{icon}</span>
            <span>{it}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted">—</li>}
      </ul>
    </div>
  )
}
