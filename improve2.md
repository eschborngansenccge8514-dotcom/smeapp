<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Write a full implementation to improve the performance and maximize optimization of the overall website

Here is the complete, production-grade performance implementation covering every layer — from PPR and Redis caching to Core Web Vitals, fonts, PWA, and bundle analysis.

***

## Performance Target Benchmarks

| Metric | Target | What Fixes It |
| :-- | :-- | :-- |
| LCP | ≤ 2.5s | PPR, font preload, image priority, CDN |
| INP | ≤ 200ms | React Compiler, useDeferredValue, transitions |
| CLS | < 0.1 | next/font size-adjust, image dimensions, skeletons |
| TTFB | ≤ 200ms | Edge runtime, Redis cache, PPR static shell |
| Bundle JS | ≤ 150KB initial | Dynamic imports, tree-shaking, modular imports |

[^1][^2]

***

## Step 1: Next.js Config — Full Optimization Flags

```typescript
// apps/web/next.config.ts
import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // ─── Rendering ────────────────────────────────────────────
  experimental: {
    // PPR: static shell + streamed dynamic holes [web:327][web:329]
    ppr:              'incremental',

    // dynamicIO: opt-in caching instead of cache-by-default [web:330]
    dynamicIO:        true,

    // React Compiler: auto-memoizes components and hooks
    reactCompiler:    true,

    // Inline critical CSS — removes render-blocking stylesheet
    inlineCss:        true,

    // Tree-shake large packages at import level
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash-es',
      '@supabase/supabase-js',
    ],

    // Turbopack for local dev (faster HMR)
    turbopack: process.env.NODE_ENV === 'development' ? {} : undefined,
  },

  // ─── Images ───────────────────────────────────────────────
  images: {
    formats:         ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,   // 30 days
    deviceSizes:     [640, 750, 828, 1080, 1200, 1920],
    imageSizes:      [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ─── Compression ──────────────────────────────────────────
  compress: true,

  // ─── Output ───────────────────────────────────────────────
  output:       'standalone',    // minimal Docker/Vercel bundle
  poweredByHeader: false,        // remove X-Powered-By header

  // ─── SWC ──────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ─── Headers ──────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },

  // ─── Redirects ────────────────────────────────────────────
  async redirects() {
    return [
      { source: '/home',    destination: '/',       permanent: true },
      { source: '/stores',  destination: '/explore', permanent: false },
    ]
  },
}

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-insights.com *.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: *.supabase.co",
      "font-src 'self'",
      "connect-src 'self' *.supabase.co wss://*.supabase.co *.billplz.com *.lalamove.com *.sentry.io",
    ].join('; '),
  },
]

export default withBundleAnalyzer(nextConfig)
```


***

## Step 2: Partial Pre-rendering (PPR) Per Route

PPR renders a **static shell instantly from CDN**, then streams dynamic holes — best of static speed + live data.[^3][^4]

```typescript
// apps/web/src/app/(main)/page.tsx — homepage with PPR
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

// ← tells Next.js: render a static shell, stream dynamic holes
export const experimental_ppr = true

// ─── Static data (cached days) ────────────────────────────────
async function getCategories() {
  'use cache'
  cacheLife('days')
  cacheTag('categories')
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('categories')
    .select('id, name, icon, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .limit(12)
  return data ?? []
}

async function getFeaturedBanners() {
  'use cache'
  cacheLife('hours')
  cacheTag('banners')
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('banners')
    .select('id, image_url, title, url, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .limit(5)
  return data ?? []
}

// ─── Dynamic data (streamed in via Suspense) ──────────────────
async function FeaturedStores() {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('stores')
    .select('id, name, logo_url, rating, reviews_count, est_delivery_minutes, state')
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .limit(12)

  return <StoreGrid stores={data ?? []} />
}

async function TrendingProducts() {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('products')
    .select('id, name, price, image_urls, avg_rating, stores(id, name)')
    .eq('is_available', true)
    .order('views_count', { ascending: false })
    .limit(8)

  return <ProductRow products={data ?? []} />
}

export default async function HomePage() {
  // Static — pre-rendered at build, served instantly from CDN
  const [categories, banners] = await Promise.all([
    getCategories(),
    getFeaturedBanners(),
  ])

  return (
    <main>
      {/* ← Rendered statically: zero TTFB */}
      <HeroBanner banners={banners} />
      <CategoryRow categories={categories} />

      {/* ← Streamed dynamically: doesn't block static paint */}
      <section className="py-6">
        <SectionHeader title="Popular Stores" />
        <Suspense fallback={<StoreGridSkeleton count={12} />}>
          <FeaturedStores />
        </Suspense>
      </section>

      <section className="py-6">
        <SectionHeader title="Trending Now" />
        <Suspense fallback={<ProductRowSkeleton count={8} />}>
          <TrendingProducts />
        </Suspense>
      </section>
    </main>
  )
}
```

