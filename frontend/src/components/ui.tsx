import type { ReactNode } from 'react'
import type { Tone } from '../lib/format'

export function Panel({ title, kicker, right, children, className = '' }: {
  title?: ReactNode
  kicker?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel min-w-0 rounded-2xl p-4 sm:p-5 ${className}`}>
      {(title || kicker || right) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {kicker && <div className="kicker">{kicker}</div>}
            {title && <h2 className="mt-1 text-base font-semibold text-ink">{title}</h2>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

const TONE_CLASS: Record<Tone, string> = {
  good: 'text-good border-good/40 bg-good/10',
  warn: 'text-warn border-warn/40 bg-warn/10',
  crit: 'text-crit-ink border-crit/50 bg-crit/15',
  neutral: 'text-ink-2 border-line bg-white/[0.03]',
}

const TONE_ICON: Record<Tone, string> = { good: '✓', warn: '!', crit: '⚠', neutral: '•' }

/** Status is never colour-only: every badge carries an icon and a label. */
export function StatusBadge({ tone, children, icon = true }: { tone: Tone; children: ReactNode; icon?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {icon && <span aria-hidden>{TONE_ICON[tone]}</span>}
      {children}
    </span>
  )
}

/** Meter: fill carries severity; the track is a darker step of the same ramp. */
export function Meter({ value, max = 100, tone = 'neutral', className = '' }: {
  value: number
  max?: number
  tone?: Tone
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const fill = tone === 'crit' ? 'bg-crit' : tone === 'warn' ? 'bg-warn' : tone === 'good' ? 'bg-good' : 'bg-accent'
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-accent-track ${className}`}>
      <div className={`h-full rounded-full ${fill} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] font-semibold tracking-wide text-ink-2">{children}</span>
}

export function Button({ children, onClick, variant = 'ghost', disabled, className = '', title }: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'quiet'
  disabled?: boolean
  className?: string
  title?: string
}) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-hover disabled:bg-white/10 disabled:text-muted',
    ghost: 'border border-line bg-white/[0.03] text-ink hover:bg-white/[0.07] disabled:text-muted',
    quiet: 'text-ink-2 hover:text-ink disabled:text-muted',
  }[variant]
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed sm:px-4 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Spinner() {
  return <span role="status" className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-accent"><span className="sr-only">Загрузка</span></span>
}
