<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Write a full implementation plan to use Geocode.maps.co API to get lat lon from address for lalamove use.

No, it is not compulsory, but using Geocode.maps.co is a good low-cost way to improve Lalamove accuracy by converting text addresses into lat/lon automatically.[^1][^2]

Below is a full, concrete implementation plan tailored to your stack.

***

## 1. How Geocode.maps.co Works

- Base URL: `https://geocode.maps.co/search`
- Method: `GET`
- Query params:
    - `q`: full address string (required)
    - `api_key`: your key (recommended, otherwise shared free pool)[^1]
- Response: array of matches like:
    - `[{ lat: "3.1412", lon: "101.6869", display_name: "...", importance: 0.7, class, type, ... }]`[^1]

Example request:

```bash
curl "https://geocode.maps.co/search?q=No%201%20Jalan%20Mawar%2050450%20Kuala%20Lumpur&api_key=YOUR_KEY"
```


***

## 2. Environment Variables

Add to your web backend (.env / Vercel project):

```bash
GEOCODE_MAPS_API_KEY=your_maps_co_key_here
GEOCODE_MAPS_BASE_URL=https://geocode.maps.co
GEOCODE_MAPS_TIMEOUT_MS=5000
GEOCODE_MAPS_COUNTRY_CODE=MY
```


***

## 3. Shared Geocoding Client

Create a small, reusable client used by API routes and background jobs.

```typescript
// packages/lib/src/geocoding/geocodeMapsCo.ts
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
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), TIMEOUT_MS)
    : undefined

  try {
    const res = await fetch(url, { signal })
    if (!res.ok) {
      console.warn('[geocode.maps.co] Non-200 response', res.status)
      return null
    }
    const data = (await res.json()) as any[]
    if (!Array.isArray(data) || data.length === 0) return null

    const top = data[^0]
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
```


***

## 4. Address Save API: Geocode on Save (Preferred)

When a user saves/updates an address, you geocode once and store `lat`/`lng` in Supabase. Lalamove then always has coordinates ready.

### 4.1 DB Columns (if not already)

```sql
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;
```


### 4.2 API Route: Create / Update Address

```typescript
// apps/web/src/app/api/addresses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { CreateAddressSchema } from '@packages/lib/validation/schemas'
import { geocodeAddress } from '@packages/lib/geocoding/geocodeMapsCo'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = CreateAddressSchema.parse(body)

  const fullAddress = `${parsed.address_line}, ${parsed.postcode} ${parsed.city}, ${parsed.state}, Malaysia`
  const geocode = await geocodeAddress(fullAddress, {
    countryCode: process.env.GEOCODE_MAPS_COUNTRY_CODE ?? 'MY',
  })

  const { data: address, error } = await supabase
    .from('addresses')
    .insert({
      user_id:      user.user.id,
      ...parsed,
      lat:          geocode?.lat ?? null,
      lng:          geocode?.lon ?? null,
      geocoded_at:  geocode ? new Date().toISOString() : null,
      // Persist the canonical string if you like:
      full_address: fullAddress,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(address)
}
```


### 4.3 Re-Geocode on Address Update (Optional)

```typescript
// apps/web/src/app/api/addresses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { CreateAddressSchema } from '@packages/lib/validation/schemas'
import { geocodeAddress } from '@packages/lib/geocoding/geocodeMapsCo'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = CreateAddressSchema.partial().parse(body)

  // Decide if we need to re-geocode (if any address field changed)
  const needsGeocode =
    parsed.address_line || parsed.city || parsed.state || parsed.postcode

  let updatePayload: any = parsed

  if (needsGeocode) {
    const { data: current } = await supabase
      .from('addresses')
      .select('address_line, city, state, postcode')
      .eq('id', id)
      .eq('user_id', user.user.id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const fullAddress = `${parsed.address_line ?? current.address_line}, ${parsed.postcode ?? current.postcode} ${parsed.city ?? current.city}, ${parsed.state ?? current.state}, Malaysia`

    const geocode = await geocodeAddress(fullAddress, {
      countryCode: process.env.GEOCODE_MAPS_COUNTRY_CODE ?? 'MY',
    })

    updatePayload = {
      ...updatePayload,
      lat:         geocode?.lat ?? null,
      lng:         geocode?.lon ?? null,
      geocoded_at: geocode ? new Date().toISOString() : null,
      full_address: fullAddress,
    }
  }

  const { data, error } = await supabase
    .from('addresses')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```


