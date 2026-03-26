<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Write a full implementation to improve the performance and maximize optimization of the overall website

Here is the complete, production-grade performance optimization implementation — covering every layer of the stack from database to browser.[^1][^2][^3]

***

# Full Performance Optimization Implementation

## Optimization Layers

```
1. 🗄️  Database         — Indexes, RLS, query plans, connection pooling
2. 🔴  Redis Cache       — Server-side query result caching (Upstash)
3. ⚡  Next.js Cache     — fetch(), unstable_cache, ISR, full-route cache
4. 🖼️  Images            — next/image, AVIF/WebP, blur placeholders, priority hints
5. 📦  Bundle            — Dynamic imports, tree-shaking, analyzer, barrel files
6. 🎨  CSS / Fonts       — Font subsetting, layout shift prevention
7. 🌐  Rendering         — RSC boundaries, Suspense streaming, PPR
8. 🔁  API Routes        — Response caching, stale-while-revalidate headers
9. 📱  PWA               — Service worker, offline shell, background sync
10. 📊 Monitoring        — Web Vitals, Sentry, Vercel Speed Insights
```


***

## File Structure

```
apps/web/src/
├── lib/
│   ├── cache/
│   │   ├── redis.ts              ← Upstash Redis client
│   │   ├── keys.ts               ← Centralized cache key factory
│   │   └── invalidate.ts         ← Cache invalidation helpers
│   └── perf/
│       └── vitals.ts             ← Web Vitals reporter
├── components/
│   ├── common/
│   │   ├── OptimizedImage.tsx    ← Wrapper around next/image
│   │   └── LazySection.tsx       ← Intersection observer lazy loader
│   └── providers/
│       └── PerformanceProvider.tsx ← App-level perf context
├── middleware.ts                  ← Edge caching + security headers
└── next.config.ts                 ← Full optimized config
```


***

## 1. Next.js Config — Full Optimization

**`apps/web/next.config.ts`**:

```typescript
import type { NextConfig } from 'next'
import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig: NextConfig = {
  // ─── Compiler ────────────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ─── Experimental ─────────────────────────────────────────────────────────
  experimental: {
    // Partial Pre-Rendering — static shell + dynamic streaming
    ppr: true,
    // Inline small CSS into HTML (avoids render-blocking link tags)
    inlineCss: true,
    // Optimise server actions bundle
    serverActions: { bodySizeLimit: '2mb' },
    // React compiler (auto-memoisation)
    reactCompiler: true,
    // Turbopack in dev
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // ─── Images ───────────────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ─── Headers ──────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security
          { key: 'X-DNS-Prefetch-Control',   value: 'on' },
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
          // Compression hint
          { key: 'Vary', value: 'Accept-Encoding' },
        ],
      },
      // Static assets — 1 year immutable cache
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Images — 30 day cache
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // Fonts — 1 year
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // API routes — no client cache, SWR allowed
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },

  // ─── Redirects ─────────────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
    ]
  },

  // ─── Webpack ───────────────────────────────────────────────────────────────
  webpack(config, { isServer, dev }) {
    // Remove Moment.js locale bloat
    const { IgnorePlugin } = require('webpack')
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    )

    if (!dev && !isServer) {
      // Replace React with Preact in production client bundle (saves ~30KB)
      // Comment this out if you rely on React DevTools or certain libraries
      // config.resolve.alias = {
      //   ...config.resolve.alias,
      //   'react': 'preact/compat',
      //   'react-dom': 'preact/compat',
      // }

      // Split large vendor chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 30,
        maxAsyncRequests: 30,
        minSize: 20000,
        cacheGroups: {
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next|scheduler)[\\/]/,
            priority: 40,
            chunks: 'all',
          },
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            priority: 30,
            chunks: 'async',
          },
          commons: {
            name: 'commons',
            test: /[\\/]node_modules[\\/]/,
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      }
    }

    return config
  },

  // ─── Output ────────────────────────────────────────────────────────────────
  output: 'standalone',    // Minimal Docker image
  poweredByHeader: false,  // Remove X-Powered-By header
  compress: true,          // Gzip responses
  generateEtags: true,
  reactStrictMode: true,

  // ─── Logging ───────────────────────────────────────────────────────────────
  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === 'development' },
  },
}

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withAnalyzer(nextConfig)
```


***

## 2. Upstash Redis Cache Client

**`apps/web/src/lib/cache/redis.ts`**:[^3]