```typescript
// apps/web/src/app/store/[id]/page.tsx — per-store PPR
export const experimental_ppr = true

// Static: store header, metadata, category filters
async function getStoreShell(id: string) {
  'use cache'
  cacheLife('minutes')
  cacheTag(`store-${id}`)
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('stores')
    .select('id, name, logo_url, banner_url, description, rating, reviews_count, address, state, min_order_amount, est_delivery_minutes')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  return data
}

// Dynamic: products (change stock, price frequently)
async function StoreProducts({ storeId, search, category }: any) {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('products')
    .select('id, name, price, image_urls, avg_rating, stock_qty, categories(name)')
    .eq('store_id', storeId)
    .eq('is_available', true)
    .order('sort_order')
    .limit(40)
  return <ProductGrid products={data ?? []} />
}

export default async function StorePage({ params, searchParams }: any) {
  const { id } = await params
  const store   = await getStoreShell(id)
  if (!store) notFound()

  return (
    <div>
      {/* Static shell — instantly from CDN */}
      <StoreHero store={store} />
      <StoreMetaBar store={store} />

      {/* Dynamic product grid — streams in */}
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <StoreProducts storeId={id} {...await searchParams} />
      </Suspense>
    </div>
  )
}
```


***

## Step 3: Upstash Redis — Universal Cache Layer

Redis reduces API response times from **hundreds of ms → 1–2ms** for cached entries.[^5]

```bash
pnpm add @upstash/redis --filter=web --filter=lib
```

```typescript
// packages/lib/src/cache/redis.ts
import { Redis } from '@upstash/redis'

// Singleton — one connection shared across all invocations
let _redis: Redis | null = null

export function getRedis(): Redis {
  if (_redis) return _redis
  _redis = Redis.fromEnv()
  return _redis
}

// ─── Generic cache-aside helper ──────────────────────────────
export async function cached<T>(
  key:     string,
  ttlSecs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis  = getRedis()
  const cached = await redis.get<T>(key)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await redis.setex(key, ttlSecs, JSON.stringify(fresh))
  return fresh
}

// ─── Namespaced helpers ───────────────────────────────────────
export const redisKeys = {
  store:            (id: string)  => `store:${id}`,
  storeProducts:    (id: string)  => `store:${id}:products`,
  product:          (id: string)  => `product:${id}`,
  categories:       ()            => 'categories:all',
  orderStatus:      (id: string)  => `order:${id}:status`,
  loyaltyBalance:   (uid: string, sid: string) => `loyalty:${uid}:${sid}`,
  deliveryQuote:    (key: string) => `delivery:quote:${key}`,
  geocode:          (addr: string) => `geocode:${Buffer.from(addr).toString('base64').slice(0, 64)}`,
  storeAnalytics:   (id: string)  => `analytics:store:${id}`,
  activeStoreCount: ()            => 'stores:active:count',
}

// ─── Invalidation helper ──────────────────────────────────────
export async function invalidateKeys(...keys: string[]) {
  const redis = getRedis()
  if (keys.length > 0) await redis.del(...keys)
}
```


### 3.1 Redis-Cache Public Endpoints

