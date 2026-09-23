import { useEffect, useRef, useState } from 'react'
import { deltaTone, fmt, fmtDelta } from '../lib/format'
import { useI18n } from '../lib/i18n'

/** Крупный AQLS с анимацией изменения (п. 14.3). */
export function ScoreGauge({ value, before, label }: { value: number; before?: number; label?: string }) {
  const { t, lang } = useI18n()
  const scoreLabel = label ?? t('result.scoreLabel')
  const shown = useAnimatedNumber(value)
  const pct = Math.max(0, Math.min(100, shown))
  const delta = before === undefined ? null : value - before
  return (
    <div className="flex items-center gap-5">
      <div
        className="relative grid size-32 shrink-0 place-items-center rounded-full sm:size-36"
        style={{ background: `conic-gradient(var(--color-accent) ${pct * 3.6}deg, var(--color-accent-track) 0)` }}
        role="img"
        aria-label={t('result.scoreOf', { label: scoreLabel, value: fmt(value, lang) })}
      >
        <div className="grid size-[82%] place-items-center rounded-full bg-surface">
          <span className="font-mono text-4xl font-bold tabular-nums sm:text-5xl">{fmt(shown, lang)}</span>
        </div>
      </div>
      <div>
        <p className="kicker">{scoreLabel}</p>
        {before !== undefined && (
          <p className="mt-1 font-mono text-lg tabular-nums text-ink-2">
            {fmt(before, lang)} → {fmt(value, lang)}
          </p>
        )}
        {delta !== null && (
          <p className={`font-mono text-2xl font-bold tabular-nums ${deltaTone(delta)}`}>
            {fmtDelta(delta, lang)} <span className="text-sm font-normal">{t('result.points')}</span>
          </p>
        )}
        <p className="mt-1 text-xs text-muted">{t('result.scale')}</p>
      </div>
    </div>
  )
}

function useAnimatedNumber(target: number, ms = 900) {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const initial = from.current
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = initial + (target - initial) * eased
      setValue(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = target
    }
  }, [target, ms])
  return value
}
