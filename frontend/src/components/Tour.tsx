import { Bot } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getTourSteps } from '../data/locales/tour'
import { useI18n } from '../lib/i18n'

/** Пошаговое обучение: затемнение с «окном» вокруг элемента и карточка помощника. Монтируется заново при каждом открытии. */
export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n()
  const steps = useMemo(() => getTourSteps(lang), [lang])
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(260)
  const step = steps[i]

  const measure = useCallback(() => {
    const el = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null
    setRect(el ? el.getBoundingClientRect() : null)
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight)
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
      if (e.key === 'ArrowRight') setI((x) => Math.min(steps.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, steps.length])

  if (!open || !step) return null
  const pad = 8
  const last = i === steps.length - 1

  // Карточка — под элементом, если есть место, иначе над ним; без цели — по центру.
  const cardW = Math.min(380, window.innerWidth - 24)
  let cardStyle: React.CSSProperties = { left: (window.innerWidth - cardW) / 2, top: Math.max(12, (window.innerHeight - cardHeight) / 2) }
  if (rect) {
    const below = rect.bottom + 16 + cardHeight < window.innerHeight - 12
    const left = Math.max(12, Math.min(window.innerWidth - cardW - 12, rect.left + rect.width / 2 - cardW / 2))
    const desiredTop = below ? rect.bottom + 16 : rect.top - 16 - cardHeight
    cardStyle = { left, top: Math.max(12, Math.min(window.innerHeight - cardHeight - 12, desiredTop)) }
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
      <div key={i} ref={cardRef} className="rise absolute max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-line bg-surface p-5 text-ink shadow-2xl" style={{ width: cardW, ...cardStyle }}>
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-mint to-accent text-white">
            <Bot aria-hidden className="size-6" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{t('tour.step', { n: i + 1, total: steps.length })}</p>
            <h2 className="font-extrabold leading-tight">{step.title}</h2>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">{step.text}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex w-full gap-1 sm:w-auto sm:flex-1" aria-hidden>
            {steps.map((_, k) => (
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
