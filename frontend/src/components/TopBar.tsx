import { Settings as SettingsIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../lib/i18n'

export type NavTarget = 'start' | 'simulator' | 'result'

/** Плавающая стеклянная панель навигации в стиле городских порталов Астаны. */
export function TopBar({
  current,
  onNavigate,
  canOpenResult,
  onSettings,
  children,
}: {
  current: NavTarget
  onNavigate: (t: NavTarget) => void
  canOpenResult: boolean
  onSettings: () => void
  children?: ReactNode
}) {
  const { t } = useI18n()
  const items: { id: NavTarget; label: string; disabled?: boolean }[] = [
    { id: 'start', label: t('nav.home') },
    { id: 'simulator', label: t('nav.simulator') },
    { id: 'result', label: t('nav.result'), disabled: !canOpenResult },
  ]
  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
      <header className="glass mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-2.5 sm:px-4">
        <button onClick={() => onNavigate('start')} className="flex items-center gap-2.5 text-left" aria-label={t('nav.goHome')}>
          <Logo />
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-tight">QALA BALANCE</span>
            <span className="block text-[11px] font-medium text-muted">{t('brand.sub')}</span>
          </span>
        </button>
        <nav aria-label={t('nav.sections')} className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {items.map((it) => (
            <button
              key={it.id}
              disabled={it.disabled}
              aria-current={current === it.id ? 'page' : undefined}
              onClick={() => onNavigate(it.id)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                current === it.id ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2'
              }`}
            >
              {it.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {children}
          <button
            onClick={onSettings}
            data-tour="settings"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className="grid size-10 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2 transition hover:text-accent"
          >
            <SettingsIcon aria-hidden className="size-5" />
          </button>
        </div>
      </header>
    </div>
  )
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <defs>
        <linearGradient id="qb-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16f099" />
          <stop offset="1" stopColor="#00b86f" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="11" fill="url(#qb-logo)" />
      {/* силуэт города: три башни */}
      <path d="M9 26V16h4v10M15.5 26V10h5v16M23 26v-8h4v8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M7 26.5h22" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