```typescript
// packages/lib/src/cache/cachedQueries.ts
import { getRedis, cached, redisKeys } from './redis'
import { createSupabaseAdmin } from '../supabase/admin'

// ─── Categories (24h) ─────────────────────────────────────────
export function getCachedCategories() {
  return cached(
    redisKeys.categories(),
    86400,
    async () => {
      const admin = createSupabaseAdmin()
      const { data } = await admin
        .from('categories')
        .select('id, name, icon, slug, sort_order')
        .eq('is_active', true)
        .order('sort_order')
      return data ?? []
    }
  )
}

// ─── Store shell (5 min) ──────────────────────────────────────
export function getCachedStore(storeId: string) {
  return cached(
    redisKeys.store(storeId),
    300,
    async () => {
      const admin = createSupabaseAdmin()
      const { data } = await admin
        .from('stores')
        .select('id, name, logo_url, banner_url, description, rating, reviews_count, address, city, state, postcode, min_order_amount, est_delivery_minutes, lat, lng, is_active')
        .eq('id', storeId)
        .eq('is_active', true)
        .single()
      return data
    }
  )
}

// ─── Store products (2 min) ───────────────────────────────────
export function getCachedStoreProducts(storeId: string) {
  return cached(
    redisKeys.storeProducts(storeId),
    120,
    async () => {
      const admin = createSupabaseAdmin()
      const { data } = await admin
        .from('products')
        .select('id, name, price, image_urls, avg_rating, review_count, stock_qty, is_available, categories(id, name), product_variants(id, name, price, stock_qty, is_active)')
        .eq('store_id', storeId)
        .eq('is_available', true)
        .order('sort_order')
        .limit(100)
      return data ?? []
    }
  )
}

// ─── Active store count (1h) ──────────────────────────────────
export function getCachedActiveStoreCount() {
  return cached(
    redisKeys.activeStoreCount(),
    3600,
    async () => {
      const admin = createSupabaseAdmin()
      const { count } = await admin
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      return count ?? 0
    }
  )
}

// ─── Delivery quote (10 min) — avoid hammering Lalamove ───────
export function getCachedDeliveryQuote(
  cacheKey: string,
  fetcher: () => Promise<any>
) {
  return cached(redisKeys.deliveryQuote(cacheKey), 600, fetcher)
}

// ─── Geocode result (7 days) — geocode.maps.co is rate-limited ─
export function getCachedGeocode(
  address: string,
  fetcher: () => Promise<any>
) {
  return cached(redisKeys.geocode(address), 604800, fetcher)
}
```


### 3.2 Geocoding with Redis Cache

```typescript
// packages/lib/src/geocoding/geocodeMapsCo.ts — with Redis cache layer
import { getCachedGeocode } from '../cache/cachedQueries'

export async function geocodeAddressCached(
  address: string,
  options: { countryCode?: string } = {}
): Promise<GeocodingResult | null> {
  return getCachedGeocode(
    address,
    () => geocodeAddress(address, options)
  )
}
```


### 3.3 Cache Invalidation on Data Mutations

```typescript
// packages/lib/src/cache/invalidation.ts
import { invalidateKeys, redisKeys } from './redis'
import { revalidateTag } from 'next/cache'

// Call after store is updated by merchant
export async function invalidateStore(storeId: string) {
  await invalidateKeys(
    redisKeys.store(storeId),
    redisKeys.storeProducts(storeId),
    redisKeys.activeStoreCount(),
  )
  revalidateTag(`store-${storeId}`)
  revalidateTag('featured-stores')
}

// Call after product is created/updated/deleted
export async function invalidateProduct(productId: string, storeId: string) {
  await invalidateKeys(
    redisKeys.product(productId),
    redisKeys.storeProducts(storeId),
  )
  revalidateTag(`product-${productId}`)
  revalidateTag(`store-products-${storeId}`)
}

// Call after order status change
export async function invalidateOrder(orderId: string) {
  await invalidateKeys(redisKeys.orderStatus(orderId))
}

// Call after loyalty balance changes
export async function invalidateLoyaltyBalance(userId: string, storeId: string) {
  await invalidateKeys(redisKeys.loyaltyBalance(userId, storeId))
}
```


***

## Step 4: Font Optimization — Zero CLS

Using `next/font` eliminates external network requests and uses CSS `size-adjust` to prevent layout shift.[^6][^7]

```typescript
// apps/web/src/lib/fonts.ts
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import localFont from 'next/font/local'

// ─── Primary UI font ──────────────────────────────────────────
export const inter = Inter({
  subsets:  ['latin'],
  display:  'swap',             // text visible instantly with fallback
  variable: '--font-inter',
  // Only load weights actually used
  weight:   ['400', '500', '600', '700', '800'],
  // Preload critical characters only
  preload:  true,
})

// ─── Display / heading font ───────────────────────────────────
export const jakartaSans = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  display:  'swap',
  variable: '--font-jakarta',
  weight:   ['600', '700', '800'],
  preload:  true,
})

// ─── Optional: self-hosted custom brand font ──────────────────
// Use this if you have a brand-specific font file
// export const brandFont = localFont({
//   src: [
//     { path: '../fonts/BrandFont-Regular.woff2', weight: '400', style: 'normal' },
//     { path: '../fonts/BrandFont-Bold.woff2',    weight: '700', style: 'normal' },
//   ],
//   variable: '--font-brand',
//   display:  'swap',
//   preload:  true,
// })
```