***

## 5. Lalamove: Use Lat/Lon When Available

The Lalamove API supports either:

- `location`: lat/lon coordinates, or
- `displayString`: free-text address to geocode on their side[^2]

Using your own geocoding gives more control and lets you reuse for other providers.

### 5.1 Lalamove Client Adaptation

```typescript
// packages/lib/src/delivery/lalamoveClient.ts
interface LalamoveLocation {
  lat: number
  lng: number
}

interface LalamoveStop {
  address:       string
  location?:     LalamoveLocation
  displayString: string
}

interface LalamoveQuotationPayload {
  stops: {
    location?: LalamoveLocation
    address:   string
  }[]
  deliveries: {
    toStop:  number
    toContact: {
      name:  string
      phone: string
    }
  }[]
  // ... other fields (serviceType, scheduleAt, etc.)
}

// Helper to build origin/destination
export function buildLalamoveStops(params: {
  pickupAddress: {
    address_line: string
    city:         string
    state:        string
    postcode:     string
    lat?:         number | null
    lng?:         number | null
    phone:        string
    name:         string
  }
  dropoffAddress: {
    address_line: string
    city:         string
    state:        string
    postcode:     string
    lat?:         number | null
    lng?:         number | null
    phone:        string
    name:         string
  }
}): { payload: LalamoveQuotationPayload; warnings: string[] } {
  const warnings: string[] = []

  const pickupFull = `${params.pickupAddress.address_line}, ${params.pickupAddress.postcode} ${params.pickupAddress.city}, ${params.pickupAddress.state}, Malaysia`
  const dropoffFull = `${params.dropoffAddress.address_line}, ${params.dropoffAddress.postcode} ${params.dropoffAddress.city}, ${params.dropoffAddress.state}, Malaysia`

  const pickupLocation =
    params.pickupAddress.lat && params.pickupAddress.lng
      ? { lat: params.pickupAddress.lat, lng: params.pickupAddress.lng }
      : undefined

  const dropoffLocation =
    params.dropoffAddress.lat && params.dropoffAddress.lng
      ? { lat: params.dropoffAddress.lat, lng: params.dropoffAddress.lng }
      : undefined

  if (!pickupLocation)  warnings.push('Pickup address missing coordinates; Lalamove will geocode.')
  if (!dropoffLocation) warnings.push('Dropoff address missing coordinates; Lalamove will geocode.')

  const stops: LalamoveQuotationPayload['stops'] = [
    {
      address: pickupFull,
      ...(pickupLocation ? { location: pickupLocation } : {}),
    },
    {
      address: dropoffFull,
      ...(dropoffLocation ? { location: dropoffLocation } : {}),
    },
  ]

  const deliveries: LalamoveQuotationPayload['deliveries'] = [
    {
      toStop: 1, // second stop
      toContact: {
        name:  params.dropoffAddress.name,
        phone: params.dropoffAddress.phone,
      },
    },
  ]

  return { payload: { stops, deliveries }, warnings }
}
```


### 5.2 Using It in Delivery Quote API

```typescript
// apps/web/src/app/api/delivery/quote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { buildLalamoveStops } from '@packages/lib/delivery/lalamoveClient'
import { getLalamoveQuotation } from '@packages/lib/delivery/lalamoveApi'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { storeId, addressId } = body

  const [{ data: store }, { data: address }] = await Promise.all([
    supabase
      .from('stores')
      .select('id, name, phone, address, city, state, postcode, lat, lng')
      .eq('id', storeId)
      .single(),
    supabase
      .from('addresses')
      .select('id, recipient, phone, address_line, city, state, postcode, lat, lng')
      .eq('id', addressId)
      .eq('user_id', user.user.id)
      .single(),
  ])

  if (!store || !address) {
    return NextResponse.json({ error: 'Store or address not found' }, { status: 404 })
  }

  const { payload, warnings } = buildLalamoveStops({
    pickupAddress: {
      address_line: store.address,
      city:         store.city,
      state:        store.state,
      postcode:     store.postcode,
      lat:          store.lat,
      lng:          store.lng,
      phone:        store.phone,
      name:         store.name,
    },
    dropoffAddress: {
      address_line: address.address_line,
      city:         address.city,
      state:        address.state,
      postcode:     address.postcode,
      lat:          address.lat,
      lng:          address.lng,
      phone:        address.phone,
      name:         address.recipient,
    },
  })

  const quotation = await getLalamoveQuotation(payload)

  return NextResponse.json({
    lalamove: {
      quotation,
      warnings, // you can choose to log or show them in dev
    },
  })
}
```