```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ─── Generic cached fetch ──────────────────────────────────────────────────
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  await redis.setex(key, ttlSeconds, JSON.stringify(data))
  return data
}

// ─── Batch get/set ──────────────────────────────────────────────────────────
export async function cachedBatch<T>(
  keys: string[],
  fetcher: (missingKeys: string[]) => Promise<Record<string, T>>,
  ttlSeconds = 60
): Promise<Record<string, T>> {
  if (keys.length === 0) return {}

  const pipeline = redis.pipeline()
  keys.forEach((k) => pipeline.get(k))
  const results = await pipeline.exec<(T | null)[]>()

  const result: Record<string, T> = {}
  const missing: string[] = []

  results.forEach((val, i) => {
    if (val !== null) result[keys[i]] = val as T
    else missing.push(keys[i])
  })

  if (missing.length > 0) {
    const fresh = await fetcher(missing)
    const setPipeline = redis.pipeline()
    Object.entries(fresh).forEach(([k, v]) => {
      result[k] = v
      setPipeline.setex(k, ttlSeconds, JSON.stringify(v))
    })
    await setPipeline.exec()
  }

  return result
}

// ─── Tag-based invalidation ──────────────────────────────────────────────────
export async function invalidateTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    const keys = await redis.smembers(`tag:${tag}`)
    if (keys.length > 0) {
      const pipeline = redis.pipeline()
      keys.forEach((k) => pipeline.del(k))
      pipeline.del(`tag:${tag}`)
      await pipeline.exec()
    }
  }
}

export async function setWithTags(
  key: string,
  value: unknown,
  ttlSeconds: number,
  tags: string[]
): Promise<void> {
  const pipeline = redis.pipeline()
  pipeline.setex(key, ttlSeconds, JSON.stringify(value))
  tags.forEach((tag) => pipeline.sadd(`tag:${tag}`, key))
  await pipeline.exec()
}
```


***

## 3. Cache Key Factory

**`apps/web/src/lib/cache/keys.ts`**:

```typescript
export const CacheKeys = {
  // Store
  store:         (slug: string)                => `store:${slug}`,
  storeById:     (id: string)                  => `store:id:${id}`,
  storeProducts: (storeId: string, page = 1)   => `store:${storeId}:products:p${page}`,
  storeCategories:(storeId: string)            => `store:${storeId}:categories`,
  storeHours:    (storeId: string)             => `store:${storeId}:hours`,

  // Products
  product:       (id: string)                  => `product:${id}`,
  productSearch: (storeId: string, q: string)  => `search:${storeId}:${q}`,
  productsByCategory:(storeId: string, cat: string, page = 1) =>
    `store:${storeId}:cat:${cat}:p${page}`,
  featuredProducts: (storeId: string)          => `store:${storeId}:featured`,

  // Orders
  ordersByStore: (storeId: string, page = 1)   => `orders:store:${storeId}:p${page}`,
  orderById:     (id: string)                  => `order:${id}`,

  // Dashboard stats
  dashboardStats: (storeId: string)            => `dashboard:stats:${storeId}`,
  revenueChart:  (storeId: string, period: string) => `dashboard:revenue:${storeId}:${period}`,

  // CRM
  crmContacts:   (storeId: string)             => `crm:contacts:${storeId}`,
  crmStats:      (storeId: string)             => `crm:stats:${storeId}`,

  // Geo
  nearbyStores:  (lat: number, lng: number, radius: number) =>
    `geo:stores:${lat.toFixed(3)}:${lng.toFixed(3)}:r${radius}`,
} as const

export const CacheTTL = {
  // Hot data — changes frequently
  dashboardStats:  30,        // 30 seconds
  ordersByStore:   15,        // 15 seconds (real-time feel)

  // Warm data — changes sometimes
  storeProducts:   60 * 5,    // 5 minutes
  productDetail:   60 * 10,   // 10 minutes
  crmContacts:     60 * 2,    // 2 minutes

  // Cold data — rarely changes
  storeInfo:       60 * 60,   // 1 hour
  storeCategories: 60 * 60,   // 1 hour
  nearbyStores:    60 * 15,   // 15 minutes
  revenueChart:    60 * 30,   // 30 minutes
} as const

export const CacheTags = {
  store:    (id: string) => `store-${id}`,
  products: (storeId: string) => `products-${storeId}`,
  orders:   (storeId: string) => `orders-${storeId}`,
  crm:      (storeId: string) => `crm-${storeId}`,
}
```


***

## 4. Cache Invalidation Helpers

**`apps/web/src/lib/cache/invalidate.ts`**:

