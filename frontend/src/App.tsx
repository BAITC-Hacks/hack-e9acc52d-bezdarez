import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { Game, Selection, SimulationResult, ValidationReport } from './types'
import { DecisionCenter } from './components/DecisionCenter'
import { Overview } from './components/Overview'
import { Results } from './components/Results'
import { Button, Spinner } from './components/ui'

type Step = 'overview' | 'decide' | 'results'

const STEPS: { id: Step; label: string }[] = [
  { id: 'overview', label: 'Обзор города' },
  { id: 'decide', label: 'Центр решений' },
  { id: 'results', label: 'Результаты' },
]

export default function App() {
  const [game, setGame] = useState<Game | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [step, setStep] = useState<Step>('overview')
  const [selections, setSelections] = useState<Selection[]>([])
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [validating, setValidating] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    api.game(controller.signal).then(setGame).catch((e) => {
      if (!controller.signal.aborted) setLoadError(e instanceof Error ? e.message : String(e))
    })
    return () => controller.abort()
  }, [loadAttempt])

  // Live validation: every change is re-checked by the backend (single source of rules).
  useEffect(() => {
    if (!game) return
    const id = ++requestId.current
    const controller = new AbortController()
    api.validate(selections, controller.signal)
      .then((r) => { if (id === requestId.current) setReport(r) })
      .catch((e) => {
        if (!controller.signal.aborted && id === requestId.current) {
          setValidationError(e instanceof Error ? e.message : 'Не удалось проверить сценарий')
        }
      })
      .finally(() => { if (!controller.signal.aborted && id === requestId.current) setValidating(false) })
    return () => controller.abort()
  }, [selections, game, validationAttempt])

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [step])

  const simulate = async (sel = selections) => {
    if (simulating) return
    setStep('decide')
    setSimulating(true)
    setSimError(null)
    try {
      const r = await api.calculate(sel)
      if (!r.valid || !r.scenario) {
        setSimError(r.issues.map((issue) => issue.message).join(' ') || 'Сценарий недопустим и не получает Score.')
        return
      }
      setResult(r)
      setStep('results')
    } catch (e) {
      setSimError(e instanceof Error ? e.message : 'Ошибка симуляции')
    } finally {
      setSimulating(false)
    }
  }

  const changeSelections = (next: Selection[]) => {
    if (simulating) return
    ++requestId.current
    setReport(null)
    setValidating(true)
    setValidationError(null)
    setSimError(null)
    setSelections(next)
    setResult(null)
  }

  const loadDemo = async (run: boolean) => {
    if (!game) return
    changeSelections(game.demo_scenario)
    if (run) await simulate(game.demo_scenario)
    else setStep('decide')
  }

  const restart = () => {
    changeSelections([])
    setStep('overview')
  }

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <div className="text-lg font-semibold">Не удалось подключиться к API</div>
          <div role="alert" className="mt-2 max-w-md text-sm text-muted">{loadError}</div>
          <Button className="mt-4" variant="primary" onClick={() => { setLoadError(null); setLoadAttempt((n) => n + 1) }}>Повторить подключение</Button>
        </div>
      </div>
    )
  }
  if (!game) {
    return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  }

  const canOpen = (s: Step) => s !== 'results' || !!result

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">Перейти к содержимому</a>
      <header className="sticky top-0 z-30 h-16 border-b border-line bg-page/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1600px] items-center gap-6 px-4 sm:px-6">
          <button type="button" disabled={simulating} aria-label="Аким на 5 часов — обзор города" onClick={() => setStep('overview')} className="flex shrink-0 items-center gap-3 text-left">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-white">5ч</span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold leading-tight">Аким на 5 часов</span>
              <span className="block text-[10px] font-semibold tracking-[0.18em] text-muted">ASTANA CITY SIMULATOR</span>
            </span>
          </button>
          <nav aria-label="Этапы симуляции" className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                disabled={!canOpen(s.id) || simulating}
                aria-label={s.label}
                aria-current={step === s.id ? 'step' : undefined}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  step === s.id ? 'bg-white/[0.08] text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <span className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${step === s.id ? 'bg-accent text-white' : 'bg-white/10'}`}>{i + 1}</span>
                <span className="hidden md:inline">{s.label}</span>
              </button>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-3 text-xs text-muted lg:flex">
            <span>Baseline <span className="font-semibold text-ink tabular-nums">{game.baseline.score.toFixed(2)}</span></span>
            {result?.scenario && (
              <span>Сценарий <span className="font-semibold text-accent-hover tabular-nums">{result.scenario.score.toFixed(2)}</span></span>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        {step === 'overview' && (
          <Overview game={game} onStart={() => setStep('decide')} onDemo={() => loadDemo(true)} />
        )}
        {step === 'decide' && (
          <>
            {simError && <div role="alert" className="mb-4 rounded-lg border border-crit/40 bg-crit/10 px-4 py-2 text-sm text-crit-ink">⚠ {simError}</div>}
            {validationError && (
              <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
                <span>{validationError} Доступность мер будет показана после проверки.</span>
                <Button disabled={validating} onClick={() => { setValidating(true); setValidationError(null); setValidationAttempt((n) => n + 1) }}>Повторить проверку</Button>
              </div>
            )}
            <DecisionCenter
              game={game}
              selections={selections}
              onChange={changeSelections}
              report={report}
              validating={validating}
              onSimulate={() => simulate()}
              simulating={simulating}
              onDemo={() => loadDemo(false)}
              onReset={() => changeSelections([])}
            />
          </>
        )}
        {step === 'results' && result && (
          <Results game={game} result={result} selections={selections} onEdit={() => setStep('decide')} onRestart={restart} />
        )}
      </main>

      <footer className="mx-auto max-w-[1600px] px-6 pb-10 pt-4 text-xs text-muted">
        Условная модель для хакатона. Расчёт — детерминированный движок (FastAPI); AI только интерпретирует результат.
      </footer>
    </div>
  )
}
