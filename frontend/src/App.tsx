import { useEffect, useState } from 'react'
import { CATEGORIES } from './data/baseline'
import { calculateSimulation, toDecisions, validateDecisions } from './lib/calculateSimulation'
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

  useEffect(() => saveDraft(draft), [draft])
  useEffect(() => window.scrollTo({ top: 0 }), [screen])

  const run = () => {
    if (validateDecisions(draft).length > 0) return
    setResult(calculateSimulation(toDecisions(draft)))
    setScreen('result')
  }

  return (
    <>
      <a href="#main" className="skip-link">
        К основному содержимому
      </a>
      {screen === 'start' && (
        <StartPage
          onStart={() => setScreen('simulator')}
          hasDraft={CATEGORIES.some((c) => draft[c].projectId !== null)}
        />
      )}
      {screen === 'simulator' && (
        <SimulatorPage draft={draft} onChange={setDraft} onRun={run} onHome={() => setScreen('start')} />
      )}
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
