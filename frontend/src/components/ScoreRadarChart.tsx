import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { METRICS } from '../data/baseline'
import { fmt } from '../lib/format'
import type { CityScores } from '../types/project'
import { useI18n } from '../lib/i18n'

export function ScoreRadarChart({ before, after, afterLabel }: { before: CityScores; after?: CityScores; afterLabel?: string }) {
  const { t, lang, metric, metricCompact } = useI18n()
  const data = METRICS.map((m) => ({ metric: metricCompact(m), before: before[m], after: after?.[m] }))
  return (
    <figure>
      <div className="h-64 sm:h-72" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--color-grid)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-ink-2)', fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name={t('result.before')} dataKey="before" stroke="var(--color-baseline-bar)" fill="var(--color-baseline-bar)" fillOpacity={0.35} isAnimationActive={false} />
            {after && (
              <Radar name={afterLabel ?? t('result.after')} dataKey="after" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.35} />
            )}
            {after && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-ink-2)' }} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {METRICS.map((m) => `${metric(m)}: ${fmt(before[m], lang)}${after ? ` → ${fmt(after[m], lang)}` : ''}`).join('; ')}
      </figcaption>
    </figure>
  )
}
