import { validateAssistantAction } from './assistant'
import type { AdvisorAction } from './advisor'

export interface ChatAction { label: string; do: AdvisorAction }
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  source?: 'ai' | 'rules' | 'status'
  model?: string
  actions?: ChatAction[]
  contextKey?: string
  applied?: boolean
  retryable?: boolean
  notice?: 'unavailable' | 'timeout' | 'stopped'
}

export const CHAT_KEY = 'qalabalance:assistant:v1'
export const MAX_MESSAGES = 40
export const MAX_QUESTION = 2000
// Allow a local model to load and finish before the browser aborts the request.
export const ASSISTANT_TIMEOUT_MS = 125_000

export function parseActions(value: unknown): ChatAction[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 3).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return []
    const { label, do: candidate } = item as Record<string, unknown>
    const action = validateAssistantAction(candidate)
    return typeof label === 'string' && label.trim() && label.length <= 120 && action
      ? [{ label: label.trim(), do: action }] : []
  })
}

export function parseChat(raw: string | null): ChatMessage[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(value)) return []
    return value.slice(-MAX_MESSAGES).flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return []
      const m = item as Record<string, unknown>
      if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 6000) return []
      return [{
        id: typeof m.id === 'string' && m.id.length < 100 ? m.id : crypto.randomUUID(),
        role: m.role, text: m.text,
        source: m.role === 'assistant' ? (m.source === 'ai' || m.source === 'status' ? m.source : 'rules') : undefined,
        model: typeof m.model === 'string' ? m.model.slice(0, 120) : undefined,
        actions: m.role === 'assistant' ? parseActions(m.actions) : [],
        contextKey: typeof m.contextKey === 'string' ? m.contextKey.slice(0, 1000) : undefined,
        applied: m.applied === true, retryable: m.retryable === true,
        notice: m.notice === 'unavailable' || m.notice === 'timeout' || m.notice === 'stopped' ? m.notice : undefined,
      } satisfies ChatMessage]
    })
  } catch {
    return []
  }
}

export function loadChat(): ChatMessage[] {
  try { return parseChat(localStorage.getItem(CHAT_KEY)) } catch { return [] }
}

export function saveChat(messages: ChatMessage[]) {
  try {
    if (messages.length) localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
    else localStorage.removeItem(CHAT_KEY)
  } catch { /* Chat remains usable when browser storage is unavailable. */ }
}

/** Recent conversation; connection errors are UI state, not model replies. */
export function chatHistory(messages: ChatMessage[]) {
  const history = messages.filter((m) => m.source !== 'status' && m.notice !== 'stopped').slice(-16).map((m) => ({
    role: m.role,
    content: (m.source === 'rules' ? `[Системная подсказка по данным симулятора] ${m.text}` : m.text).slice(0, 6000),
  }))
  while (history[0]?.role === 'assistant') history.shift()
  return history
}

export function parseAiReply(value: unknown): { answer: string; model?: string; actions: ChatAction[] } | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (body.success !== true || typeof body.answer !== 'string' || !body.answer.trim() || body.answer.length > 6000) return null
  return {
    answer: body.answer.trim(),
    model: typeof body.model === 'string' ? body.model.slice(0, 120) : undefined,
    actions: parseActions(body.actions),
  }
}
