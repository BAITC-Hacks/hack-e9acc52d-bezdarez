import { Compass } from 'lucide-react'
import type { StrategyProfile as Profile } from '../types/simulation'

export function StrategyProfile({ profile }: { profile: Profile }) {
  return (
    <div className="flex gap-3">
      <Compass aria-hidden className="mt-1 size-8 shrink-0 text-accent" />
      <div>
        <p className="kicker">Ваш профиль</p>
        <p className="text-xl font-bold">{profile.title}</p>
        <p className="mt-1 text-sm text-ink-2">{profile.description}</p>
        <p className="mt-2 text-xs text-muted">Определён алгоритмом по распределению бюджета, а не языковой моделью.</p>
      </div>
    </div>
  )
}
