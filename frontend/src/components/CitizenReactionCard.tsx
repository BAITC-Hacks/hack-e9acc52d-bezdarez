import { Briefcase, Bus, Home, School } from 'lucide-react'
import type { CitizenReaction } from '../types/ai'

const ICONS = [Bus, School, Briefcase, Home]

export function CitizenReactionCard({ reaction, index }: { reaction: CitizenReaction; index: number }) {
  const Icon = ICONS[index % ICONS.length]
  return (
    <figure className="rise rounded-2xl bg-surface-2 p-4" style={{ animationDelay: `${index * 80}ms` }}>
      <figcaption className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-2">
        <Icon aria-hidden className="size-4 text-accent" /> {reaction.persona}
      </figcaption>
      <blockquote className="text-sm leading-relaxed">«{reaction.text}»</blockquote>
    </figure>
  )
}
