import { AlertTriangle, MapPin, MousePointer2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { BASELINE, METRICS } from '../data/baseline'
import { MAP_COPY } from '../data/locales/map'
import { DISTRICT_SHAPES, MAP_HEIGHT, MAP_WIDTH, RIVERS } from '../data/astanaMap'
import type { DistrictId } from '../data/districts'
import { projectDistricts } from '../lib/districtProjection'
import { deltaTone, fmt, fmtDelta } from '../lib/format'
import type { CityScores, Metric } from '../types/project'
import { useI18n } from '../lib/i18n'
import { localizeDistrict } from '../lib/localizedContent'
import { DGisMap } from './DGisMap'

type Layer = 'index' | Metric

/** Цвет от красного (хуже) через жёлтый к зелёному (лучше) на шкале [lo, hi]. */
function heat(v: number, lo = 40, hi = 80): string {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
  const hue = 8 + t * 142
  // MapGL accepts hexadecimal colors; keep the existing HSL palette exactly.
  const lightness = (58 - t * 12) / 100
  const amplitude = 0.72 * Math.min(lightness, 1 - lightness)
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    return Math.round(255 * (lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/**
 * Карта Астаны по районам. Без cityAfter — исходное состояние,
 * с cityAfter — проекция результата симуляции и изменения по районам.
 */
export function CityMap({ cityAfter, title }: { cityAfter?: CityScores; title?: string }) {
  const { t, metric, lang } = useI18n()
  const copy = MAP_COPY[lang]
  const rows = useMemo(() => projectDistricts(cityAfter).map((row) => ({ ...row, district: localizeDistrict(row.district, lang) })), [cityAfter, lang])
  const [layer, setLayer] = useState<Layer>('index')
  const [hovered, setHovered] = useState<DistrictId | null>(null)
  const [pinned, setPinned] = useState<DistrictId>('esil')
  const hasDGis = Boolean(import.meta.env.VITE_DGIS_API_KEY?.trim())
  const [mapMode, setMapMode] = useState<'live' | 'schema'>(() => hasDGis ? 'live' : 'schema')
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const handleMapUnavailable = useCallback(() => {
    setMapUnavailable(true)
    setMapMode('schema')
    setHovered(null)
  }, [])
  const activeId = hovered ?? pinned
  const active = rows.find((r) => r.district.id === activeId)!
  const showAfter = Boolean(cityAfter)

  const valueOf = (r: (typeof rows)[number], after = showAfter) =>
    layer === 'index' ? (after ? r.indexAfter : r.indexBefore) : (after ? r.after : r.before)[layer]
  // Шкала подстраивается под разброс слоя, чтобы различия между районами были видны.
  const values = rows.map((r) => valueOf(r))
  const lo = Math.floor(Math.min(...values)) - 2
  const hi = Math.max(lo + 8, Math.ceil(Math.max(...values)) + 2)
  const color = (v: number) => heat(v, lo, hi)
  const mapDistricts = useMemo(() => rows.map((r) => {
    const value = layer === 'index' ? (showAfter ? r.indexAfter : r.indexBefore) : (showAfter ? r.after : r.before)[layer]
    return { id: r.district.id, name: r.district.short, value: fmt(value, lang), color: heat(value, lo, hi) }
  }), [rows, layer, showAfter, lo, hi, lang])

  return (
    <section className="panel rise overflow-hidden" aria-labelledby="map-title">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <h2 id="map-title" className="flex items-center gap-2 text-xl font-extrabold">
            <MapPin aria-hidden className="size-5 text-accent" /> {title ?? t('map.title')}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <MousePointer2 aria-hidden className="size-3.5" /> {t('map.hint')}
          </p>
        </div>
        <div role="radiogroup" aria-label={copy.layer} className="flex flex-wrap gap-1.5">
          {(['index', ...METRICS] as Layer[]).map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={layer === l}
              onClick={() => setLayer(l)}
              className={`pill transition ${layer === l ? 'bg-ink text-page' : 'bg-surface-2 text-ink-2 hover:bg-lavender'}`}
            >
              {l === 'index' ? t('map.index') : metric(l)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative min-w-0 rounded-3xl bg-linear-to-br from-surface-2 to-lavender p-3">
          {hasDGis && <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted">{mapMode === 'live' ? copy.city : copy.schemaTitle}</span>
            <div className="flex gap-1" role="group" aria-label={copy.view}>
              <button type="button" aria-pressed={mapMode === 'live'} onClick={() => { setMapUnavailable(false); setMapMode('live') }} className={`pill ${mapMode === 'live' ? 'bg-ink text-page' : 'bg-surface text-ink'}`}>{copy.brand}</button>
              <button type="button" aria-pressed={mapMode === 'schema'} onClick={() => { setHovered(null); setMapMode('schema') }} className={`pill ${mapMode === 'schema' ? 'bg-ink text-page' : 'bg-surface text-ink'}`}>{copy.schema}</button>
            </div>
          </div>}
          {mapUnavailable && <p role="status" className="mb-3 rounded-xl bg-surface px-3 py-2 text-xs text-muted">{copy.unavailable}</p>}
          {mapMode === 'live' ? <DGisMap districts={mapDistricts} activeId={activeId} onSelect={setPinned} onHover={setHovered} onUnavailable={handleMapUnavailable} /> : (
          <svg viewBox={`-20 -20 ${MAP_WIDTH + 40} ${MAP_HEIGHT + 40}`} className="mx-auto block max-h-[560px] w-full" aria-label={t('map.title')}>
            <defs>
              <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#302a36" floodOpacity="0.28" />
              </filter>
            </defs>
            {/* активный район рисуется последним, чтобы его тень и обводка были поверх соседей */}
            {[...rows.filter((r) => r.district.id !== activeId), active].map((r) => {
              const id = r.district.id
              const isActive = id === activeId
              return (
                <path
                  key={id}
                  d={DISTRICT_SHAPES[id].d}
                  fill={color(valueOf(r))}
                  fillRule="evenodd"
                  stroke="var(--color-surface)"
                  strokeWidth={isActive ? 7 : 4}
                  strokeLinejoin="round"
                  tabIndex={0}
                  role="button"
                  aria-label={`${r.district.name}: ${layer === 'index' ? t('map.index') : metric(layer)} ${fmt(valueOf(r), lang)}`}
                  aria-pressed={pinned === id}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setPinned(id)}
                  filter={isActive ? 'url(#lift)' : undefined}
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transform: isActive ? 'translateY(-6px) scale(1.035)' : 'none',
                    opacity: activeId && !isActive ? 0.72 : 1,
                    transition: 'transform 260ms cubic-bezier(.2,.7,.2,1), opacity 200ms, fill 400ms',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                />
              )
            })}
            {RIVERS.map((rv, i) => (
              <path key={i} d={rv.d} fill="none" stroke="#5aa9e6" strokeWidth={rv.main ? 9 : 4} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} pointerEvents="none" />
            ))}
            {rows.map((r) => {
              const s = DISTRICT_SHAPES[r.district.id]
              const isActive = r.district.id === activeId
              return (
                <g key={r.district.id} pointerEvents="none" style={{ transition: 'opacity 200ms' }} opacity={activeId && !isActive ? 0.8 : 1}>
                  <text x={s.cx} y={s.cy - 8} textAnchor="middle" fontSize={isActive ? 40 : 34} fontWeight={800} className="map-label" strokeWidth={8} paintOrder="stroke">
                    {r.district.short}
                  </text>
                  <text x={s.cx} y={s.cy + 34} textAnchor="middle" fontSize={32} fontWeight={700} className="map-label" strokeWidth={7} paintOrder="stroke">
                    {fmt(valueOf(r), lang)}
                  </text>
                </g>
              )
            })}
            <text x={MAP_WIDTH / 2 + 70} y={MAP_HEIGHT * 0.575} fontSize={24} fontStyle="italic" fill="#2f7fc1" stroke="var(--color-surface)" strokeWidth={5} paintOrder="stroke" pointerEvents="none">
              {t('map.river')}
            </text>
          </svg>
          )}
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-muted" aria-hidden>
            <span>{lo}</span>
            <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${color(lo)}, ${color((lo + hi) / 2)}, ${color(hi)})` }} />
            <span>{hi}</span>
            <span className="ml-1">· {(layer === 'index' ? t('map.index') : metric(layer)).toLowerCase()}</span>
          </div>
        </div>

        <DistrictCard key={activeId} row={active} showAfter={showAfter} />
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-5 sm:px-6 sm:pb-6" role="tablist" aria-label={copy.districts}>
        {rows.map((r) => (
          <button
            key={r.district.id}
            role="tab"
            aria-selected={r.district.id === activeId}
            onClick={() => setPinned(r.district.id)}
            onMouseEnter={() => setHovered(r.district.id)}
            onMouseLeave={() => setHovered(null)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${
              r.district.id === activeId ? 'border-accent bg-accent-track' : 'border-line bg-surface hover:border-accent/40'
            }`}
          >
            <span className="size-3 rounded-full" style={{ background: color(valueOf(r)) }} aria-hidden />
            <span className="font-semibold">{r.district.name}</span>
            <span className="font-bold tabular-nums text-ink-2">{fmt(valueOf(r), lang)}</span>
          </button>
        ))}
      </div>
      <p className="border-t border-line px-5 py-3 text-[11px] text-muted sm:px-6">
        {t('map.note')}
        {mapMode === 'live' && copy.contours}
        {showAfter && t('map.noteAfter')}
      </p>
    </section>
  )
}

