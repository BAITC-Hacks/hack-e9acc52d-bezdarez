import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Assistant } from './components/Assistant'
import { BudgetHeader } from './components/BudgetHeader'
import { PenaltiesModal } from './components/PenaltiesModal'
import { SettingsModal } from './components/SettingsModal'
import { TopBar } from './components/TopBar'
import { Tour } from './components/Tour'
import { Button } from './components/ui'
import { CATEGORIES } from './data/baseline'
import { balancedBudgets, type AdvisorAction } from './lib/advisor'
import { allocatedTotal, calculateSimulation, toDecisions, validateDecisions } from './lib/calculateSimulation'
import { useI18n } from './lib/i18n'
import { emptyDraft, loadDraft, saveDraft } from './lib/storage'
import { ResultPage } from './pages/ResultPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { StartPage } from './pages/StartPage'
import type { Category } from './types/project'
import type { DraftDecisions, SimulationResult } from './types/simulation'

type Screen = 'start' | 'simulator' | 'result'
const TOUR_KEY = 'qalabalance:tour:done'

function tourDone(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === '1'
  } catch {
    return true
  }
}

export default function App() {
  const { t } = useI18n()
  const [screen, setScreen] = useState<Screen>('start')
  const [draft, setDraft] = useState<DraftDecisions>(loadDraft)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>(() => CATEGORIES.find((c) => !draft[c].projectId) ?? 'transport')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [penaltiesOpen, setPenaltiesOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  useEffect(() => {
    saveDraft(draft)
  }, [draft])
  // Блочное тело обязательно: в новых браузерах scrollTo возвращает Promise, а React ждёт функцию очистки.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen])
  // Первый вход в симулятор — обучение запускается само; дальше только по кнопке.
  useEffect(() => {
    if (screen === 'simulator' && !tourDone()) {
      const id = window.setTimeout(() => setTourOpen(true), 500)
      return () => window.clearTimeout(id)
    }
  }, [screen])

  const closeTour = () => {
    setTourOpen(false)
    try {
      localStorage.setItem(TOUR_KEY, '1')
    } catch {
      /* ignore */
    }
  }
  const startTour = () => {
    setScreen('simulator')
    window.setTimeout(() => setTourOpen(true), 300)
  }

  const issues = validateDecisions(draft)
  const run = () => {
    if (issues.length > 0) return
    setResult(calculateSimulation(toDecisions(draft)))
    setScreen('result')
  }
  const reset = () => {
    setDraft(emptyDraft())
    setResult(null)
    setActiveCategory('transport')
    setScreen('start')
  }

  const onAdvisor = (a: AdvisorAction) => {
    if (screen !== 'simulator') setScreen('simulator')
    switch (a.type) {
      case 'goto':
        setActiveCategory(a.category)
        break
      case 'select':
        setDraft((d) => ({ ...d, [a.category]: { ...d[a.category], projectId: a.projectId } }))
        setActiveCategory(a.category)
        break
      case 'balance':
        setDraft((d) => balancedBudgets(d))
        break
      case 'run':
        run()
        break
    }
  }

  return (
    <>
      <a href="#main" className="skip-link">
        К основному содержимому
      </a>
      <TopBar current={screen} onNavigate={setScreen} canOpenResult={result !== null} onSettings={() => setSettingsOpen(true)}>
        {screen === 'simulator' && <BudgetHeader allocated={allocatedTotal(draft)} canRun={issues.length === 0} onRun={run} />}
        {screen === 'result' && (
          <Button variant="ghost" ariaLabel={t('nav.edit')} onClick={() => setScreen('simulator')}>
            <Pencil aria-hidden className="size-4" /> <span className="hidden sm:inline">{t('nav.edit')}</span>
          </Button>
        )}
        {screen === 'start' && <Button onClick={() => setScreen('simulator')}>{t('nav.start')}</Button>}
      </TopBar>

      {screen === 'start' && (
        <StartPage
          onStart={() => setScreen('simulator')}
          hasDraft={CATEGORIES.some((c) => draft[c].projectId !== null)}
          onPenalties={() => setPenaltiesOpen(true)}
        />
      )}
      {screen === 'simulator' && (
        <SimulatorPage
          draft={draft}
          onChange={setDraft}
          issues={issues}
          active={activeCategory}
          onActiveChange={setActiveCategory}
          onPenalties={() => setPenaltiesOpen(true)}
        />
      )}
      {screen === 'result' && result && (
        <ResultPage result={result} onEdit={() => setScreen('simulator')} onRestart={reset} onPenalties={() => setPenaltiesOpen(true)} />
      )}

      <Assistant draft={draft} onAction={onAdvisor} onStartTour={startTour} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onStartTour={startTour} onReset={reset} />
      <PenaltiesModal open={penaltiesOpen} onClose={() => setPenaltiesOpen(false)} draft={draft} />
      {tourOpen && <Tour open onClose={closeTour} />}
    </>
  )
}
