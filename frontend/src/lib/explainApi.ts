import { explainResponseSchema, type AiExplanation } from '../types/ai'
import type { AiPayload } from './buildAiPayload'

export type ExplainOutcome =
  | { source: 'ai'; data: AiExplanation; model?: string }
  | { source: 'fallback'; reason: string }

/** POST /api/explain. Любая ошибка сети, сервера или схемы → резервный текст (FR-09). */
export async function requestExplanation(payload: AiPayload, signal?: AbortSignal): Promise<ExplainOutcome> {
  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulationResult: payload }),
      signal,
    })
    const parsed = explainResponseSchema.safeParse(await res.json())
    if (!parsed.success) return { source: 'fallback', reason: 'ответ AI не прошёл проверку формата' }
    if (!parsed.data.success) return { source: 'fallback', reason: parsed.data.reason ?? 'AI недоступен' }
    return { source: 'ai', data: parsed.data.data, model: parsed.data.model }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return { source: 'fallback', reason: 'сервис объяснений недоступен' }
  }
}
