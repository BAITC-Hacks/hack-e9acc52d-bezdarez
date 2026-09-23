import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { DEMO_DISCLAIMER } from '../data/baseline'

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel p-5 sm:p-6 ${className}`}>{children}</section>
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="kicker mb-2">{children}</p>
}

export function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <p
      role="note"
      className={`flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 text-warn ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm'
      }`}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{compact ? 'Демонстрационные данные — не официальная оценка Астаны' : DEMO_DISCLAIMER}</span>
    </p>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  type = 'button',
  title,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost'
  type?: 'button' | 'submit'
  title?: string
  ariaLabel?: string
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45'
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:bg-accent-hover'
      : 'bg-surface-2 text-ink hover:bg-lavender border border-line'
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} aria-label={ariaLabel} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}
