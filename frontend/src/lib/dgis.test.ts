import { afterEach, describe, expect, it, vi } from 'vitest'
import { DISTRICT_GEO, DISTRICT_MAP_BOUNDS, districtMapPoint } from '../data/districtGeography'
import { DISTRICTS } from '../data/districts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
})

describe('district geography for the basemap', () => {
  it('keeps every model district in Astana with a closed geographic polygon', () => {
    expect(Object.keys(DISTRICT_GEO)).toHaveLength(5)
    for (const district of DISTRICTS) {
      const { coordinates, center } = DISTRICT_GEO[district.id]
      const ring = coordinates[0]
      expect(ring.length).toBeGreaterThan(10)
      expect(ring[0]).toEqual(ring.at(-1))
      for (const [lng, lat] of [...ring, center]) {
        expect(lng).toBeGreaterThan(71)
        expect(lng).toBeLessThan(72)
        expect(lat).toBeGreaterThan(50.8)
        expect(lat).toBeLessThan(51.5)
      }
    }
  })

  it('uses longitude/latitude order, north-up projection and verified control bounds', () => {
    expect(districtMapPoint(50, 194)).toEqual([71.2373028, 51.246318])
    expect(districtMapPoint(461, 1182)[0]).toBeCloseTo(71.4464047, 7)
    expect(districtMapPoint(461, 1182)[1]).toBeCloseTo(50.9306941, 7)
    expect(DISTRICT_MAP_BOUNDS.southWest[0]).toBeLessThan(DISTRICT_MAP_BOUNDS.northEast[0])
    expect(DISTRICT_MAP_BOUNDS.southWest[1]).toBeLessThan(DISTRICT_MAP_BOUNDS.northEast[1])
  })
})

describe('optional MapGL loader', () => {
  function browser() {
    const scripts: Array<{ src: string; onload: (() => void) | null; onerror: (() => void) | null; remove: ReturnType<typeof vi.fn> }> = []
    const browserWindow = { setTimeout, clearTimeout, mapgl: undefined as unknown }
    vi.stubGlobal('window', browserWindow)
    vi.stubGlobal('document', {
      createElement: () => ({ src: '', onload: null, onerror: null, remove: vi.fn() }),
      head: { append: (script: typeof scripts[number]) => scripts.push(script) },
    })
    return { scripts, browserWindow }
  }

  it('shares a single SDK request and loads only the official public URL', async () => {
    const { scripts, browserWindow } = browser()
    const { loadDGisSdk } = await import('./dgis')
    const first = loadDGisSdk()
    expect(loadDGisSdk()).toBe(first)
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe('https://mapgl.2gis.com/api/js/v1')
    const sdk = { Map: vi.fn() }
    browserWindow.mapgl = sdk
    scripts[0].onload!()
    await expect(first).resolves.toBe(sdk)
    await expect(loadDGisSdk()).resolves.toBe(sdk)
    expect(scripts).toHaveLength(1)
  })

  it('rejects script failure and permits an explicit retry', async () => {
    const { scripts, browserWindow } = browser()
    const { loadDGisSdk } = await import('./dgis')
    const pending = loadDGisSdk()
    const rejected = expect(pending).rejects.toThrow('unavailable')
    scripts[0].onerror!()
    await rejected
    expect(scripts[0].remove).toHaveBeenCalledOnce()
    const retry = loadDGisSdk()
    expect(scripts).toHaveLength(2)
    browserWindow.mapgl = { Map: vi.fn() }
    scripts[1].onload!()
    await expect(retry).resolves.toBe(browserWindow.mapgl)
  })

  it('stops waiting when a CDN request never completes', async () => {
    vi.useFakeTimers()
    const { scripts } = browser()
    const { loadDGisSdk } = await import('./dgis')
    const pending = loadDGisSdk()
    const rejected = expect(pending).rejects.toThrow('unavailable')
    await vi.advanceTimersByTimeAsync(12000)
    await rejected
    expect(scripts[0].remove).toHaveBeenCalledOnce()
    expect(scripts[0].onload).toBeNull()
  })
})
