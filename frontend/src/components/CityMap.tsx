import { useState } from 'react'
import { fmt, heat, heatInk, signed } from '../lib/format'

/** Schematic (not geographic) layout of Astana's five districts around the Esil river. */
const SHAPES: Record<string, { points: string; label: [number, number] }> = {
  saryarka: { points: '14,14 188,14 198,112 210,168 118,172 14,170', label: [104, 92] },
  baikonur: { points: '194,14 330,14 338,106 328,152 216,166 204,112', label: [268, 86] },
  almaty: { points: '336,14 506,14 506,150 420,146 334,154 344,106', label: [424, 84] },
  nura: { points: '14,204 222,200 258,258 292,326 14,326', label: [124, 262] },
  esil: { points: '232,198 506,182 506,326 302,326 266,256', label: [396, 258] },
}

const RIVER = 'M0,186 C80,176 140,196 222,184 S360,152 520,166'

export interface MapDatum {
  id: string
  name: string
  value: number
  delta?: number
  badge?: string
}

export function CityMap({ data, highlight, onSelect, lo = 45, hi = 68, caption }: {
  data: MapDatum[]
  highlight?: string | null
  onSelect?: (id: string) => void
  lo?: number
  hi?: number
  caption?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const active = hover ?? highlight ?? selected
  const hovered = data.find((d) => d.id === (hover ?? selected))
  const select = (id: string) => { setSelected(id); onSelect?.(id) }

  return (
    <figure className="relative">
      <svg viewBox="0 0 520 340" className="w-full" role="group" aria-label="Интерактивная схема районов города. Выберите район.">
        <rect x="0" y="0" width="520" height="340" rx="14" className="fill-page" />
        {data.map((d) => {
          const shape = SHAPES[d.id]
          if (!shape) return null
          const isActive = active === d.id
          return (
            <g
              key={d.id}
              onMouseEnter={() => setHover(d.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d.id)}
              onBlur={() => setHover(null)}
              onClick={() => select(d.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(d.id) }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${d.name}: оценка ${fmt(d.value)}${d.delta !== undefined ? `, изменение ${signed(d.delta)}` : ''}`}
              aria-pressed={(highlight ?? selected) === d.id}
              className="map-district cursor-pointer"
            >
              <polygon
                points={shape.points}
                fill={heat(d.value, lo, hi)}
                stroke={isActive ? '#ffffff' : '#0d0d0d'}
                strokeWidth={isActive ? 2.5 : 3}
                strokeLinejoin="round"
                style={{ transition: 'fill 400ms' }}
              />
              <text x={shape.label[0]} y={shape.label[1]} textAnchor="middle" fill={heatInk(d.value, lo, hi)}
                className="pointer-events-none text-[15px] font-semibold">{d.name}</text>
              <text x={shape.label[0]} y={shape.label[1] + 22} textAnchor="middle" fill={heatInk(d.value, lo, hi)}
                className="pointer-events-none text-[18px] font-bold">{fmt(d.value)}</text>
              {d.delta !== undefined && Math.abs(d.delta) > 0.004 && (
                <text x={shape.label[0]} y={shape.label[1] + 40} textAnchor="middle" fill={heatInk(d.value, lo, hi)}
                  className="pointer-events-none text-[12px] font-medium" opacity={0.9}>{signed(d.delta)}</text>
              )}
              {d.badge && (
                <g className="pointer-events-none">
                  <circle cx={shape.label[0] + 52} cy={shape.label[1] - 20} r={11} fill="#ffffff" stroke="#0d0d0d" strokeWidth={2} />
                  <text x={shape.label[0] + 52} y={shape.label[1] - 16} textAnchor="middle" className="fill-[#0b0b0b] text-[11px] font-bold">{d.badge}</text>
                </g>
              )}
            </g>
          )
        })}
        <path d={RIVER} fill="none" stroke="#1c3a5c" strokeWidth={14} strokeLinecap="round" className="pointer-events-none" />
        <path d={RIVER} fill="none" stroke="#2a5a8c" strokeWidth={2} strokeLinecap="round" className="pointer-events-none" opacity={0.7} />
        <text x={470} y={178} className="fill-muted text-[10px] tracking-[0.2em]">ЕСИЛЬ ~</text>
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-line bg-surface-2/95 px-3 py-2 text-xs shadow-xl">
          <div className="font-semibold text-ink">{hovered.name}</div>
          <div className="text-ink-2">Оценка района: <span className="tabular-nums text-ink">{fmt(hovered.value)}</span>
            {hovered.delta !== undefined && <span className="ml-1 tabular-nums">({signed(hovered.delta)})</span>}
          </div>
        </div>
      )}
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted">
        <span>{caption ?? 'Схема, не в масштабе · цвет = оценка района D_d'}</span>
        <span className="flex items-center gap-1.5">
          {fmt(lo, 0)}
          <span className="h-1.5 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(lo, lo, hi)}, ${heat((lo + hi) / 2, lo, hi)}, ${heat(hi, lo, hi)})` }} />
          {fmt(hi, 0)}
        </span>
      </figcaption>
    </figure>
  )
}