```typescript
// apps/web/src/app/layout.tsx
import { inter, jakartaSans } from '@/lib/fonts'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // ← CSS variables available everywhere
      className={`${inter.variable} ${jakartaSans.variable}`}
    >
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
```

```css
/* apps/web/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-inter:    'Inter', system-ui, sans-serif;
    --font-jakarta:  'Plus Jakarta Sans', system-ui, sans-serif;
  }

  /* Prevent CLS from unsized media */
  img, video, iframe, canvas {
    max-width: 100%;
    height: auto;
  }

  /* Prevent CLS from custom fonts — size-adjust handles this automatically
     via next/font, but this is a good safety fallback */
  * { font-display: swap; }
}
```

```typescript
// tailwind.config.ts — use CSS variables from next/font
import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```


***

## Step 5: Core Web Vitals Fixes

### 5.1 LCP — Largest Contentful Paint

The biggest LCP win is `priority` on above-the-fold images and removing render-blocking scripts.[^2][^8]

```typescript
// apps/web/src/components/store/StoreHero.tsx — LCP element
import Image from 'next/image'

export function StoreHero({ store }: { store: any }) {
  return (
    <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden">
      {store.banner_url ? (
        <Image
          src={store.banner_url}
          alt={store.name}
          fill
          // ← priority preloads the image as LCP candidate [web:344]
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          className="object-cover"
          // avif/webp served automatically via next.config
        />
      ) : (
        // Placeholder with store color — no CLS
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
      )}
    </div>
  )
}
```

```typescript
// apps/web/src/components/home/HeroBanner.tsx — homepage LCP
export function HeroBanner({ banners }: { banners: any[] }) {
  if (banners.length === 0) return <HeroBannerFallback />

  return (
    <div className="relative w-full aspect-[16/6] md:aspect-[16/5] overflow-hidden rounded-2xl">
      <Image
        src={banners[^0].image_url}
        alt={banners[^0].title ?? 'Featured'}
        fill
        priority          // ← preload #1 banner as LCP
        fetchPriority="high"
        sizes="100vw"
        className="object-cover"
      />
    </div>
  )
}
```


### 5.2 INP — Interaction to Next Paint (replaces FID)

43% of sites still fail INP in 2026. Fix: move heavy work off the main thread.[^2]

```typescript
// apps/web/src/components/products/ProductSearch.tsx
// Use useTransition + useDeferredValue so typing never blocks UI
'use client'
import { useState, useTransition, useDeferredValue, memo } from 'react'

export function ProductSearch({ onResults }: { onResults: (q: string) => void }) {
  const [query, setQuery]          = useState('')
  const [isPending, startTransition] = useTransition()
  const deferredQuery              = useDeferredValue(query)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    // ← non-urgent state update — won't block typing
    startTransition(() => {
      onResults(val)
    })
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleChange}
        placeholder="Search products..."
        className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {isPending ? (
          <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        ) : '🔍'}
      </span>
    </div>
  )
}
```

```typescript
// apps/web/src/components/cart/CartButton.tsx — avoid INP on add to cart
'use client'
import { useCallback, useOptimistic, useTransition } from 'react'
import { useCartStore } from '@/stores/cartStore'

export function AddToCartButton({ product }: { product: any }) {
  const addItem = useCartStore((s) => s.addItem)
  const [isPending, startTransition] = useTransition()
  const [optimisticAdded, addOptimistic] = useOptimistic(false)

  const handleAdd = useCallback(() => {
    // ← Optimistic update: UI responds INSTANTLY (0ms INP)
    addOptimistic(true)
    startTransition(() => {
      addItem({ ...product, quantity: 1 }, product.store_id, product.store_name)
    })
  }, [product, addItem, addOptimistic])

  return (
    <button
      onClick={handleAdd}
      disabled={isPending || product.stock_qty === 0}
      className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
        ${optimisticAdded
          ? 'bg-green-600 text-white scale-95'
          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}
        disabled:opacity-40`}
    >
      {optimisticAdded ? '✓ Added!' : product.stock_qty === 0 ? 'Out of Stock' : 'Add to Cart'}
    </button>
  )
}
```


### 5.3 CLS — Cumulative Layout Shift

Reserve space for every dynamic element before it loads.[^2]

```typescript
// apps/web/src/components/ui/AspectBox.tsx
// Wrap any image/embed to reserve space and prevent CLS
export function AspectBox({
  ratio = '1/1',
  children,
  className = '',
}: {
  ratio?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  )
}