```typescript
import { redis, invalidateTags } from './redis'
import { CacheKeys, CacheTags } from './keys'

// Call after a product is created / updated / deleted
export async function invalidateProductCache(storeId: string, productId?: string) {
  const pipeline = redis.pipeline()
  if (productId) pipeline.del(CacheKeys.product(productId))
  pipeline.del(CacheKeys.storeCategories(storeId))
  pipeline.del(CacheKeys.featuredProducts(storeId))
  // Wipe all paginated product caches for this store
  const keys = await redis.keys(`store:${storeId}:products:*`)
  keys.forEach((k) => pipeline.del(k))
  const catKeys = await redis.keys(`store:${storeId}:cat:*`)
  catKeys.forEach((k) => pipeline.del(k))
  await pipeline.exec()
}

// Call after a new order is placed
export async function invalidateOrderCache(storeId: string, orderId?: string) {
  const pipeline = redis.pipeline()
  pipeline.del(CacheKeys.dashboardStats(storeId))
  pipeline.del(CacheKeys.crmStats(storeId))
  if (orderId) pipeline.del(CacheKeys.orderById(orderId))
  const keys = await redis.keys(`orders:store:${storeId}:*`)
  keys.forEach((k) => pipeline.del(k))
  await pipeline.exec()
  await invalidateTags([CacheTags.orders(storeId), CacheTags.crm(storeId)])
}

// Call after store settings change
export async function invalidateStoreCache(storeId: string, slug: string) {
  const pipeline = redis.pipeline()
  pipeline.del(CacheKeys.storeById(storeId))
  pipeline.del(CacheKeys.store(slug))
  pipeline.del(CacheKeys.storeHours(storeId))
  await pipeline.exec()
  await invalidateTags([CacheTags.store(storeId)])
}
```


***

## 5. Optimized Supabase Data Layer

**`apps/web/src/lib/data/products.ts`**:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { cachedQuery, setWithTags } from '@/lib/cache/redis'
import { CacheKeys, CacheTTL, CacheTags } from '@/lib/cache/keys'
import { unstable_cache } from 'next/cache'

