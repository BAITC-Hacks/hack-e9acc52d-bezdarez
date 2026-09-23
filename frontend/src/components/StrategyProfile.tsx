import { Compass } from 'lucide-react'
import type { StrategyProfile as Profile } from '../types/simulation'
import { useI18n } from '../lib/i18n'

export function StrategyProfile({ profile }: { profile: Profile }) {
  const { t, profile: tr } = useI18n()
  const text = tr(profile.id, profile)
  return (
    <div className="flex gap-3">
      <Compass aria-hidden className="mt-1 size-8 shrink-0 text-accent" />
      <div>
        <p className="kicker">{t('result.yourProfile')}</p>
        <p className="text-xl font-bold">{text.title}</p>
        <p className="mt-1 text-sm text-ink-2">{text.description}</p>
        <p className="mt-2 text-xs text-muted">{t('result.profileNote')}</p>
      </div>
    </div>
  )
}
