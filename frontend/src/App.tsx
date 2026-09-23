import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BudgetHeader } from './components/BudgetHeader'
import { TopBar } from './components/TopBar'
import { Button } from './components/ui'
import { CATEGORIES } from './data/baseline'
import { allocatedTotal, calculateSimulation, toDecisions, validateDecisions } from './lib/calculateSimulation'
import { emptyDraft, loadDraft, saveDraft } from './lib/storage'
import { ResultPage } from './pages/ResultPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { StartPage } from './pages/StartPage'
import type { DraftDecisions, SimulationResult } from './types/simulation'

type Screen = 'start' | 'simulator' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [draft, setDraft] = useState<DraftDecisions>(loadDraft)
  const [result, setResult] = useState<SimulationResult | null>(null)

  useEffect(() => {
    saveDraft(draft)
  }, [draft])
  // Блочное тело обязательно: в новых браузерах scrollTo возвращает Promise, а React ждёт функцию очистки.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen])

  const issues = validateDecisions(draft)
  const run = () => {
    if (issues.length > 0) return
    setResult(calculateSimulation(toDecisions(draft)))
    setScreen('result')
  }

  return (
    <>
      <a href="#main" className="skip-link">
        К основному содержимому
      </a>
      <TopBar current={screen} onNavigate={setScreen} canOpenResult={result !== null}>
        {screen === 'simulator' && <BudgetHeader allocated={allocatedTotal(draft)} canRun={issues.length === 0} onRun={run} />}
        {screen === 'result' && (
          <Button variant="ghost" ariaLabel="Изменить решения" onClick={() => setScreen('simulator')}>
            <Pencil aria-hidden className="size-4" /> <span className="hidden sm:inline">Изменить решения</span>
          </Button>
        )}
        {screen === 'start' && (
          <Button onClick={() => setScreen('simulator')}>Начать управление</Button>
        )}
      </TopBar>
      {screen === 'start' && (
        <StartPage
          onStart={() => setScreen('simulator')}
          hasDraft={CATEGORIES.some((c) => draft[c].projectId !== null)}
        />
      )}
      {screen === 'simulator' && <SimulatorPage draft={draft} onChange={setDraft} issues={issues} />}
      {screen === 'result' && result && (
        <ResultPage
          result={result}
          onEdit={() => setScreen('simulator')}
          onRestart={() => {
            setDraft(emptyDraft())
            setResult(null)
            setScreen('start')
          }}
        />
      )}
    </>
  )
}
