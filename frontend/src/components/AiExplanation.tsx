import { AlertTriangle, Bot, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { buildAiPayload } from '../lib/buildAiPayload'
import { requestExplanation, type ExplainOutcome } from '../lib/explainApi'
import { generateFallbackExplanation } from '../lib/generateFallbackExplanation'
import type { AiExplanation as Explanation } from '../types/ai'
import type { Horizon, SimulationResult } from '../types/simulation'
import { CitizenReactionCard } from './CitizenReactionCard'
import { Kicker, Panel } from './ui'

/**
 * Резервное объяснение показывается сразу, AI-версия подменяет его, когда придёт.
 * Так AI-запрос никогда не блокирует экран результата (п. 19.1).
 */
export function AiExplanation({ result, horizon }: { result: SimulationResult; horizon: Horizon }) {
  const fallback = useMemo(() => generateFallbackExplanation(result, horizon), [result, horizon])
  const [state, setState] = useState<{ key: string; outcome: ExplainOutcome | null }>({ key: '', outcome: null })
  const key = `${JSON.stringify(result.selectedDecisions)}:${horizon}`

  useEffect(() => {
    const ctrl = new AbortController()
    requestExplanation(buildAiPayload(result, horizon), ctrl.signal)
      .then((outcome) => setState({ key, outcome }))
      .catch(() => {})
    return () => ctrl.abort()
  }, [key, result, horizon])

  const outcome = state.key === key ? state.outcome : null
  const loading = outcome === null
  const data: Explanation = outcome?.source === 'ai' ? outcome.data : fallback

  return (
    <>
      <Panel className="rise">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Kicker>Объяснение последствий</Kicker>
          <span className="-mt-2 ml-auto">
            {loading ? (
              <Badge tone="muted">
                <Loader2 aria-hidden className="size-3.5 animate-spin" /> AI анализирует…
              </Badge>
            ) : outcome?.source === 'ai' ? (
              <Badge tone="accent">
                <Bot aria-hidden className="size-3.5" /> AI-объяснение{outcome.model ? ` · ${outcome.model}` : ''}
              </Badge>
            ) : (
              <Badge tone="warn">Шаблонное объяснение</Badge>
            )}
          </span>
        </div>
        {outcome?.source === 'fallback' && (
          <p className="mb-3 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn" role="status">
            AI-объяснение временно недоступно. Показано объяснение, сформированное системой.
          </p>
        )}
        <p className="mb-4 text-base leading-relaxed">{data.summary}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <List title="Положительные последствия" items={data.positives} icon={<CheckCircle2 aria-hidden className="size-4 text-good-ink" />} />
          <List title="Риски и компромиссы" items={data.risks} icon={<AlertTriangle aria-hidden className="size-4 text-warn" />} />
        </div>
        <p className="mt-4 flex gap-2 rounded-xl border border-accent/40 bg-accent-track/60 px-3 py-2.5 text-sm">
          <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            <strong>Рекомендация: </strong>
            {data.recommendation}
          </span>
        </p>
        <p className="mt-3 text-xs text-muted">
          AI получает только рассчитанные системой значения и не меняет баллы. Модель демонстрационная.
        </p>
      </Panel>

      <Panel className="rise">
        <Kicker>Реакции условных жителей</Kicker>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.citizenReactions.map((r, i) => (
            <CitizenReactionCard key={r.persona} reaction={r} index={i} />
          ))}
        </div>
      </Panel>
    </>
  )
}

function List({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1.5 text-sm text-ink-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span className="mt-0.5 shrink-0">{icon}</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'muted' | 'accent' | 'warn' }) {
  const cls = {
    muted: 'border-line text-muted',
    accent: 'border-accent/50 text-accent-hover',
    warn: 'border-warn/50 text-warn',
  }[tone]
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${cls}`}>{children}</span>
}