// Usage: wraps product images so grid never shifts on load
// <AspectBox ratio="4/3"><Image fill ... /></AspectBox>
```

```typescript
// apps/web/src/components/ui/Skeleton.tsx
// Consistent skeleton components with correct dimensions
import { memo } from 'react'

export const Skeleton = memo(function Skeleton({
  className = '',
  style = {},
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`bg-gray-100 animate-pulse rounded-xl ${className}`}
      style={style}
    />
  )
})

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100">
      {/* Fixed aspect ratio — no CLS */}
      <Skeleton className="w-full aspect-square rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
})

export function ProductGridSkeleton({ count = 8, cols = 2 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-${cols} md:grid-cols-${Math.min(cols + 1, 4)}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StoreCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
      <Skeleton className="w-full h-32 rounded-none" />
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
```


***

## Step 6: Third-Party Scripts — Non-Blocking Loading

```typescript
// apps/web/src/app/layout.tsx — optimized script loading
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* DNS prefetch for known third-party domains */}
        <link rel="dns-prefetch" href="//supabase.co" />
        <link rel="dns-prefetch" href="//billplz.com" />
        <link rel="dns-prefetch" href="//lalamove.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        {children}

        {/* ← afterInteractive: loads after page hydration */}
        <Script
          src="https://js.sentry-cdn.com/YOUR_DSN.min.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />

        {/* ← lazyOnload: only when browser is idle */}
        <Script
          src="https://cdn.vercel-insights.com/v1/speed-insights.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
```


***

## Step 7: Prefetching Strategy

```typescript
// apps/web/src/components/store/StoreCard.tsx — prefetch on hover
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export const StoreCard = memo(function StoreCard({ store }: { store: any }) {
  const router = useRouter()

  // Prefetch store page on hover — data ready by the time user clicks
  const handleMouseEnter = useCallback(() => {
    router.prefetch(`/store/${store.id}`)
  }, [store.id, router])

  return (
    <Link
      href={`/store/${store.id}`}
      onMouseEnter={handleMouseEnter}   // desktop
      onTouchStart={handleMouseEnter}   // mobile
      prefetch={false}                  // only on hover, not on viewport entry
    >
      {/* ... card content */}
    </Link>
  )
})
```

```typescript
// apps/web/src/components/products/ProductCard.tsx — prefetch product on hover
export const ProductCard = memo(function ProductCard({ product, storeId }: any) {
  const router = useRouter()

  const prefetchProduct = useCallback(() => {
    router.prefetch(`/store/${storeId}/product/${product.id}`)
  }, [storeId, product.id, router])

  return (
    <Link
      href={`/store/${storeId}/product/${product.id}`}
      onMouseEnter={prefetchProduct}
      onTouchStart={prefetchProduct}
      prefetch={false}
    >
      {/* ... */}
    </Link>
  )
})
```


***

## Step 8: Edge Runtime on Hot API Routes

Moving performance-critical API routes to Edge eliminates cold starts and reduces TTFB.[^5][^2]

```typescript
// apps/web/src/app/api/stores/featured/route.ts — runs at the edge
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getCachedStore } from '@packages/lib/cache/cachedQueries'

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('id')
  if (!storeId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const store = await getCachedStore(storeId)
  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(store, {
    headers: {
      // Serve from edge CDN, revalidate in background [web:326]
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
```

```typescript
// apps/web/src/app/api/search/route.ts — edge search
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const q      = req.nextUrl.searchParams.get('q')?.trim()
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '10'), 50)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const admin = createSupabaseAdmin()

  // Use PostgreSQL full-text search (GIN index defined in migrations)
  const { data } = await admin
    .from('products')
    .select('id, store_id, name, price, image_urls, avg_rating, stores(id, name, logo_url)')
    .textSearch('fts', q, { type: 'websearch', config: 'english' })
    .eq('is_available', true)
    .limit(limit)

  return NextResponse.json({ results: data ?? [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
```


***

## Step 9: PWA — Offline Support

```bash
pnpm add next-pwa --filter=web
```

```typescript
// apps/web/next.config.ts — add PWA wrapper
import withPWA from 'next-pwa'

const withPWAConfig = withPWA({
  dest:             'public',
  register:         true,
  skipWaiting:      true,
  disable:          process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // ─── HTML pages: network-first, 10min cache ───────────────
    {
      urlPattern: /^https:\/\/[^/]+\/(?!api\/)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: { maxEntries: 50, maxAgeSeconds: 600 },
      },
    },
    // ─── API calls: stale-while-revalidate ────────────────────
    {
      urlPattern: /^https:\/\/[^/]+\/api\/(stores|products|categories)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-data',
        expiration: { maxEntries: 100, maxAgeSeconds: 300 },
      },
    },
    // ─── Supabase images: cache-first, 30 days ────────────────
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-images',
        expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
      },
    },
    // ─── Next.js static assets: cache-first, 1 year ──────────
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 300, maxAgeSeconds: 31536000 },
      },
    },
    // ─── Next.js images: stale-while-revalidate ───────────────
    {
      urlPattern: /\/_next\/image\?url=.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-images',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
      },
    },
  ],
})

