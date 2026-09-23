import { DISTRICT_SHAPES } from './astanaMap'
import { DISTRICTS } from './districts'
import type { DistrictId } from './districts'

/**
 * Registration of the existing simplified OSM snapshot, not new administrative boundaries.
 * Anchor bounds: OSM relations 3486954 (Saryarka), 20593940 (Nura), 3479876 (Esil).
 * The original SVG is equirectangular; integer rounding and simplification imply an
 * approximate overlay (tens of metres), unsuitable for address/boundary decisions.
 */
export function districtMapPoint(x: number, y: number): [number, number] {
  return [
    71.2373028 + (x - 50) * ((71.4464047 - 71.2373028) / (461 - 50)),
    51.246318 - (y - 194) * ((51.246318 - 50.9306941) / (1182 - 194)),
  ]
}

export const DISTRICT_GEO = Object.fromEntries(DISTRICTS.map(({ id }) => {
  const shape = DISTRICT_SHAPES[id]
  const ring = [...shape.d.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)]
    .map((match) => districtMapPoint(Number(match[1]), Number(match[2])))
  if (ring.length && (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1])) ring.push([...ring[0]])
  return [id, { coordinates: [ring], center: districtMapPoint(shape.cx, shape.cy) }]
})) as Record<DistrictId, { coordinates: [number, number][][]; center: [number, number] }>

const points = Object.values(DISTRICT_GEO).flatMap((district) => district.coordinates[0])
export const DISTRICT_MAP_BOUNDS = {
  southWest: [Math.min(...points.map(([lng]) => lng)), Math.min(...points.map(([, lat]) => lat))],
  northEast: [Math.max(...points.map(([lng]) => lng)), Math.max(...points.map(([, lat]) => lat))],
}