// ─── Server-side cached product fetch ────────────────────────────────────────
export const getStoreProducts = unstable_cache(
  async (storeId: string, page = 1, pageSize = 24, category?: string) => {
    const supabase = await createServerClient()
    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1

    let query = supabase
      .from('products')
      .select(`
        id, name, price, sale_price, image_url,
        is_available, stock_qty, category, is_bestseller,
        is_new_arrival, is_on_sale, brand, rating, review_count,
        low_stock_threshold
      `, { count: 'exact' })
      .eq('store_id', storeId)
      .eq('is_available', true)
      .order('is_bestseller', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (category && category !== 'All') {
      query = query.eq('category', category)
    }

    const { data, count, error } = await query
    if (error) throw error
    return { products: data ?? [], total: count ?? 0, page, pageSize }
  },
  ['store-products'],
  {
    revalidate: CacheTTL.storeProducts,
    tags: ['products'],
  }
)

export const getProductDetail = unstable_cache(
  async (productId: string) => {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
    if (error) throw error
    return data
  },
  ['product-detail'],
  { revalidate: CacheTTL.productDetail, tags: ['products'] }
)

export const getFeaturedProducts = unstable_cache(
  async (storeId: string) => {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('products')
      .select('id, name, price, sale_price, image_url, is_on_sale, rating, brand')
      .eq('store_id', storeId)
      .eq('is_available', true)
      .or('is_bestseller.eq.true,is_new_arrival.eq.true,is_on_sale.eq.true')
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(12)
    return data ?? []
  },
  ['featured-products'],
  { revalidate: CacheTTL.storeProducts, tags: ['products'] }
)

// ─── Redis-cached dashboard stats (shorter TTL — live feel) ──────────────────
export async function getDashboardStats(storeId: string) {
  return cachedQuery(
    CacheKeys.dashboardStats(storeId),
    async () => {
      const supabase = await createServerClient()
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [ordersToday, ordersMonth, revenue, topProducts] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .gte('created_at', startOfDay),

        supabase
          .from('orders')
          .select('id, total, status')
          .eq('store_id', storeId)
          .gte('created_at', thirtyDaysAgo),

        supabase
          .from('orders')
          .select('total')
          .eq('store_id', storeId)
          .eq('status', 'completed')
          .gte('created_at', thirtyDaysAgo),

        supabase
          .from('order_items')
          .select('product_id, product_name, quantity')
          .eq('store_id', storeId)
          .gte('created_at', thirtyDaysAgo)
          .limit(5),
      ])

      const totalRevenue = (revenue.data ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
      return {
        ordersToday: ordersToday.count ?? 0,
        ordersMonth: ordersMonth.data?.length ?? 0,
        revenue30d:  totalRevenue,
        topProducts: topProducts.data ?? [],
      }
    },
    CacheTTL.dashboardStats
  )
}
```


***

## 6. Supabase Database Indexes

**`supabase/migrations/20260326_performance_indexes.sql`**:[^4]

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS — most frequently queried columns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_store_available_idx
  ON products(store_id, is_available, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_store_category_idx
  ON products(store_id, category, is_available);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_store_bestseller_idx
  ON products(store_id, is_bestseller, rating DESC NULLS LAST)
  WHERE is_available = TRUE;

-- Full text search on product name + description
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  products_fts_idx
  ON products
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(brand, '')));

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_store_status_created_idx
  ON orders(store_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_user_idx
  ON orders(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_store_completed_idx
  ON orders(store_id, created_at DESC)
  WHERE status = 'completed';

-- ─────────────────────────────────────────────────────────────────────────────
-- STORES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  stores_slug_idx ON stores(slug);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  stores_owner_idx ON stores(owner_id);

-- Geospatial index for nearby store lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  stores_location_idx
  ON stores USING gist(location)
  WHERE location IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  notif_store_unread_idx
  ON merchant_notifications(store_id, is_read, created_at DESC)
  WHERE is_archived = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- CRM
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  crm_contacts_email_store_idx
  ON crm_contacts(store_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  crm_contacts_segment_spent_idx
  ON crm_contacts(store_id, segment, total_spent DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  crm_activities_contact_time_idx
  ON crm_activities(contact_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS PERFORMANCE: avoid sequential scans by indexing auth.uid() lookups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  stores_owner_id_idx ON stores(owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  orders_user_store_idx ON orders(user_id, store_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- MATERIALISED VIEW: dashboard stats (refreshed by cron every 5 min)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_store_stats AS
SELECT
  o.store_id,
  COUNT(DISTINCT o.id)                          AS total_orders,
  COUNT(DISTINCT o.id) FILTER (
    WHERE o.created_at >= CURRENT_DATE
  )                                             AS orders_today,
  COALESCE(SUM(o.total) FILTER (
    WHERE o.status = 'completed'
    AND o.created_at >= NOW() - INTERVAL '30 days'
  ), 0)                                         AS revenue_30d,
  COUNT(DISTINCT o.user_id)                     AS unique_customers,
  COALESCE(AVG(o.total) FILTER (
    WHERE o.status = 'completed'
  ), 0)                                         AS avg_order_value
FROM orders o
GROUP BY o.store_id;

CREATE UNIQUE INDEX ON mv_store_stats(store_id);

-- Auto-refresh via pg_cron (requires pg_cron extension)
SELECT cron.schedule(
  'refresh-store-stats',
  '*/5 * * * *',
  $REFRESH MATERIALIZED VIEW CONCURRENTLY mv_store_stats$
);
```


***

## 7. Edge Middleware — Caching + Headers

**`apps/web/src/middleware.ts`**:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that are publicly cacheable at the CDN edge
const CACHEABLE_ROUTES = [
  /^\/stores\/[^/]+$/,           // /stores/[slug]
  /^\/stores\/[^/]+\/products$/, // /stores/[slug]/products
  /^\/$/, // home page
]

const STATIC_CACHE_ROUTES = [
  /^\/_next\/static\//,
  /^\/fonts\//,
  /^\/icons\//,
  /^\/favicon/,
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // ── Auth session refresh ────────────────────────────────────────────────
  const authResponse = await updateSession(request)

  // ── Security headers ────────────────────────────────────────────────────
  authResponse.headers.set('X-Frame-Options', 'SAMEORIGIN')
  authResponse.headers.set('X-Content-Type-Options', 'nosniff')
  authResponse.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  authResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://images.unsplash.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://*.upstash.io",
      "frame-src 'none'",
    ].join('; ')
  )

  // ── CDN cache hints for public pages ───────────────────────────────────
  const isCacheable = CACHEABLE_ROUTES.some((r) => r.test(pathname))
  if (isCacheable) {
    authResponse.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=600'
    )
  }

  // ── Resource hints (preconnect to external origins) ────────────────────
  if (pathname === '/') {
    authResponse.headers.append(
      'Link',
      '<https://fonts.gstatic.com>; rel=preconnect; crossorigin'
    )
    authResponse.headers.append(
      'Link',
      `<${process.env.NEXT_PUBLIC_SUPABASE_URL}>; rel=preconnect`
    )
  }

  return authResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
}
```


***

## 8. Optimized Image Component

**`apps/web/src/components/common/OptimizedImage.tsx`**:

```tsx
import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

