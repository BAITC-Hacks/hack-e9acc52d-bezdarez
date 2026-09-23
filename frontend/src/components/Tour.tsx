import { Bot } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { fmtTenge } from '../lib/format'
import { useI18n } from '../lib/i18n'

interface Step {
  target?: string
  title: string
  text: string
}

const STEPS: Step[] = [
  {
    title: 'Салем! Я AI-помощник QalaBalance',
    text: `За минуту покажу, как управлять городом. У вас 100 бюджетных единиц — это ${fmtTenge(100)}. Задача — поднять качество жизни (AQLS) и не уйти в перекос.`,
  },
  { target: 'categories', title: 'Пять сфер города', text: 'Транспорт, озеленение, социальная сфера, безопасность и сервисы. В каждой нужно выбрать ровно один проект — галочка появится, когда выбор сделан.' },
  { target: 'projects', title: 'Карточки проектов', text: 'На карточке — стоимость в тенге, эффекты по показателям (М, Э, С, Б, ГС), риски, скорость результата и расходы на обслуживание. Нажмите «Выбрать проект».' },
  { target: 'slider', title: 'Бюджет направления', text: 'Двигайте ползунок: от 5 до 40 ед. Эффект растёт как корень из бюджета, поэтому переплата почти не помогает, а меньше 10 или больше 30 ед. — штраф.' },
  { target: 'forecast', title: 'Живой прогноз', text: 'AQLS и радар пересчитываются мгновенно. Здесь же видно найденные синергии — бонусы за удачные пары проектов.' },
  { target: 'budget', title: 'Счётчик бюджета', text: 'Распределите ровно 100 ед. — тогда кнопка «Запустить симуляцию» станет активной.' },
  { target: 'assistant', title: 'Я всегда рядом', text: 'Нажмите на меня: подскажу синергии, выровняю бюджет одной кнопкой и отвечу на вопросы — например, «как снизить пробки?».' },
  { target: 'settings', title: 'Настройки', text: 'Тёмная тема, казахский язык и повтор этого обучения — в настройках. Удачи, аким!' },
]

/** Пошаговое обучение: затемнение с «окном» вокруг элемента и карточка помощника. Монтируется заново при каждом открытии. */
export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = STEPS[i]

  const measure = useCallback(() => {
    const el = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  useLayoutEffect(() => {
    if (!open) return
    const el = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const id = window.setTimeout(measure, 350)
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(id)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, i, measure, step])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((x) => Math.min(STEPS.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !step) return null
  const pad = 8
  const last = i === STEPS.length - 1

  // Карточка — под элементом, если есть место, иначе над ним; без цели — по центру.
  const cardW = Math.min(380, window.innerWidth - 24)
  let cardStyle: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  if (rect) {
    const below = rect.bottom + 16 + 230 < window.innerHeight
    const left = Math.max(12, Math.min(window.innerWidth - cardW - 12, rect.left + rect.width / 2 - cardW / 2))
    cardStyle = below ? { left, top: rect.bottom + 16 } : { left, top: Math.max(12, rect.top - 16 - 230) }
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-4 ring-mint transition-all duration-300"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(18, 17, 23, 0.62)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(18,17,23,0.62)]" />
      )}
      <div key={i} className="rise absolute rounded-3xl border border-line bg-surface p-5 text-ink shadow-2xl" style={{ width: cardW, ...cardStyle }}>
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-mint to-accent text-white">
            <Bot aria-hidden className="size-6" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('tour.step', { n: i + 1, total: STEPS.length })}</p>
            <h2 className="font-extrabold leading-tight">{step.title}</h2>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">{step.text}</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden>
            {STEPS.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-accent' : 'w-1.5 bg-grid'}`} />
            ))}
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-xs font-semibold text-muted hover:text-ink">
            {t('tour.skip')}
          </button>
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold">
              {t('tour.back')}
            </button>
          )}
          <button onClick={() => (last ? onClose() : setI(i + 1))} className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-hover">
            {last ? t('tour.done') : t('tour.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
