import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { AnalysisResponse, Selection } from '../types'

interface AnalysisState {
  key: string
  attempt: number
  data: AnalysisResponse | null
  error: string | null
}

/** Associate each response with its exact scenario; discard cancelled requests. */
export function useAnalysis(scenario: Selection[], alternative?: Selection[], auto = true) {
  const key = JSON.stringify([scenario, alternative ?? null])
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<AnalysisState>({ key: '', attempt: -1, data: null, error: null })

  useEffect(() => {
    if (!auto && attempt === 0) return
    const controller = new AbortController()
    const [current, next] = JSON.parse(key) as [Selection[], Selection[] | null]
    api.analyze(current, next ?? undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, attempt, data, error: null })
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setState({ key, attempt, data: null, error: failure instanceof Error ? failure.message : 'Ошибка анализа' })
        }
      })
    return () => controller.abort()
  }, [key, attempt, auto])

  const run = useCallback(() => setAttempt((value) => value + 1), [])
  const current = state.key === key
  const loading = (auto || attempt > 0) && (!current || state.attempt !== attempt)
  return { data: current ? state.data : null, loading, error: current && !loading ? state.error : null, run }
}
