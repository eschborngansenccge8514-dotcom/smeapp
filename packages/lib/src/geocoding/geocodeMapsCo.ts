const BASE_URL   = process.env.GEOCODE_MAPS_BASE_URL ?? 'https://geocode.maps.co'
const API_KEY    = process.env.GEOCODE_MAPS_API_KEY
const TIMEOUT_MS = Number(process.env.GEOCODE_MAPS_TIMEOUT_MS ?? 5000)

export interface GeocodingResult {
  lat:          number
  lon:          number
  display_name: string
  importance?:  number
  class?:       string
  type?:        string
}

function buildQuery(address: string, countryCode?: string) {
  const params = new URLSearchParams()
  params.set('q', address)
  if (API_KEY) params.set('api_key', API_KEY)
  if (countryCode) params.set('country', countryCode)
  return params.toString()
}

export async function geocodeAddress(
  address: string,
  options: { countryCode?: string; signal?: AbortSignal } = {}
): Promise<GeocodingResult | null> {
  if (!address.trim()) return null

  const url = `${BASE_URL}/search?${buildQuery(address, options.countryCode)}`
  const controller = options.signal ? null : new AbortController()
  const signal = options.signal ?? controller!.signal
  
  // Set up manual timeout if controller was created
  let timeoutId: any = undefined
  if (controller) {
    timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  }

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) {
      console.warn('[geocode.maps.co] Non-200 response', res.status)
      return null
    }
    const data = (await res.json()) as any[]
    if (!Array.isArray(data) || data.length === 0) return null

    const top = data[0]
    const lat = Number(top.lat)
    const lon = Number(top.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    return {
      lat,
      lon,
      display_name: top.display_name,
      importance:   top.importance,
      class:        top.class,
      type:         top.type,
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[geocode.maps.co] Request aborted (timeout)')
      return null
    }
    console.error('[geocode.maps.co] Error:', err.message)
    return null
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