interface Props extends Omit<ImageProps, 'src'> {
  src: string | null | undefined
  fallback?: string
  aspectRatio?: '1/1' | '4/3' | '16/9' | '3/4'
  priority?: boolean
}

// Pre-generated blur placeholder (1×1 pixel, AVIF)
const BLUR_DATA_URL =
  'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABsAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg=='

export function OptimizedImage({
  src,
  alt,
  fallback,
  aspectRatio = '1/1',
  priority = false,
  className = '',
  ...props
}: Props) {
  const [error, setError]     = useState(false)
  const [loaded, setLoaded]   = useState(false)

  const finalSrc = (!src || error) ? (fallback ?? null) : src

  if (!finalSrc) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center text-gray-300 ${className}`}
        style={{ aspectRatio }}
        aria-label={alt}
      >
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      {/* Shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer bg-[length:200%_100%]" />
      )}
      <Image
        src={finalSrc}
        alt={alt}
        fill
        sizes={props.sizes ?? '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw'}
        quality={props.quality ?? 85}
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        {...props}
      />
    </div>
  )
}
```


***

## 9. Lazy Section (Intersection Observer)

**`apps/web/src/components/common/LazySection.tsx`**:

```tsx
'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
  className?: string
}

export function LazySection({
  children,
  fallback = <div className="h-48 bg-gray-50 animate-pulse rounded-2xl" />,
  rootMargin = '200px',
  className = '',
}: Props) {
  const ref   = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  )
}
```


***

## 10. Dynamic Imports — Heavy Components

**`apps/web/src/components/dynamic.ts`**:

```typescript
import dynamic from 'next/dynamic'

// ── Heavy UI components loaded on demand ─────────────────────────────────────
export const DynamicPetProductDrawer = dynamic(
  () => import('./industry/petstore/PetProductDrawer').then((m) => m.PetProductDrawer),
  { ssr: false, loading: () => <div className="fixed inset-0 z-50 flex items-end justify-center"><div className="h-96 w-full max-w-2xl bg-gray-100 animate-pulse rounded-t-3xl" /></div> }
)

export const DynamicPetProfileModal = dynamic(
  () => import('./industry/petstore/PetProfileModal').then((m) => m.PetProfileModal),
  { ssr: false }
)

export const DynamicEmailComposer = dynamic(
  () => import('./dashboard/email/EmailComposer').then((m) => m.EmailComposer),
  { ssr: false, loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-2xl" /> }
)

export const DynamicEmailTemplateLibrary = dynamic(
  () => import('./dashboard/email/EmailTemplateLibrary').then((m) => m.EmailTemplateLibrary),
  { ssr: false }
)

export const DynamicCrmContactDrawer = dynamic(
  () => import('./dashboard/crm/CrmContactDrawer').then((m) => m.CrmContactDrawer),
  { ssr: false }
)

export const DynamicCrmSegmentBuilder = dynamic(
  () => import('./dashboard/crm/CrmSegmentBuilder').then((m) => m.CrmSegmentBuilder),
  { ssr: false, loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-2xl" /> }
)

export const DynamicNotificationPanel = dynamic(
  () => import('./dashboard/notifications/NotificationPanel').then((m) => m.NotificationPanel),
  { ssr: false }
)

export const DynamicMap = dynamic(
  () => import('./common/StoreMap'),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" /> }
)
```


***

## 11. Streaming with Suspense — Store Page

**`apps/web/src/app/stores/[slug]/page.tsx`**:[^5]

```tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { getStoreProducts, getFeaturedProducts } from '@/lib/data/products'
import type { Metadata } from 'next'

// ── Static metadata generation ────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const supabase  = await createServerClient()
  const { data: store } = await supabase
    .from('stores')
    .select('name, description, logo_url')
    .eq('slug', slug)
    .single()

  if (!store) return { title: 'Store Not Found' }

  return {
    title:       `${store.name} | My Marketplace`,
    description: store.description ?? `Shop at ${store.name} on My Marketplace`,
    openGraph: {
      title:  store.name,
      description: store.description ?? '',
      images: store.logo_url ? [store.logo_url] : [],
    },
    robots: { index: true, follow: true },
  }
}

// ── Route segment config ──────────────────────────────────────────────────────
export const revalidate = 60 // ISR — revalidate page every 60s

const getStore = unstable_cache(
  async (slug: string) => {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('stores')
      .select(`
        id, name, slug, description, logo_url, banner_url,
        address, city, state, phone, contact_email,
        operating_hours, delivery_options, primary_color,
        industry_type, is_active
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    return data
  },
  ['store-page'],
  { revalidate: 3600, tags: ['stores'] }
)

