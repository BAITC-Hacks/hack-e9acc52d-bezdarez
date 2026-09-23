import { explainResponseSchema, type AiExplanation } from '../types/ai'
import type { AiPayload } from './buildAiPayload'
import type { Lang } from './i18n'

export type ExplainOutcome =
  | { source: 'ai'; data: AiExplanation; model?: string }
  | { source: 'fallback'; reason: string }

/** POST /api/explain. Любая ошибка сети, сервера или схемы → резервный текст (FR-09). */
export async function requestExplanation(payload: AiPayload, signal?: AbortSignal, lang: Lang = 'ru'): Promise<ExplainOutcome> {
  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulationResult: payload, lang }),
      signal,
    })
    if (!res.ok) return { source: 'fallback', reason: res.status === 429 ? 'rate_limited' : 'unavailable' }
    const parsed = explainResponseSchema.safeParse(await res.json())
    if (!parsed.success) return { source: 'fallback', reason: 'invalid_response' }
    if (!parsed.data.success) return { source: 'fallback', reason: parsed.data.reason ?? 'unavailable' }
    return { source: 'ai', data: parsed.data.data, model: parsed.data.model }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return { source: 'fallback', reason: 'unavailable' }
  }
}

const REASONS = {
  ru: { rate_limited: 'Слишком много запросов. Попробуйте через минуту.', invalid_request: 'Не удалось обработать данные результата.', not_configured: 'AI пока не подключён.', invalid_response: 'Ответ AI не прошёл проверку.', unavailable: 'Не удалось связаться с сервисом объяснений.' },
  kk: { rate_limited: 'Сұраулар тым көп. Бір минуттан кейін қайталап көріңіз.', invalid_request: 'Нәтиже деректерін өңдеу мүмкін болмады.', not_configured: 'AI әлі қосылмаған.', invalid_response: 'AI жауабы тексеруден өтпеді.', unavailable: 'Түсіндіру қызметімен байланысу мүмкін болмады.' },
  en: { rate_limited: 'Too many requests. Try again in a minute.', invalid_request: 'The result data could not be processed.', not_configured: 'AI is not connected yet.', invalid_response: 'The AI response did not pass validation.', unavailable: 'The explanation service could not be reached.' },
}

/** Do not expose a server's internal or untranslated error text in the UI. */
export function explanationFailureMessage(reason: string, lang: Lang): string {
  const copy = REASONS[lang]
  return Object.hasOwn(copy, reason) ? copy[reason as keyof typeof copy] : copy.unavailable
}