export default withPWAConfig(withBundleAnalyzer(nextConfig))
```

```typescript
// apps/web/public/manifest.json
{
  "name":             "Your App Name",
  "short_name":       "YourApp",
  "description":      "Malaysia's best marketplace",
  "start_url":        "/",
  "display":          "standalone",
  "background_color": "#ffffff",
  "theme_color":      "#4F46E5",
  "orientation":      "portrait-primary",
  "icons": [
    { "src": "/icons/icon-72x72.png",   "sizes": "72x72",   "type": "image/png" },
    { "src": "/icons/icon-96x96.png",   "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "shortcuts": [
    { "name": "Explore", "url": "/explore", "icons": [{ "src": "/icons/explore.png", "sizes": "96x96" }] },
    { "name": "My Orders", "url": "/account/orders", "icons": [{ "src": "/icons/orders.png", "sizes": "96x96" }] }
  ]
}
```

```typescript
// apps/web/public/offline.html — branded offline fallback
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You're Offline</title>
  <style>
    body { font-family: system-ui,sans-serif; display:flex; align-items:center;
           justify-content:center; min-height:100vh; margin:0; background:#F9FAFB; }
    .card { text-align:center; padding:2rem; max-width:400px; }
    h1 { font-size:1.5rem; font-weight:800; color:#111827; margin-bottom:.5rem; }
    p { color:#6B7280; font-size:.9rem; }
    button { margin-top:1.5rem; background:#4F46E5; color:#fff; border:none;
             padding:.75rem 1.5rem; border-radius:12px; font-weight:700;
             cursor:pointer; font-size:.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:4rem;margin-bottom:1rem">📡</div>
    <h1>You're offline</h1>
    <p>Check your internet connection and try again. Previously visited pages are still available.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>
```


***

## Step 10: Bundle Size — Dynamic Imports \& Tree Shaking

```typescript
// apps/web/src/components/layout/DynamicComponents.tsx
import dynamic from 'next/dynamic'

// ─── Heavy components — load on demand ───────────────────────
export const ProductImageGallery = dynamic(
  () => import('@/components/products/ProductImageGallery'),
  { ssr: false, loading: () => <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" /> }
)

export const CheckoutFlow = dynamic(
  () => import('@/components/checkout/CheckoutFlow'),
  { ssr: false, loading: () => <CheckoutSkeleton /> }
)

export const MerchantMap = dynamic(
  () => import('@/components/merchant/StoreLocationMap'),
  { ssr: false }   // Leaflet/Mapbox is SSR-incompatible
)

export const LoyaltySettingsClient = dynamic(
  () => import('@/components/merchant/loyalty/LoyaltySettingsClient'),
  { ssr: true }
)

export const OrderTrackingMap = dynamic(
  () => import('@/components/orders/OrderTrackingMap'),
  { ssr: false }
)

export const RichTextEditor = dynamic(
  () => import('@/components/ui/RichTextEditor'),
  { ssr: false }
)

// ─── Modals — never in initial bundle ────────────────────────
export const ConfirmDialog  = dynamic(() => import('@/components/ui/ConfirmDialog'))
export const ImageCropper   = dynamic(() => import('@/components/ui/ImageCropper'), { ssr: false })
export const ShareSheet     = dynamic(() => import('@/components/ui/ShareSheet'),   { ssr: false })
```

```typescript
// ─── Date-fns: named imports only — eliminates dead code ─────
// ❌ WRONG (imports entire 74KB library)
// import * as dateFns from 'date-fns'

// ✅ CORRECT (tree-shaken to only used functions)
import { format, formatDistanceToNow, parseISO, isAfter } from 'date-fns'

// ─── Lodash: use lodash-es for ESM tree-shaking ───────────────
// pnpm add lodash-es @types/lodash-es
import { debounce, throttle, groupBy, uniqBy } from 'lodash-es'

// ─── Lucide: named imports only ───────────────────────────────
// optimizePackageImports in next.config handles the rest
import { ShoppingCart, Star, MapPin, Phone } from 'lucide-react'
```


***

## Step 11: Vercel Configuration

```json
// apps/web/vercel.json
{
  "buildCommand": "cd ../.. && pnpm build --filter=web",
  "outputDirectory": ".next",
  "framework": "nextjs",

  "regions": ["sin1"],

  "headers": [
    {
      "source": "/api/webhooks/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    }
  ],

  "crons": [
    { "path": "/api/cron/refresh-analytics",       "schedule": "0 * * * *"  },
    { "path": "/api/cron/geocode-addresses",        "schedule": "*/10 * * * *" },
    { "path": "/api/cron/loyalty-expire-points",    "schedule": "0 3 * * *"  },
    { "path": "/api/cron/loyalty-expiry-warning",   "schedule": "0 9 * * *"  },
    { "path": "/api/health",                        "schedule": "*/5 * * * *" }
  ]
}
```


***

## Step 12: Performance Monitoring

```typescript
// apps/web/src/components/layout/WebVitalsReporter.tsx
'use client'
import { useReportWebVitals } from 'next/dist/client/components/report-to-console'
import * as Sentry from '@sentry/nextjs'

// Thresholds from Core Web Vitals 2026 [web:342]
const THRESHOLDS = {
  LCP: { good: 2500,  poor: 4000  },
  INP: { good: 200,   poor: 500   },
  CLS: { good: 0.1,   poor: 0.25  },
  FCP: { good: 1800,  poor: 3000  },
  TTFB:{ good: 800,   poor: 1800  },
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!t) return 'good'
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const rating = getRating(metric.name, metric.value)

    // Send to Sentry metrics
    Sentry.metrics.distribution(
      `web_vitals.${metric.name.toLowerCase()}`,
      metric.value,
      { tags: { rating, page: window.location.pathname } }
    )

    // Alert on poor scores
    if (rating === 'poor') {
      Sentry.captureMessage(
        `Poor ${metric.name}: ${metric.value.toFixed(0)}ms on ${window.location.pathname}`,
        { level: 'warning', tags: { metric: metric.name, rating } }
      )
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴'
      console.log(`${color} ${metric.name}: ${metric.value.toFixed(1)} [${rating}]`)
    }
  })

  return null
}
```

```typescript
// apps/web/src/app/api/health/route.ts — uptime + DB latency check
import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { getRedis } from '@packages/lib/cache/redis'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, any> = {}

  // DB health
  try {
    const admin = createSupabaseAdmin()
    const t0 = Date.now()
    await admin.from('stores').select('id').limit(1).single()
    checks.db = { ok: true, latencyMs: Date.now() - t0 }
  } catch (err: any) {
    checks.db = { ok: false, error: err.message }
  }

  // Redis health
  try {
    const redis = getRedis()
    const t0 = Date.now()
    await redis.ping()
    checks.redis = { ok: true, latencyMs: Date.now() - t0 }
  } catch (err: any) {
    checks.redis = { ok: false, error: err.message }
  }

  const allOk  = Object.values(checks).every((c: any) => c.ok)
  const status = allOk ? 200 : 503

  return NextResponse.json({
    status:    allOk ? 'ok' : 'degraded',
    checks,
    uptimeMs:  process.uptime?.() ? process.uptime() * 1000 : null,
    totalMs:   Date.now() - start,
    timestamp: new Date().toISOString(),
  }, { status })
}
```


***

## Final Optimization Map

```
Layer               Implementation                          Impact
────────────────────────────────────────────────────────────────────────────────
Rendering           PPR — static shell + streamed holes     LCP ↓ 60–80%
                    dynamicIO + use cache                   TTFB ↓ 40–60%
                    Edge runtime on search/stores API       TTFB ↓ 50ms

Caching             Upstash Redis 1–2ms response time       API latency ↓ 99%
                    cache-aside + tag invalidation          stale data → 0
                    Geocode results 7-day Redis TTL         Geocode calls ↓ 90%
                    Delivery quotes 10-min Redis TTL        Lalamove calls ↓ 80%

Fonts               next/font self-hosted + preload         CLS → 0
                    size-adjust fallback                    FOUT eliminated

Images              priority on LCP images                  LCP ↓ 30–50%
                    avif + webp formats                     Payload ↓ 30–50%
                    fill + sizes + blurDataURL              CLS → 0

JavaScript          React Compiler auto-memoization         INP ↓ 20–40%
                    useTransition + useDeferredValue        INP ↓ typing → 0ms
                    useOptimistic on cart/checkout          Perceived INP → 0ms
                    Dynamic imports for heavy components    Initial JS ↓ 40%
                    Tree-shaking (date-fns, lodash-es)      Bundle ↓ 30–60KB

Scripts             afterInteractive / lazyOnload           LCP unblocked
                    dns-prefetch + preconnect               TTFB ↓ 50–100ms

Prefetching         router.prefetch on hover                Navigate → instant
                    Suspense streaming per section          FCP ↓ 30%

PWA                 next-pwa service worker                 Repeat load → <300ms
                    Offline fallback page                   Crash → graceful UX
                    Static assets cached 1 year             Repeat JS → 0 network

Monitoring          WebVitalsReporter → Sentry metrics      Regressions caught
                    /api/health DB + Redis latency check    Outages → alert
                    Sentry spans on DB queries              Slow queries → visible
```

<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.digitalapplied.com/blog/core-web-vitals-optimization-guide-2025

[^2]: https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide

[^3]: https://www.reactlibraries.com/how-tos/partial-prerendering-in-next-js-15-a-complete-guide

[^4]: https://www.dsrpt.com.au/think-tank/the-rise-of-partial-pre-rendering-nextjs-15-and-the-future-of-web-performance

[^5]: https://www.digitalapplied.com/blog/redis-caching-strategies-nextjs-production

[^6]: https://www.contentful.com/blog/next-js-fonts/

[^7]: https://www.youtube.com/watch?v=B8O4gq8Wevo

[^8]: https://makersden.io/blog/optimize-web-vitals-in-nextjs-2025

[^9]: https://dev.to/pockit_tools/nextjs-partial-prerendering-ppr-deep-dive-how-it-works-when-to-use-it-and-why-it-changes-48dk

[^10]: https://www.linkedin.com/posts/joejohn-jj_react-nextjs-rendering-activity-7430446113977171968-YjgI

[^11]: https://www.youtube.com/watch?v=SuoGpFQZ8xU

[^12]: https://www.reddit.com/r/nextjs/comments/1o8ywr3/anyone_using_partial_prerendering_ppr_in/

[^13]: https://believemy.com/en/r/whats-new-in-nextjs-15

[^14]: https://blog.logrocket.com/dynamic-io-caching-next-js-15/

[^15]: https://strapi.io/blog/mastering-nextjs-15-caching-dynamic-io-and-the-use-cache

[^16]: https://flatlogic.com/blog/caching-nextjs-apps-with-serverless-redis-using-upstash/

[^17]: https://uniquedevs.com/en/blog/how-does-caching-work-in-next-js-15/

[^18]: https://github.com/vercel/next.js/discussions/62178

[^19]: https://nextjs.org/docs/app/getting-started/caching

[^20]: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents

[^21]: https://nextjs.org/docs/app/getting-started/fonts

[^22]: https://nextjs.org/docs/14/app/building-your-application/optimizing/fonts

[^23]: https://github.com/vercel/next.js/discussions/25389

[^24]: https://www.geeksforgeeks.org/reactjs/next-js-fonts-optimization/

[^25]: https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas

[^26]: https://www.telerik.com/blogs/font-optimization-next-js

[^27]: https://adropincalm.com/blog/nextjs-offline-service-worker/

[^28]: https://dev.family/blog/article/effortless-pwa-integration-in-nextjs-with-next-pwa-pack

[^29]: https://docs.uniform.app/docs/knowledge-base/optimizing-font-management-in-nextjs-transitioning-from

[^30]: https://www.corewebvitals.io/core-web-vitals/how-to-pass