***

## 6. Optional: Background Re-Geocode Job

If you imported many old addresses without lat/lon, add a cron to gradually geocode them.

```sql
-- View of addresses missing coordinates
CREATE OR REPLACE VIEW public.addresses_without_coords AS
SELECT id, user_id, address_line, city, state, postcode
FROM public.addresses
WHERE lat IS NULL OR lng IS NULL;
```

```typescript
// apps/web/src/app/api/cron/geocode-addresses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { geocodeAddress } from '@packages/lib/geocoding/geocodeMapsCo'

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdmin()
  const { data: addresses } = await admin
    .from('addresses_without_coords')
    .select('*')
    .limit(50) // small batch to respect free rate limits [web:296]

  if (!addresses?.length) return NextResponse.json({ processed: 0 })

  let success = 0
  for (const addr of addresses) {
    const fullAddress = `${addr.address_line}, ${addr.postcode} ${addr.city}, ${addr.state}, Malaysia`
    const result = await geocodeAddress(fullAddress, {
      countryCode: process.env.GEOCODE_MAPS_COUNTRY_CODE ?? 'MY',
    })
    if (!result) continue

    await admin
      .from('addresses')
      .update({
        lat:         result.lat,
        lng:         result.lon,
        geocoded_at: new Date().toISOString(),
      })
      .eq('id', addr.id)

    success++
    await new Promise((r) => setTimeout(r, 200)) // 5 qps safety buffer
  }

  return NextResponse.json({ processed: addresses.length, success })
}
```

Schedule via Vercel Cron (e.g. every 10 minutes).

***

## 7. Rollout Plan

1. **Add columns** `lat`, `lng`, `geocoded_at` to `addresses` and `stores` (if not already).
2. **Implement geocode client** `geocodeAddress` (packages/lib).
3. **Wire into address create/update APIs** so new addresses are geocoded on save.
4. **Update Lalamove integration** to:
    - Prefer stored `lat`/`lng`.
    - Fall back to `displayString` for Lalamove’s own geocoding when missing.[^2]
5. (Optional) **Background job** to fill in old addresses.
6. **Log and monitor**:
    - Geocoding failures (network, 4xx/5xx).
    - Lalamove quote errors due to invalid coordinates.

Would you like the same pattern extended to merchant store addresses too, so pickup coordinates are also guaranteed?
<span style="display:none">[^10][^11][^12][^13][^14][^15][^3][^4][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://geocode.maps.co

[^2]: https://github.com/yamdraco/lalamove-js

[^3]: https://api.ncloud-docs.com/docs/en/application-maps-geocoding

[^4]: https://globalmainstoragecdn.blob.core.windows.net/documentation-api-pdf/Geocode_API_Reference_Guide.pdf

[^5]: http://www.fedvvfvol.it/document/pdf/the-google-geocoding-api---google-maps-api-web-services---google-code/file4ef30c3558363/

[^6]: https://gist.github.com/mnguyenngo/d8761679e7ae75bb46bc7e9df3921e5f

[^7]: https://apiclub.readme.io/reference/reverse-geocode-api

[^8]: https://developer-blog.ptvlogistics.com/2025/06/03/new-rate-limits-for-the-geocoding-places-api-effective-july-1-2025/

[^9]: https://support.sitegiant.com/knowledge-base/how-to-set-up-lalamove-shipping-method/

[^10]: https://developers.google.com/maps/documentation/geocoding/overview

[^11]: https://coordable.co/provider/google-maps-geocoding-api/

[^12]: https://help.lelong.my/setup-lalamove-integration/

[^13]: https://geocode.earth/blog/2025/per-api-key-ratelimits/

[^14]: https://developers.google.com/maps/documentation/geocoding

[^15]: https://groups.google.com/d/msg/google-maps-api-web-services/b6vMTFkF8gs/zDQkxc_OoGUJ

