import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { METRICS } from '../data/baseline'
import { deltaTone, fmt, fmtDelta } from '../lib/format'
import type { CityScores } from '../types/project'
import { useI18n } from '../lib/i18n'

export function ResultComparison({ before, after }: { before: CityScores; after: CityScores }) {
  const { t, lang, metric, metricCompact } = useI18n()
  const data = METRICS.map((m) => ({ name: metricCompact(m), before: before[m], after: after[m] }))
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('result.tableCaption')}</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1.5 font-medium">{t('result.metric')}</th>
            <th className="py-1.5 text-right font-medium">{t('result.before')}</th>
            <th className="py-1.5 text-right font-medium">{t('result.after')}</th>
            <th className="py-1.5 text-right font-medium">{t('result.change')}</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {METRICS.map((m) => {
            const d = after[m] - before[m]
            const Icon = Math.round(d * 10) === 0 ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight
            return (
              <tr key={m} className="border-t border-line">
                <td className="py-2 font-sans">{metric(m)}</td>
                <td className="py-2 text-right text-ink-2">{fmt(before[m], lang)}</td>
                <td className="py-2 text-right font-semibold">{fmt(after[m], lang)}</td>
                <td className={`py-2 text-right font-semibold ${deltaTone(d)}`}>
                  <span className="inline-flex items-center gap-1">
                    <Icon aria-hidden className="size-4" />
                    {fmtDelta(d, lang)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="h-60" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-grid)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }} interval={0} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 12 }}
              labelStyle={{ color: 'var(--color-ink)' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              formatter={(value) => typeof value === 'number' ? fmt(value, lang) : value}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar name={t('result.before')} dataKey="before" fill="var(--color-baseline-bar)" radius={[4, 4, 0, 0]} />
            <Bar name={t('result.after')} dataKey="after" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
