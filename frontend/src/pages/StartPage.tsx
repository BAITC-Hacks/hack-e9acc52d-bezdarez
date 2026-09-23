import { ArrowRight, TriangleAlert } from 'lucide-react'
import { CityMap } from '../components/CityMap'
import { Ornament } from '../components/Ornament'
import { ScoreGauge } from '../components/ScoreGauge'
import { ScoreRadarChart } from '../components/ScoreRadarChart'
import { DemoBadge, Kicker, Panel } from '../components/ui'
import { BASELINE, CATEGORIES, CATEGORY_LABELS, CITY_PROBLEMS, METRIC_LABELS, METRICS, TOTAL_BUDGET } from '../data/baseline'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../data/categoryVisuals'
import { PROJECTS } from '../data/projects'
import { calculateAqls } from '../lib/calculateSimulation'
import { fmt, fmtTenge } from '../lib/format'

export function StartPage({ onStart, hasDraft }: { onStart: () => void; hasDraft: boolean }) {
  return (
    <main id="main" className="mx-auto max-w-[1500px] space-y-6 px-3 py-5 sm:px-6">
      <section className="hero rise px-6 py-12 sm:px-12 sm:py-16">
        <Ornament color="#16f099" size={180} className="float absolute -left-10 -top-12 opacity-80" />
        <Ornament color="#b3a8ff" size={150} className="float absolute -bottom-10 right-6 opacity-70 [animation-delay:-3s]" />
        <Ornament color="#ff9eb1" size={70} className="float absolute right-[28%] top-6 opacity-70 [animation-delay:-5s]" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="pill border border-white/30 bg-white/15 text-white backdrop-blur">AI-симулятор городского бюджета</span>
          <h1 className="mt-5 text-4xl font-black uppercase leading-none tracking-tight sm:text-7xl">Аким на 5 часов</h1>
          <p className="mt-5 text-base font-medium text-white/85 sm:text-lg">
            Вы получили{' '}
            <span className="pill bg-white px-3 py-1 text-base font-bold text-accent">
              {TOTAL_BUDGET} бюджетных единиц · {fmtTenge(TOTAL_BUDGET)}
            </span>{' '}
            Распределите их между пятью направлениями, выберите проекты и узнайте, как ваши решения повлияют на качество
            жизни виртуального города.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-bold text-ink shadow-lg transition hover:-translate-y-0.5"
            >
              {hasDraft ? 'Продолжить управление' : 'Начать управление'} <ArrowRight aria-hidden className="size-5 text-accent" />
            </button>
            <span className="text-sm text-white/75">Без регистрации · около 3 минут</span>
          </div>
        </div>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIES.map((c, i) => {
          const Icon = CATEGORY_ICONS[c]
          const count = PROJECTS.filter((p) => p.category === c).length
          return (
            <li key={c} className="panel rise flex items-center gap-3 p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${CATEGORY_COLORS[c]}1f` }}>
                <Icon aria-hidden className="size-6" style={{ color: CATEGORY_COLORS[c] }} />
              </span>
              <span>
                <span className="block font-semibold leading-tight">{CATEGORY_LABELS[c]}</span>
                <span className="text-xs text-muted">{count} проекта на выбор</span>
              </span>
            </li>
          )
        })}
      </ul>

      <CityMap />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Panel className="rise">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Исходное состояние города</h2>
            <span className="pill bg-surface-2 text-ink-2">до ваших решений</span>
          </div>
          <ScoreGauge value={calculateAqls(BASELINE)} label="Стартовый AQLS" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <ul className="space-y-3 text-sm">
              {METRICS.map((m) => (
                <li key={m}>
                  <div className="flex justify-between font-medium">
                    <span className="text-ink-2">{METRIC_LABELS[m]}</span>
                    <span className="font-bold tabular-nums">{BASELINE[m]}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-surface-2" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${BASELINE[m]}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <ScoreRadarChart before={BASELINE} />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="rise">
            <h2 className="mb-3 text-xl font-bold">Проблемы города</h2>
            <ul className="space-y-2 text-sm">
              {CITY_PROBLEMS.map((p) => (
                <li key={p} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                  <TriangleAlert aria-hidden className="size-4 shrink-0 text-serious" /> {p}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="rise">
            <Kicker>Правила</Kicker>
            <ol className="space-y-2 text-sm text-ink-2">
              {[
                'В каждом из пяти направлений выберите ровно один проект.',
                `Распределите ровно ${TOTAL_BUDGET} единиц (${fmtTenge(TOTAL_BUDGET)}, 1 ед. = ${fmtTenge(1)}): на направление — от 5 до 40.`,
                'Меньше 10 или больше 30 единиц на направление — штраф за перекос.',
                'Эффект растёт медленнее бюджета: переплата даёт не больше +15%.',
                'Сравните результат через 1 год и через 3 года.',
              ].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-track text-xs font-bold text-good-ink">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
      <DemoBadge />
      <p className="pb-4 text-center text-xs text-muted">
        AQLS = Мобильность×0,25 + Экология×0,20 + Соц. комфорт×0,20 + Безопасность×0,20 + Сервисы×0,15 − штрафы · стартовое
        значение {fmt(calculateAqls(BASELINE))}
      </p>
    </main>
  )
}