function DistrictCard({
  row,
  showAfter,
}: {
  row: ReturnType<typeof projectDistricts>[number]
  showAfter: boolean
}) {
  const { t, metric, lang } = useI18n()
  const { district, before, after, indexBefore, indexAfter } = row
  const scores = showAfter ? after : before
  return (
    <article className="rise flex min-w-0 flex-col rounded-3xl border border-line bg-surface p-5" aria-live="polite">
      <p className="kicker">{t('map.district')}</p>
      <h3 className="text-2xl font-extrabold leading-tight">{district.name}</h3>
      <p className="mt-1 text-sm text-ink-2">{district.profile}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <span className="text-5xl font-black tabular-nums" style={{ color: heat(showAfter ? indexAfter : indexBefore) }}>
          {fmt(showAfter ? indexAfter : indexBefore, lang)}
        </span>
        <span className="pb-1.5 text-sm text-muted">
          {t('map.districtIndex')}
          {showAfter && (
            <span className={`ml-2 font-bold ${deltaTone(indexAfter - indexBefore)}`}>
              {fmt(indexBefore, lang)} → {fmt(indexAfter, lang)} ({fmtDelta(indexAfter - indexBefore, lang)})
            </span>
          )}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {METRICS.map((m, i) => {
          const v = scores[m]
          const vsCity = before[m] - BASELINE[m]
          return (
            <li key={m} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 text-ink-2">{metric(m)}</span>
                <span className="shrink-0 font-bold tabular-nums">
                  {fmt(v, lang)}
                  {showAfter ? (
                    <span className={`ml-1.5 text-xs ${deltaTone(after[m] - before[m])}`}>{fmtDelta(after[m] - before[m], lang)}</span>
                  ) : (
                    <span className={`ml-1.5 text-xs ${deltaTone(vsCity)}`} title={MAP_COPY[lang].relative}>
                      {vsCity === 0 ? t('map.eqCity') : `${fmtDelta(vsCity, lang)} ${t('map.vsCity')}`}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${v}%`, background: heat(v) }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <h4 className="mt-5 text-sm font-bold">{t('map.problems')}</h4>
      <ul className="mt-2 space-y-1.5 text-sm">
        {district.problems.map((p) => (
          <li key={p} className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-serious" /> {p}
          </li>
        ))}
      </ul>
    </article>
  )
}
