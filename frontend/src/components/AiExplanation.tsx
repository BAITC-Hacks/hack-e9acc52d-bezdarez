import { AlertTriangle, BarChart3, CheckCircle2, Info, Lightbulb, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { buildAiPayload } from '../lib/buildAiPayload'
import { requestExplanation, type ExplainOutcome } from '../lib/explainApi'
import { generateFallbackExplanation } from '../lib/generateFallbackExplanation'
import type { AiExplanation as Explanation } from '../types/ai'
import type { Horizon, SimulationResult } from '../types/simulation'
import { CitizenReactionCard } from './CitizenReactionCard'
import { Panel } from './ui'

/**
 * Системное объяснение показывается сразу, AI-версия подменяет его, когда придёт.
 * Так AI-запрос никогда не блокирует экран результата (п. 19.1).
 */
export function AiExplanation({ result, horizon }: { result: SimulationResult; horizon: Horizon }) {
  const fallback = useMemo(() => generateFallbackExplanation(result, horizon), [result, horizon])
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; outcome: ExplainOutcome | null }>({ key: '', outcome: null })
  const key = `${JSON.stringify(result.selectedDecisions)}:${horizon}:${attempt}`

  useEffect(() => {
    const ctrl = new AbortController()
    requestExplanation(buildAiPayload(result, horizon), ctrl.signal)
      .then((outcome) => setState({ key, outcome }))
      .catch(() => {})
    return () => ctrl.abort()
  }, [key, result, horizon])

  const outcome = state.key === key ? state.outcome : null
  const loading = outcome === null
  const isAi = outcome?.source === 'ai'
  const data: Explanation = isAi ? outcome.data : fallback

  return (
    <>
      <Panel className="rise overflow-hidden !p-0">
        <div
          className={`flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6 ${
            isAi ? 'bg-gradient-to-r from-accent to-[#0f5a64] text-white' : 'bg-lavender'
          }`}
        >
          <span className={`grid size-10 place-items-center rounded-2xl ${isAi ? 'bg-white/20' : 'bg-white'}`}>
            {isAi ? <Sparkles aria-hidden className="size-5" /> : <BarChart3 aria-hidden className="size-5 text-accent" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold leading-tight">{isAi ? 'AI-объяснение последствий' : 'Разбор последствий'}</h2>
            <p className={`text-xs ${isAi ? 'text-white/80' : 'text-muted'}`}>
              {loading
                ? 'AI анализирует рассчитанный результат…'
                : isAi
                  ? `Сформировано моделью ${outcome.model ?? ''} только по рассчитанным данным`
                  : 'Сформировано системой по рассчитанным данным'}
            </p>
          </div>
          {loading && <Loader2 aria-label="Загрузка" className="size-5 animate-spin text-accent" />}
          {outcome?.source === 'fallback' && (
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink shadow-sm hover:text-accent"
            >
              <RefreshCw aria-hidden className="size-3.5" /> Повторить AI
            </button>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {outcome?.source === 'fallback' && (
            <p className="mb-4 flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2" role="status">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>
                AI-объяснение временно недоступно. Показано объяснение, сформированное системой.
                <span className="block text-xs text-muted">Причина: {outcome.reason}</span>
              </span>
            </p>
          )}

          <p className="text-base leading-relaxed sm:text-[17px]">{data.summary}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <List title="Положительные последствия" items={data.positives} tone="good" />
            <List title="Риски и компромиссы" items={data.risks} tone="warn" />
          </div>

          <div className="mt-5 flex gap-3 rounded-2xl bg-accent-track px-4 py-3.5">
            <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0 text-good-ink" />
            <p className="text-sm">
              <span className="block text-xs font-bold uppercase tracking-wide text-good-ink">Рекомендация</span>
              {data.recommendation}
            </p>
          </div>
          <p className="mt-4 text-xs text-muted">
            AI получает только рассчитанные системой значения и не меняет баллы. Модель демонстрационная и не является
            прогнозом для Астаны.
          </p>
        </div>
      </Panel>

      <Panel className="rise">
        <h2 className="mb-4 text-lg font-extrabold">Что скажут жители</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.citizenReactions.map((r, i) => (
            <CitizenReactionCard key={r.persona} reaction={r} index={i} />
          ))}
        </div>
      </Panel>
    </>
  )
}

function List({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'warn' }) {
  const Icon = tone === 'good' ? CheckCircle2 : AlertTriangle
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'good' ? 'border-accent/25' : 'border-warn/25'}`}>
      <h3 className={`mb-2.5 text-sm font-bold ${tone === 'good' ? 'text-good-ink' : 'text-warn'}`}>{title}</h3>
      <ul className="space-y-2 text-sm text-ink-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${tone === 'good' ? 'text-good-ink' : 'text-warn'}`} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
