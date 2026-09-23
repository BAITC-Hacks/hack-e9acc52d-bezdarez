import { Bot, GraduationCap, Laptop, Moon, RotateCcw, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n, type Lang, type Theme } from '../lib/i18n'
import { Modal } from './Modal'

type Health = { llm?: { configured: boolean; model: string | null } }

export function SettingsModal({
  open,
  onClose,
  onStartTour,
  onReset,
}: {
  open: boolean
  onClose: () => void
  onStartTour: () => void
  onReset: () => void
}) {
  const { t, lang, theme, setLang, setTheme } = useI18n()
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    fetch('/api/health', { signal: ctrl.signal })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null))
    return () => ctrl.abort()
  }, [open])

  const themes: { id: Theme; label: string; Icon: typeof Sun }[] = [
    { id: 'light', label: t('settings.light'), Icon: Sun },
    { id: 'dark', label: t('settings.dark'), Icon: Moon },
    { id: 'system', label: t('settings.system'), Icon: Laptop },
  ]
  const langs: { id: Lang; label: string; flag: string }[] = [
    { id: 'ru', label: 'Русский', flag: 'RU' },
    { id: 'kk', label: 'Қазақша', flag: 'ҚАЗ' },
    { id: 'en', label: 'English', flag: 'EN' },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('settings.title')}>
      <div className="space-y-6">
        <section>
          <h3 className="kicker mb-2.5">{t('settings.theme')}</h3>
          <div role="radiogroup" aria-label={t('settings.theme')} className="grid grid-cols-3 gap-2">
            {themes.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="radio"
                aria-checked={theme === id}
                onClick={() => setTheme(id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
                  theme === id ? 'border-accent bg-accent-track text-good-ink' : 'border-line bg-surface-2 hover:border-accent/40'
                }`}
              >
                <Icon aria-hidden className="size-5" /> {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="kicker mb-2.5">{t('settings.language')}</h3>
          <div role="radiogroup" aria-label={t('settings.language')} className="grid gap-2 sm:grid-cols-3">
            {langs.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={lang === l.id}
                lang={l.id}
                onClick={() => setLang(l.id)}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  lang === l.id ? 'border-accent bg-accent-track text-good-ink' : 'border-line bg-surface-2 hover:border-accent/40'
                }`}
              >
                <span className="rounded-lg bg-surface px-2 py-1 text-[11px] font-extrabold tracking-wide">{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        </section>

        <section className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
          <Bot aria-hidden className={`size-6 shrink-0 ${health?.llm?.configured ? 'text-accent' : 'text-muted'}`} />
          <div className="flex-1">
            <h3 className="text-sm font-bold">{t('settings.api')}</h3>
            <p className="text-xs text-ink-2">
              {health?.llm?.configured ? t('settings.apiOn', { model: health.llm.model ?? '' }) : t('settings.apiOff')}
            </p>
          </div>
          <span className={`size-2.5 rounded-full ${health?.llm?.configured ? 'bg-accent' : 'bg-warn'}`} aria-hidden />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => {
              onClose()
              onStartTour()
            }}
            className="flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface-2 p-4 text-left transition hover:border-accent/40"
          >
            <GraduationCap aria-hidden className="size-6 text-accent" />
            <span className="text-sm font-bold">{t('settings.tourStart')}</span>
            <span className="text-xs text-muted">{t('settings.tourText')}</span>
          </button>
          <button
            onClick={() => {
              onReset()
              onClose()
            }}
            className="flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface-2 p-4 text-left transition hover:border-crit/40"
          >
            <RotateCcw aria-hidden className="size-6 text-crit-ink" />
            <span className="text-sm font-bold">{t('settings.reset')}</span>
            <span className="text-xs text-muted">{t('settings.resetText')}</span>
          </button>
        </section>
      </div>
    </Modal>
  )
}
