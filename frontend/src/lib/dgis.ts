// The public MapGL SDK is loaded on demand; no key is included in the script URL.
// API: https://docs.2gis.com/en/mapgl/reference/class
export interface MapBounds {
  southWest: number[]
  northEast: number[]
}

export interface DGisObject {
  destroy(): void
}

export interface DGisMapInstance extends DGisObject {
  on(event: string, listener: () => void): void
  off(event: string, listener: () => void): void
  fitBounds(bounds: MapBounds, options?: Record<string, unknown>): void
  setLanguage(lang: string): void
}

export interface DGisSdk {
  isSupported(): boolean
  Map: new (container: HTMLElement, options: Record<string, unknown>) => DGisMapInstance
  Polygon: new (map: DGisMapInstance, options: Record<string, unknown>) => DGisObject & {
    on(event: string, listener: () => void): void
  }
  HtmlMarker: new (map: DGisMapInstance, options: Record<string, unknown>) => DGisObject
}

declare global {
  interface Window {
    mapgl?: DGisSdk
  }
}

let pendingSdk: Promise<DGisSdk> | undefined

export function loadDGisSdk(): Promise<DGisSdk> {
  if (window.mapgl) return Promise.resolve(window.mapgl)
  if (pendingSdk) return pendingSdk
  pendingSdk = new Promise<DGisSdk>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://mapgl.2gis.com/api/js/v1'
    script.async = true
    const finish = (sdk?: DGisSdk) => {
      window.clearTimeout(timeout)
      script.onload = null
      script.onerror = null
      if (sdk) resolve(sdk)
      else {
        script.remove()
        pendingSdk = undefined
        reject(new Error('Map service unavailable'))
      }
    }
    const timeout = window.setTimeout(() => finish(), 12000)
    script.onload = () => finish(window.mapgl)
    script.onerror = () => finish()
    document.head.append(script)
  })
  return pendingSdk
}
