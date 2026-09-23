import { useEffect, useRef, useState } from 'react'
import { DISTRICT_GEO, DISTRICT_MAP_BOUNDS } from '../data/districtGeography'
import type { DistrictId } from '../data/districts'
import { loadDGisSdk } from '../lib/dgis'
import type { DGisMapInstance, DGisObject, DGisSdk } from '../lib/dgis'
import { useI18n } from '../lib/i18n'
import { MAP_COPY } from '../data/locales/map'

export interface DGisDistrict {
  id: DistrictId
  name: string
  value: string
  color: string
}

interface Props {
  districts: DGisDistrict[]
  activeId: DistrictId
  onSelect: (id: DistrictId) => void
  onHover: (id: DistrictId | null) => void
  onUnavailable: () => void
}

export function DGisMap({ districts, activeId, onSelect, onHover, onUnavailable }: Props) {
  const { lang } = useI18n()
  const copy = MAP_COPY[lang]
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<DGisMapInstance | null>(null)
  const sdkRef = useRef<DGisSdk | null>(null)
  const callbacks = useRef({ onSelect, onHover, onUnavailable })
  const [ready, setReady] = useState(false)

  useEffect(() => { callbacks.current = { onSelect, onHover, onUnavailable } }, [onSelect, onHover, onUnavailable])

  useEffect(() => {
    let disposed = false
    let instance: DGisMapInstance | undefined
    let timer: number | undefined
    const fail = () => { if (!disposed) callbacks.current.onUnavailable() }
    const idle = () => {
      if (disposed) return
      window.clearTimeout(timer)
      setReady(true)
    }
    loadDGisSdk().then((sdk) => {
      if (disposed || !container.current) return
      if (!sdk.isSupported()) { fail(); return }
      sdkRef.current = sdk
      instance = new sdk.Map(container.current, {
        key: import.meta.env.VITE_DGIS_API_KEY,
        center: [71.43, 51.14], zoom: 10,
        minZoom: 8, maxZoom: 18, pitch: 0, rotation: 0,
        disablePitchByUserInteraction: true,
        disableRotationByUserInteraction: true,
        disableZoomOnScroll: true,
        disableDragging: window.matchMedia('(pointer: coarse)').matches,
        enableTwoFingerDragging: true,
        enableTrackResize: true,
        graphicsPreset: 'light',
        zoomControl: 'topRight', scaleControl: 'bottomLeft',
      })
      mapRef.current = instance
      instance.on('idle', idle)
      instance.on('error', fail)
      instance.on('styleloaderror', fail)
      instance.fitBounds(DISTRICT_MAP_BOUNDS, { padding: { top: 40, right: 30, bottom: 40, left: 30 }, animation: { animate: false } })
      timer = window.setTimeout(fail, 16000)
    }).catch(fail)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      if (instance) {
        instance.off('idle', idle)
        instance.off('error', fail)
        instance.off('styleloaderror', fail)
        instance.destroy()
      }
      mapRef.current = null
      sdkRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    try { mapRef.current?.setLanguage(lang) } catch { callbacks.current.onUnavailable() }
  }, [ready, lang])

  useEffect(() => {
    const map = mapRef.current
    const sdk = sdkRef.current
    if (!ready || !map || !sdk) return
    const objects: DGisObject[] = []
    try {
      for (const district of districts) {
        const geometry = DISTRICT_GEO[district.id]
        const polygon = new sdk.Polygon(map, {
          coordinates: geometry.coordinates,
          color: `${district.color}60`, strokeColor: '#ffffffbb', strokeWidth: 2, zIndex: 1,
        })
        objects.push(polygon)
        polygon.on('click', () => callbacks.current.onSelect(district.id))
        polygon.on('mouseover', () => callbacks.current.onHover(district.id))
        polygon.on('mouseout', () => callbacks.current.onHover(null))
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'rounded-xl border-2 bg-surface px-2.5 py-1.5 text-xs font-bold text-ink shadow-md transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-accent'
        button.style.borderColor = district.color
        button.textContent = `${district.name} · ${district.value}`
        button.setAttribute('aria-label', `${district.name}: ${district.value}`)
        button.addEventListener('click', () => callbacks.current.onSelect(district.id))
        objects.push(new sdk.HtmlMarker(map, {
          coordinates: geometry.center, html: button, anchor: [55, 15], interactive: true, zIndex: 4,
        }))
      }
    } catch {
      callbacks.current.onUnavailable()
    }
    return () => { if (mapRef.current === map) objects.forEach((object) => object.destroy()) }
  }, [ready, districts])

  useEffect(() => {
    const map = mapRef.current
    const sdk = sdkRef.current
    if (!ready || !map || !sdk) return
    try {
      const outline = new sdk.Polygon(map, {
        coordinates: DISTRICT_GEO[activeId].coordinates,
        color: '#00000000', strokeColor: '#5e45a8', strokeWidth: 4, zIndex: 2, interactive: false,
      })
      return () => { if (mapRef.current === map) outline.destroy() }
    } catch {
      callbacks.current.onUnavailable()
    }
  }, [ready, activeId])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div ref={container} className="h-[420px] w-full sm:h-[560px]" role="region" aria-label={copy.region} />
      {!ready && <p role="status" className="pointer-events-none absolute inset-x-4 top-4 rounded-xl bg-surface px-3 py-2 text-sm text-ink shadow-sm">{copy.loading}</p>}
      {ready && <button type="button" onClick={() => mapRef.current?.fitBounds(DISTRICT_MAP_BOUNDS, { padding: { top: 40, right: 30, bottom: 40, left: 30 } })} className="absolute left-3 top-3 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm">{copy.all}</button>}
      <p className="border-t border-line bg-surface px-3 py-2 text-[11px] text-muted">{copy.touch}</p>
    </div>
  )
}
