import { ArrowRight, Building2, TriangleAlert } from 'lucide-react'
import { BASELINE, CATEGORIES, CATEGORY_LABELS, CITY_PROBLEMS, METRIC_LABELS, METRICS, TOTAL_BUDGET } from '../data/baseline'
import { CATEGORY_ICONS } from '../data/categoryVisuals'
import { ScoreGauge } from '../components/ScoreGauge'
import { ScoreRadarChart } from '../components/ScoreRadarChart'
import { Button, DemoBadge, Kicker, Panel } from '../components/ui'
import { calculateAqls } from '../lib/calculateSimulation'
import { fmt } from '../lib/format'

export function StartPage({ onStart, hasDraft }: { onStart: () => void; hasDraft: boolean }) {
  return (
    <main id="main" className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:py-10">
      <header className="rise space-y-4">
        <p className="flex items-center gap-2 text-accent">
          <Building2 aria-hidden className="size-5" /> <span className="kicker !text-accent">QalaBalance · AI-симулятор</span>
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Аким на 5 часов</h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Вы получили {TOTAL_BUDGET} бюджетных единиц. Распределите их между пятью направлениями, выберите проекты и
          узнайте, как ваши решения повлияют на качество жизни виртуального города.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onStart}>
            {hasDraft ? 'Продолжить управление' : 'Начать управление'} <ArrowRight aria-hidden className="size-4" />
          </Button>
          <span className="text-sm text-muted">Без регистрации · около 3 минут</span>
        </div>
        <DemoBadge />
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="rise">
          <Kicker>Исходное состояние города</Kicker>
          <ScoreGauge value={calculateAqls(BASELINE)} label="Стартовый AQLS" />
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
            <ul className="space-y-2 text-sm">
              {METRICS.map((m) => (
                <li key={m}>
                  <div className="flex justify-between">
                    <span className="text-ink-2">{METRIC_LABELS[m]}</span>
                    <span className="font-mono font-semibold tabular-nums">{BASELINE[m]}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-accent-track" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${BASELINE[m]}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <ScoreRadarChart before={BASELINE} />
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="rise">
            <Kicker>Проблемы города</Kicker>
            <ul className="space-y-2 text-sm">
              {CITY_PROBLEMS.map((p) => (
                <li key={p} className="flex gap-2">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" /> {p}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="rise">
            <Kicker>Правила</Kicker>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
              <li>В каждом из пяти направлений выберите ровно один проект.</li>
              <li>Распределите ровно {TOTAL_BUDGET} единиц: на направление — от 5 до 40.</li>
              <li>Меньше 10 или больше 30 единиц на направление — штраф за перекос.</li>
              <li>Эффект растёт медленнее бюджета: переплата даёт не больше +15%.</li>
              <li>Смотрите результат через 1 год и через 3 года: проекты работают с разной скоростью.</li>
            </ol>
            <ul className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c]
                return (
                  <li key={c} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs">
                    <Icon aria-hidden className="size-3.5 text-accent" /> {CATEGORY_LABELS[c]}
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      </div>
      <p className="text-center text-xs text-muted">
        AQLS = Мобильность×0,25 + Экология×0,20 + Соц. комфорт×0,20 + Безопасность×0,20 + Сервисы×0,15 − штрафы · стартовое
        значение {fmt(calculateAqls(BASELINE))}
      </p>
    </main>
  )
}