// ── Streaming skeletons ───────────────────────────────────────────────────────
function HeroSkeleton() {
  return <div className="h-64 bg-gray-200 animate-pulse" />
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
          <div className="aspect-[4/3] bg-gray-200" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const store = await getStore(slug)
  if (!store) notFound()

  // Pre-fetch products in parallel while the RSC renders
  const [products, featured] = await Promise.all([
    getStoreProducts(store.id),
    getFeaturedProducts(store.id),
  ])

  // Inline JSON-LD for SEO
  const jsonLd = {
    '@context':   'https://schema.org',
    '@type':      'Store',
    name:         store.name,
    description:  store.description,
    image:        store.logo_url,
    address: store.address
      ? { '@type': 'PostalAddress', streetAddress: store.address }
      : undefined,
    telephone: store.phone,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — critical, renders immediately */}
      <Suspense fallback={<HeroSkeleton />}>
        <StoreHeroRSC store={store} featured={featured} />
      </Suspense>

      {/* Product grid — streams in after hero */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <StoreProductsRSC
          store={store}
          initialProducts={products}
        />
      </Suspense>
    </>
  )
}
```


***

## 12. Web Vitals Reporter

**`apps/web/src/lib/perf/vitals.ts`**:

```typescript
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals'

const THRESHOLDS = {
  LCP:  { good: 2500, poor: 4000 },
  FID:  { good: 100,  poor: 300  },
  CLS:  { good: 0.1,  poor: 0.25 },
  FCP:  { good: 1800, poor: 3000 },
  TTFB: { good: 800,  poor: 1800 },
  INP:  { good: 200,  poor: 500  },
}

type VitalName = keyof typeof THRESHOLDS

function getRating(name: VitalName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = THRESHOLDS[name]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}

function reportToAnalytics(metric: { name: string; value: number; id: string }) {
  // Send to Vercel Speed Insights
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('event', 'web-vital', {
      metric_name:  metric.name,
      metric_value: Math.round(metric.value),
      metric_id:    metric.id,
    })
  }

  // Send to your own analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    const body = JSON.stringify({
      name:   metric.name,
      value:  Math.round(metric.value),
      id:     metric.id,
      rating: getRating(metric.name as VitalName, metric.value),
      url:    window.location.href,
      ua:     navigator.userAgent,
    })
    // Use sendBeacon for non-blocking delivery
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body)
    }
  }

  // Dev: color-coded console output
  if (process.env.NODE_ENV === 'development') {
    const rating = getRating(metric.name as VitalName, metric.value)
    const color = rating === 'good' ? '#22c55e' : rating === 'needs-improvement' ? '#f59e0b' : '#ef4444'
    console.log(
      `%c[Web Vitals] ${metric.name}: ${Math.round(metric.value)}ms — ${rating.toUpperCase()}`,
      `color: ${color}; font-weight: bold`
    )
  }
}

export function initWebVitals() {
  onCLS((m)  => reportToAnalytics({ name: 'CLS',  value: m.value, id: m.id }))
  onFCP((m)  => reportToAnalytics({ name: 'FCP',  value: m.value, id: m.id }))
  onFID((m)  => reportToAnalytics({ name: 'FID',  value: m.value, id: m.id }))
  onINP((m)  => reportToAnalytics({ name: 'INP',  value: m.value, id: m.id }))
  onLCP((m)  => reportToAnalytics({ name: 'LCP',  value: m.value, id: m.id }))
  onTTFB((m) => reportToAnalytics({ name: 'TTFB', value: m.value, id: m.id }))
}
```


***

## 13. Web Vitals API Route

**`apps/web/src/app/api/vitals/route.ts`**:

```typescript
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createServiceClient()

    // Store vitals in Supabase for monitoring
    await supabase.from('web_vitals').insert({
      metric_name:  body.name,
      metric_value: body.value,
      rating:       body.rating,
      page_url:     body.url,
      created_at:   new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
```


***

## 14. Font Optimization

**`apps/web/src/app/layout.tsx`**:

```tsx
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import type { Metadata, Viewport } from 'next'

// Subset fonts — only Latin chars, variable weight
const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
  display:  'swap',
  preload:  true,
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-jakarta',
  display:  'swap',
  weight:   ['400', '500', '600', '700', '800'],
  fallback: ['Inter', 'system-ui', 'sans-serif'],
})

