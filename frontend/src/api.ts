import type {
  AnalysisResponse,
  ComparisonResult,
  Game,
  Selection,
  SimulationResult,
  ValidationReport,
} from './types'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  detail: unknown
  constructor(message: string, detail: unknown) {
    super(message)
    this.detail = detail
  }
}

async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(path.startsWith('/api/ai/') ? 200_000 : 15_000)
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    if (timeout.aborted) throw new ApiError('Сервер не ответил вовремя. Повторите запрос.', null)
    throw new ApiError('Нет связи с сервером. Проверьте подключение и повторите попытку.', null)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = typeof data?.detail === 'string' ? data.detail
      : (data?.detail?.message as string) ?? `Ошибка API (${res.status})`
    throw new ApiError(message, data?.detail)
  }
  if (!data) throw new ApiError('Сервер вернул пустой ответ. Повторите запрос.', null)
  return data as T
}

export const api = {
  game: (signal?: AbortSignal) => request<Game>('/api/game', undefined, signal),
  validate: (selections: Selection[], signal?: AbortSignal) => request<ValidationReport>('/api/simulation/validate', { selections }, signal),
  calculate: (selections: Selection[], signal?: AbortSignal) => request<SimulationResult>('/api/simulation/calculate', { selections }, signal),
  compare: (base: Selection[], alternative: Selection[], signal?: AbortSignal) =>
    request<ComparisonResult>('/api/simulation/compare', { base: { selections: base }, alternative: { selections: alternative } }, signal),
  analyze: (scenario: Selection[], alternative?: Selection[], signal?: AbortSignal) =>
    request<AnalysisResponse>('/api/ai/analyze', {
      scenario: { selections: scenario },
      alternative: alternative ? { selections: alternative } : null,
    }, signal),
}