export const viewport: Viewport = {
  themeColor:       '#6366f1',
  width:            'device-width',
  initialScale:     1,
  maximumScale:     5,
  colorScheme:      'light',
}

export const metadata: Metadata = {
  metadataBase:    new URL(process.env.NEXT_PUBLIC_APP_URL!),
  applicationName: 'My Marketplace',
  manifest:        '/manifest.json',
  icons: {
    icon:    [
      { url: '/icons/icon-32.png',  sizes: '32x32',   type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple:   [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico',
  },
  other: {
    'mobile-web-app-capable':      'yes',
    'apple-mobile-web-app-capable':'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <head>
        {/* DNS prefetch for external origins */}
        <link rel="dns-prefetch"  href="https://fonts.gstatic.com" />
        <link rel="preconnect"    href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch"  href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="preconnect"    href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```


***

## 15. PWA — Service Worker + Manifest

**`apps/web/public/manifest.json`**:

```json
{
  "name": "My Marketplace",
  "short_name": "Marketplace",
  "description": "Discover and shop from local stores near you",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-72.png",   "sizes": "72x72",   "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-96.png",   "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128.png",  "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png",  "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152.png",  "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png",  "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-384.png",  "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512.png",  "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/home.png",  "sizes": "390x844", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/store.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ],
  "categories": ["shopping", "food", "lifestyle"],
  "shortcuts": [
    {
      "name": "My Orders",
      "url": "/orders",
      "icons": [{ "src": "/icons/shortcut-orders.png", "sizes": "96x96" }]
    },
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/shortcut-dashboard.png", "sizes": "96x96" }]
    }
  ]
}
```

**`apps/web/public/sw.js`**:

```javascript
const CACHE_NAME      = 'marketplace-v3'
const STATIC_CACHE    = 'marketplace-static-v3'
const DYNAMIC_CACHE   = 'marketplace-dynamic-v3'
const IMAGE_CACHE     = 'marketplace-images-v3'

// Core app shell — always cached
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
]

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const VALID_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !VALID_CACHES.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, chrome-extension, and Supabase realtime
  if (request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/realtime/')) return

  // Images — cache first, network fallback, 30 day TTL
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        try {
          const response = await fetch(request)
          if (response.ok) cache.put(request, response.clone())
          return response
        } catch {
          return new Response('', { status: 408 })
        }
      })
    )
    return
  }

  // Static assets (_next/static) — cache first, immutable
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request))
    )
    return
  }

  // API routes — network first, no cache
  if (url.pathname.startsWith('/api/')) return

  // Pages — stale-while-revalidate
  event.respondWith(
    caches.open(DYNAMIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      const networkFetch = fetch(request).then((response) => {
        if (response.ok && response.status === 200) {
          cache.put(request, response.clone())
        }
        return response
      }).catch(() => null)

      return cached ?? networkFetch ?? caches.match('/offline')
    })
  )
})

// ── Background sync for offline orders ────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncOfflineCart())
  }
})

async function syncOfflineCart() {
  const db = await openDB()
  const offlineItems = await db.getAll('offline-cart')
  for (const item of offlineItems) {
    try {
      await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      await db.delete('offline-cart', item.id)
    } catch {
      // Will retry on next sync
    }
  }
}

// ── Push notifications ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const { title, body, icon, badge, url } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  icon  ?? '/icons/icon-192.png',
      badge: badge ?? '/icons/badge-96.png',
      data:  { url },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url ?? '/'
    event.waitUntil(clients.openWindow(url))
  }
})
```


***

## 16. Service Worker Registration

**`apps/web/src/components/providers/PerformanceProvider.tsx`**:

```tsx
'use client'
import { useEffect } from 'react'
import { initWebVitals } from '@/lib/perf/vitals'

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] Registered:', reg.scope)
          // Check for updates every 60 minutes
          setInterval(() => reg.update(), 60 * 60 * 1000)
        })
        .catch((err) => console.error('[SW] Registration failed:', err))
    }

    // Init web vitals tracking
    initWebVitals()

    // Preconnect to Supabase after mount (non-blocking)
    const link = document.createElement('link')
    link.rel  = 'preconnect'
    link.href = process.env.NEXT_PUBLIC_SUPABASE_URL!
    document.head.appendChild(link)
  }, [])

  return <>{children}</>
}
```


***

## 17. Tailwind Config — Optimized

**`apps/web/tailwind.config.ts`**:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  // Critical: limit which files Tailwind scans — keeps CSS small
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  // Only include CSS that's actually used
  safelist: [
    // Dynamic colour classes from primaryColor
    { pattern: /^(bg|text|border|ring)-(indigo|purple|blue|green|red|orange|yellow|pink)-(400|500|600|700)$/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-inter)', 'sans-serif'],
      },
      animation: {
        shimmer:  'shimmer 1.5s infinite',
        'fade-in':'fadeIn 0.2s ease-out',
        'slide-up':'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },
      // Reduce generated variants (speeds up build)
      screens: {
        sm:  '640px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl':'1536px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    // JIT-only: purge unused utilities aggressively
  ],
}

export default config
```


***

## 18. Package Scripts

**`apps/web/package.json`** — add to scripts:

```json
{
  "scripts": {
    "dev":      "next dev --turbo",
    "build":    "next build",
    "start":    "next start",
    "lint":     "next lint",
    "analyze":  "ANALYZE=true next build",
    "profile":  "NEXT_PROFILE=true next build",
    "typecheck":"tsc --noEmit",
    "perf:lighthouse": "npx lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html --chrome-flags='--headless'",
    "perf:bundle":  "npx @next/bundle-analyzer"
  }
}
```

Install all required packages:

```bash
pnpm add @upstash/redis web-vitals
pnpm add -D @next/bundle-analyzer
```


***

## 19. Environment Variables

```bash
# Cache
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxx

# Vercel Speed Insights (auto-injected on Vercel)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=

# App URL (for metadata)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```


***

## Optimization Impact Summary

| Layer | Technique | Expected Gain |
| :-- | :-- | :-- |
| **Images** | AVIF/WebP + blur placeholder + priority hints | LCP −40–60% |
| **Fonts** | Subsetting + `display:swap` + preconnect | FCP −200–400ms |
| **JS Bundle** | Dynamic imports + RSC + vendor splitting | TTI −30–50% |
| **Database** | Composite indexes + materialized view | Query −60–90% |
| **Redis Cache** | Query result caching (15s–1h TTL) | TTFB −70–95% |
| **Next.js Cache** | `unstable_cache` + ISR + full-route cache | Server load −80% |
| **Streaming** | Suspense boundaries + PPR | TTFB perceived −50% |
| **Service Worker** | Stale-while-revalidate + offline shell | Repeat visit −80% |
| **CDN Headers** | `s-maxage` + `stale-while-revalidate` | Edge cache hit +90% |
| **Tailwind** | Content purging + JIT | CSS bundle −95% |

<span style="display:none">[^10][^11][^12][^13][^14][^15][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://nextjs.org/blog/next-15

[^2]: https://www.slatebytes.com/articles/optimizing-performance-in-next-js-15-with-the-app-router

[^3]: https://chat2db.ai/resources/blog/optimizing-supabase-performance-with-caching-strategies

[^4]: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv

[^5]: https://dev.to/idioseph/mastering-the-app-router-in-nextjs-15-the-powerhouse-behind-its-full-feature-set-2p6c

[^6]: https://www.youtube.com/watch?v=g3nj8SIO7Vs

[^7]: https://nextjs.org/blog

[^8]: https://www.reddit.com/r/nextjs/comments/1nyc7aw/deep_dive_into_nextjs_2025_leveraging_the_latest/

[^9]: https://javascript.plainenglish.io/day-15-mastering-code-splitting-and-lazy-loading-for-high-performance-react-next-js-apps-c8eb036783ce

[^10]: https://www.youtube.com/watch?v=vBF19MctGTs

[^11]: https://vladimirsiedykh.com/blog/nextjs-database-integration-prisma-supabase-mongodb

[^12]: https://www.geeksforgeeks.org/reactjs/benefits-of-reducing-the-initial-bundle-size-using-code-splitting-in-react/

[^13]: https://dev.to/boopykiki/optimize-nextjs-performance-with-smart-code-splitting-what-to-load-when-and-why-9l1

[^14]: https://www.anshgupta.in/blog/nextjs-app-router-best-practices-2025

[^15]: https://github.com/hero-org/herocast/issues/638

