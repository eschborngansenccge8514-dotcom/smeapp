<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Write a full implementation to make the merchant subdomain functional

Here is the complete end-to-end implementation for merchant subdomains — covering middleware routing, local dev, Vercel deployment, custom domains, and the merchant domain management UI.[^1][^2][^3]

***

# Merchant Subdomain — Full Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Request Flow                                                    │
│                                                                  │
│  slug.mymarket.com/products/123                                  │
│         │                                                        │
│         ▼                                                        │
│    middleware.ts                                                 │
│    ① detect subdomain / custom domain                           │
│    ② look up store slug in Supabase (edge-compatible)           │
│    ③ rewrite URL → /stores/slug/products/123 (internal)         │
│    ④ set x-store-slug + x-store-domain headers                  │
│         │                                                        │
│         ▼                                                        │
│    Next.js App Router serves /stores/[slug]/...                 │
│    (same page files — works for BOTH URL forms)                 │
└─────────────────────────────────────────────────────────────────┘

Routing Matrix:
─────────────────────────────────────────────────────────────────
  mymarket.com               → (main) layout  → homepage
  www.mymarket.com           → (main) layout  → homepage
  app.mymarket.com           → reserved       → merchant dashboard login
  slug.mymarket.com          → stores/[slug]  → store homepage
  slug.mymarket.com/checkout → stores/[slug]/checkout
  brandstore.com             → custom domain  → stores/[slug] (via DB lookup)
─────────────────────────────────────────────────────────────────
```


***

## File Structure

```
apps/web/
├── middleware.ts                              ← Core subdomain router
├── next.config.ts                             ← Hostname allowlist + images
├── .env.local                                 ← New env vars
└── src/
    ├── lib/
    │   ├── tenant.ts                          ← Read tenant ctx in RSC/actions
    │   ├── domain-cache.ts                    ← Edge-safe domain→slug cache
    │   └── actions/
    │       └── domains.ts                     ← Custom domain Server Actions
    ├── app/
    │   ├── stores/[slug]/
    │   │   ├── layout.tsx                     ← Tenant-aware shell
    │   │   └── _components/
    │   │       └── SubdomainAwareLink.tsx      ← Smart Link component
    │   └── (merchant)/
    │       └── dashboard/settings/
    │           └── domain/page.tsx            ← Domain mgmt UI
    └── components/
        └── tenant/
            └── TenantThemeProvider.tsx        ← Inject store brand colours
```


***

## 1. Environment Variables

**`.env.local`**:

```bash
# ─── Domain configuration ───────────────────────────────────────────────────
NEXT_PUBLIC_ROOT_DOMAIN=mymarket.com          # Production root domain
NEXT_PUBLIC_APP_URL=https://mymarket.com

# ─── Vercel API (for programmatic custom domain registration) ────────────────
VERCEL_ACCESS_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=your_vercel_project_id
VERCEL_TEAM_ID=your_vercel_team_id            # optional, for team projects

# ─── Reserved subdomains (never treated as store slugs) ─────────────────────
# Managed in middleware — no env var needed
```

**`next.config.ts`** — add wildcard hostname + image domain:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.mymarket.com' },
      { protocol: 'https', hostname: '**.supabase.co'  },
      { protocol: 'https', hostname: '**.supabase.in'  },
      // Allow any custom domain (for merchant logos served from their domain)
      { protocol: 'https', hostname: '**'              },
    ],
  },

  // Allow cross-origin requests from tenant subdomains
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*.mymarket.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        ],
      },
    ]
  },
}

export default nextConfig
```


***

## 2. Domain Cache (Edge-Safe)

Middleware runs on the Edge runtime — it cannot use the Node.js Supabase client directly. We use the lightweight `@supabase/ssr` with a tiny in-process memory cache to avoid hitting the DB on every request.[^4]

**`apps/web/src/lib/domain-cache.ts`**:

```typescript
import { createServerClient } from '@supabase/ssr'

// In-process edge cache — survives across requests in the same isolate
const CACHE = new Map<string, { slug: string; ts: number }>()
const TTL   = 5 * 60 * 1000  // 5 minutes

export async function resolveCustomDomainToSlug(
  hostname: string,
  reqCookies: () => { getAll: () => { name: string; value: string }[] }
): Promise<string | null> {
  const cached = CACHE.get(hostname)
  if (cached && Date.now() - cached.ts < TTL) {
    return cached.slug
  }

  // Use a minimal Supabase client — reads only, no cookie write needed
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: reqCookies().getAll,
        setAll: () => {},   // read-only — no session needed for this lookup
      },
    }
  )

  const { data } = await supabase
    .from('stores')
    .select('slug')
    .eq('custom_domain', hostname)
    .eq('is_active', true)
    .eq('domain_verified', true)
    .single()

  if (data?.slug) {
    CACHE.set(hostname, { slug: data.slug, ts: Date.now() })
    return data.slug
  }

  // Cache negative result too (prevents DB hammering on invalid domains)
  CACHE.set(hostname, { slug: '__NOT_FOUND__', ts: Date.now() })
  return null
}

export function invalidateDomainCache(hostname: string) {
  CACHE.delete(hostname)
}
```


***

## 3. Core Middleware

**`apps/web/middleware.ts`**:[^2][^3][^4]

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import { resolveCustomDomainToSlug } from '@/lib/domain-cache'

// ── Constants ────────────────────────────────────────────────────────────────
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mymarket.com'

// Subdomains that are part of the platform — never store routes
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'dashboard', 'admin',
  'mail', 'smtp', 'ftp', 'staging', 'dev', 'preview',
])

// Public paths that don't require auth even on store subdomains
const PUBLIC_PATHS = ['/', '/about', '/contact', '/privacy', '/terms']

// Static asset pattern — skip middleware entirely
const STATIC_ASSET = /^\/(_next\/|favicon\.ico|robots\.txt|sitemap\.xml|.*\.\w{2,5}$)/

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractSubdomain(hostname: string): string | null {
  // Local dev: storeslug.localhost → 'storeslug'
  if (hostname.includes('.localhost')) {
    const sub = hostname.split('.')[^0]
    return sub === 'localhost' ? null : sub
  }

  // Vercel preview: storeslug---branch.vercel.app → 'storeslug'
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    return hostname.split('---')[^0]
  }

  // Production: slug.mymarket.com → 'slug'
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length))
    return sub || null
  }

  return null
}

function isRootDomain(hostname: string): boolean {
  return (
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  )
}

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname     = (request.headers.get('host') ?? '').split(':')[^0]

  // ① Skip static assets immediately — no processing cost
  if (STATIC_ASSET.test(pathname)) return NextResponse.next()

  // ② Refresh Supabase auth session on ALL requests
  const supabaseResponse = await refreshSupabaseSession(request)

  // ③ Root domain — no rewrite needed
  if (isRootDomain(hostname)) return supabaseResponse

  // ④ Determine store slug (from subdomain or custom domain)
  let storeSlug: string | null = null
  let isCustomDomain = false

  const subdomain = extractSubdomain(hostname)

  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
    storeSlug = subdomain

  } else if (!subdomain && !isRootDomain(hostname)) {
    // This hostname is not a subdomain of ROOT_DOMAIN — treat as custom domain
    storeSlug      = await resolveCustomDomainToSlug(hostname, () => request.cookies)
    isCustomDomain = true
  }

  // ⑤ Reserved subdomain (www, app, dashboard, etc.) — pass through
  if (subdomain && RESERVED_SUBDOMAINS.has(subdomain)) {
    return supabaseResponse
  }

  // ⑥ Unknown custom domain
  if (isCustomDomain && !storeSlug) {
    return new NextResponse(
      buildErrorPage('Store not found', 'This domain is not linked to any active store.'),
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (!storeSlug) return supabaseResponse

  // ⑦ Rewrite to /stores/[slug]/...
  const rewriteUrl      = request.nextUrl.clone()
  rewriteUrl.pathname   = `/stores/${storeSlug}${pathname === '/' ? '' : pathname}`

  const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        // Pass tenant context to Server Components via headers
        'x-store-slug':        storeSlug,
        'x-store-hostname':    hostname,
        'x-store-is-subdomain': isCustomDomain ? '0' : '1',
      }),
    },
  })

  // Copy Supabase auth cookies from session refresh to rewrite response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    rewriteResponse.cookies.set(cookie)
  })

  return rewriteResponse
}

// ── Supabase session refresh (required on every request) ─────────────────────
async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: ()                     => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session — DO NOT remove
  await supabase.auth.getUser()
  return response
}

// ── Simple 404 HTML for unknown custom domains ────────────────────────────────
function buildErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html><html><head><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
  .box{text-align:center;max-width:400px;padding:2rem}h1{font-size:2rem;color:#111}p{color:#6b7280}</style>
  </head><body><div class="box"><h1>🏪</h1><h1>${title}</h1><p>${message}</p>
  <a href="https://${ROOT_DOMAIN}" style="color:#6366f1;font-weight:bold">← Go to Marketplace</a>
  </div></body></html>`
}

// ── Matcher — what middleware runs on ────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico  (browser default)
     * - Static file extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
}
```


***

## 4. Tenant Context Helper

**`apps/web/src/lib/tenant.ts`**:

```typescript
import { headers } from 'next/headers'
import { cache }   from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache }     from 'next/cache'
import type { Store }         from '@/types/customer'

// ── Read tenant context injected by middleware (Server Components only) ───────
export async function getTenantContext(): Promise<{
  storeSlug:     string | null
  storeHostname: string | null
  isSubdomain:   boolean
}> {
  const h = await headers()
  return {
    storeSlug:     h.get('x-store-slug'),
    storeHostname: h.get('x-store-hostname'),
    isSubdomain:   h.get('x-store-is-subdomain') === '1',
  }
}

// ── Fetch full store data by slug (cached per request via React cache()) ─────
export const getStoreBySlug = cache(
  unstable_cache(
    async (slug: string): Promise<Store | null> => {
      const supabase = await createServerClient()
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      return data as Store | null
    },
    ['store-by-slug'],
    { revalidate: 60, tags: ['stores'] }
  )
)

// ── Build a URL that works on both subdomain and /stores/[slug] contexts ─────
export function buildStoreUrl(
  slug: string,
  path: string,
  opts: { subdomain?: boolean; customDomain?: string | null } = {}
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mymarket.com'

  if (opts.customDomain) {
    return `https://${opts.customDomain}${cleanPath}`
  }

  if (opts.subdomain) {
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const host     = process.env.NODE_ENV === 'development'
      ? `${slug}.localhost:3000`
      : `${slug}.${rootDomain}`
    return `${protocol}://${host}${cleanPath}`
  }

  return `/stores/${slug}${cleanPath}`
}
```


***

## 5. Database Migration

**`supabase/migrations/20260326_store_domains.sql`**:

```sql
-- ── Add domain fields to stores ───────────────────────────────────────────────
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS custom_domain        TEXT   UNIQUE,
  ADD COLUMN IF NOT EXISTS domain_verified      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS domain_verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subdomain_active     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS domain_txt_record    TEXT;   -- for DNS verification

-- Ensure slug is unique and URL-safe
ALTER TABLE public.stores
  ADD CONSTRAINT stores_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$');

CREATE INDEX IF NOT EXISTS stores_custom_domain_idx
  ON public.stores(custom_domain)
  WHERE custom_domain IS NOT NULL AND domain_verified = TRUE;

CREATE INDEX IF NOT EXISTS stores_slug_active_idx
  ON public.stores(slug, is_active);

-- RLS: customers and public can read basic store info for domain verification
CREATE POLICY "stores_public_domain_read" ON public.stores
  FOR SELECT USING (
    is_active = true AND (
      subdomain_active = true OR
      (custom_domain IS NOT NULL AND domain_verified = true)
    )
  );
```


***

## 6. Domain Management Server Actions

**`apps/web/src/lib/actions/domains.ts`**:[^1]

```typescript
'use server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerClient }            from '@/lib/supabase/server'
import { invalidateDomainCache }         from '@/lib/domain-cache'
import crypto                            from 'crypto'

// ── Add a custom domain (calls Vercel Domains API + writes to DB) ─────────────
export async function addCustomDomain(
  storeId: string,
  domain: string
): Promise<{ success: boolean; txtRecord?: string; error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, custom_domain')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) throw new Error('Store not found or access denied')

  // Clean domain input
  const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

  // Generate a TXT record value for DNS verification
  const txtRecord = `mymarket-verify=${crypto.randomBytes(16).toString('hex')}`

  // Register with Vercel Domains API
  const vercelRes = await registerDomainWithVercel(cleanDomain)
  if (!vercelRes.success) {
    return { success: false, error: vercelRes.error }
  }

  // Save to DB (unverified until DNS check passes)
  const { error } = await supabase
    .from('stores')
    .update({
      custom_domain:     cleanDomain,
      domain_verified:   false,
      domain_txt_record: txtRecord,
    })
    .eq('id', storeId)

  if (error) return { success: false, error: error.message }

  revalidateTag('stores')
  return { success: true, txtRecord }
}

// ── Verify DNS TXT record ─────────────────────────────────────────────────────
export async function verifyCustomDomain(
  storeId: string
): Promise<{ verified: boolean; error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: store } = await supabase
    .from('stores')
    .select('custom_domain, domain_txt_record')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store?.custom_domain) return { verified: false, error: 'No custom domain set' }

  // DNS TXT lookup via Cloudflare DoH (works in Edge/Node)
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=_mymarket-verify.${store.custom_domain}&type=TXT`,
      { headers: { Accept: 'application/dns-json' } }
    )
    const data = await response.json()

    const txtValues: string[] = (data.Answer ?? [])
      .map((r: any) => r.data.replace(/"/g, ''))

    const verified = txtValues.includes(store.domain_txt_record ?? '')

    if (verified) {
      await supabase
        .from('stores')
        .update({
          domain_verified:    true,
          domain_verified_at: new Date().toISOString(),
        })
        .eq('id', storeId)

      invalidateDomainCache(store.custom_domain)
      revalidateTag('stores')
    }

    return { verified }
  } catch {
    return { verified: false, error: 'DNS lookup failed. Try again in a few minutes.' }
  }
}

// ── Remove custom domain ──────────────────────────────────────────────────────
export async function removeCustomDomain(storeId: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: store } = await supabase
    .from('stores')
    .select('custom_domain, owner_id')
    .eq('id', storeId)
    .eq('owner_id', user.id)
    .single()

  if (!store) throw new Error('Store not found or access denied')

  if (store.custom_domain) {
    // Remove from Vercel
    await removeDomainFromVercel(store.custom_domain)
    invalidateDomainCache(store.custom_domain)
  }

  await supabase
    .from('stores')
    .update({
      custom_domain:     null,
      domain_verified:   false,
      domain_verified_at:null,
      domain_txt_record: null,
    })
    .eq('id', storeId)

  revalidateTag('stores')
  revalidatePath(`/dashboard/settings/domain`)
}

// ── Vercel API helpers ────────────────────────────────────────────────────────
async function registerDomainWithVercel(
  domain: string
): Promise<{ success: boolean; error?: string }> {
  const token     = process.env.VERCEL_ACCESS_TOKEN!
  const projectId = process.env.VERCEL_PROJECT_ID!
  const teamId    = process.env.VERCEL_TEAM_ID

  const url = teamId
    ? `https://api.vercel.com/v10/projects/${projectId}/domains?teamId=${teamId}`
    : `https://api.vercel.com/v10/projects/${projectId}/domains`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  })

  if (!res.ok) {
    const body = await res.json()
    // Domain already added is not a fatal error
    if (body.error?.code === 'domain_already_in_use_by_project') {
      return { success: true }
    }
    return { success: false, error: body.error?.message ?? 'Vercel API error' }
  }

  return { success: true }
}

async function removeDomainFromVercel(domain: string): Promise<void> {
  const token     = process.env.VERCEL_ACCESS_TOKEN!
  const projectId = process.env.VERCEL_PROJECT_ID!
  const teamId    = process.env.VERCEL_TEAM_ID

  const url = teamId
    ? `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`
    : `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`

  await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
```


***

## 7. Updated Store Layout (Tenant-Aware)

**`apps/web/src/app/stores/[slug]/layout.tsx`**:

```tsx
import { notFound }      from 'next/navigation'
import { getStoreBySlug, getTenantContext } from '@/lib/tenant'
import { TenantThemeProvider }              from '@/components/tenant/TenantThemeProvider'
import { StoreNavbar }                      from './_components/StoreNavbar'
import { StoreFooter }                      from './_components/StoreFooter'
import type { Metadata }                    from 'next'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

// ── Dynamic metadata per store ────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug }  = await params
  const store     = await getStoreBySlug(slug)
  if (!store) return {}

  const { storeHostname, isSubdomain } = await getTenantContext()
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN

  // Canonical URL points to the store's primary domain
  const canonical = store.custom_domain
    ? `https://${store.custom_domain}`
    : isSubdomain
      ? `https://${slug}.${rootDomain}`
      : `https://${rootDomain}/stores/${slug}`

  return {
    title:       { default: store.name, template: `%s | ${store.name}` },
    description: store.description ?? `Shop at ${store.name}`,
    metadataBase: new URL(canonical),
    alternates:   { canonical },
    openGraph: {
      title:       store.name,
      description: store.description ?? '',
      url:         canonical,
      siteName:    store.name,
      images:      store.banner_url ? [{ url: store.banner_url }] : [],
      type:        'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       store.name,
      description: store.description ?? '',
      images:      store.banner_url ? [store.banner_url] : [],
    },
  }
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default async function StoreLayout({ children, params }: Props) {
  const { slug } = await params
  const store    = await getStoreBySlug(slug)
  if (!store) notFound()

  const { isSubdomain } = await getTenantContext()

  return (
    <TenantThemeProvider
      primaryColor={store.primary_color ?? '#6366f1'}
      fontFamily={store.font_family ?? 'Inter'}
    >
      <div className="min-h-screen flex flex-col bg-white" data-store={slug}>
        <StoreNavbar store={store} isSubdomain={isSubdomain} />
        <main className="flex-1">
          {children}
        </main>
        <StoreFooter store={store} />
      </div>
    </TenantThemeProvider>
  )
}
```


***

## 8. Tenant Theme Provider

**`apps/web/src/components/tenant/TenantThemeProvider.tsx`**:

```tsx
'use client'
import { useEffect } from 'react'

interface Props {
  primaryColor: string
  fontFamily:   string
  children:     React.ReactNode
}

export function TenantThemeProvider({ primaryColor, fontFamily, children }: Props) {
  useEffect(() => {
    // Inject CSS variables into :root for this store's brand
    const root = document.documentElement
    root.style.setProperty('--store-primary',    primaryColor)
    root.style.setProperty('--store-primary-10', `${primaryColor}1a`)
    root.style.setProperty('--store-primary-20', `${primaryColor}33`)

    // Convert hex → HSL for Tailwind-compatible usage
    const hsl = hexToHSL(primaryColor)
    root.style.setProperty('--store-h', String(hsl.h))
    root.style.setProperty('--store-s', `${hsl.s}%`)
    root.style.setProperty('--store-l', `${hsl.l}%`)

    return () => {
      root.style.removeProperty('--store-primary')
      root.style.removeProperty('--store-primary-10')
      root.style.removeProperty('--store-primary-20')
      root.style.removeProperty('--store-h')
      root.style.removeProperty('--store-s')
      root.style.removeProperty('--store-l')
    }
  }, [primaryColor])

  // Inject Google Font for this store
  useEffect(() => {
    const safeFont = ALLOWED_FONTS.includes(fontFamily) ? fontFamily : 'Inter'
    const link     = document.createElement('link')
    link.rel       = 'stylesheet'
    link.href      = `https://fonts.googleapis.com/css2?family=${safeFont.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`
    document.head.appendChild(link)
    document.documentElement.style.setProperty('--store-font', `'${safeFont}', sans-serif`)
    return () => { document.head.removeChild(link) }
  }, [fontFamily])

  return <>{children}</>
}

const ALLOWED_FONTS = [
  'Inter', 'Poppins', 'Nunito', 'Raleway', 'Lato',
  'Montserrat', 'Playfair Display', 'DM Sans', 'Plus Jakarta Sans',
]

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6;              break
      case b: h = ((r - g) / d + 4) / 6;              break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
```


***

## 9. Subdomain-Aware Link Component

**`apps/web/src/app/stores/[slug]/_components/SubdomainAwareLink.tsx`**:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  href:        string     // relative store path e.g. "/products/123"
  storeSlug:   string
  isSubdomain: boolean
  children:    React.ReactNode
  className?:  string
  prefetch?:   boolean
}

/**
 * Smart link that resolves correctly whether the store is accessed via:
 * - Subdomain:    slug.mymarket.com/products/123
 * - Path-based:  mymarket.com/stores/slug/products/123
 */
export function SubdomainAwareLink({
  href, storeSlug, isSubdomain, children, className, prefetch,
}: Props) {
  const cleanPath    = href.startsWith('/') ? href : `/${href}`
  const resolvedHref = isSubdomain
    ? cleanPath                                // Already on subdomain — relative path works
    : `/stores/${storeSlug}${cleanPath}`       // Needs full path prefix

  return (
    <Link href={resolvedHref} className={className} prefetch={prefetch}>
      {children}
    </Link>
  )
}
```


***

## 10. Store Navbar (Subdomain-Aware)

**`apps/web/src/app/stores/[slug]/_components/StoreNavbar.tsx`**:

```tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { SubdomainAwareLink } from './SubdomainAwareLink'
import type { Store } from '@/types/customer'

interface Props {
  store:       Store
  isSubdomain: boolean
}

export function StoreNavbar({ store, isSubdomain }: Props) {
  const router          = useRouter()
  const [cartCount, setCartCount] = useState(0)
  const [scrolled, setScrolled]   = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkProps = { storeSlug: store.slug, isSubdomain }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : 'bg-white border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Store name */}
          <SubdomainAwareLink href="/" {...linkProps} className="flex items-center gap-2.5 min-w-0">
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={store.name}
                width={36}
                height={36}
                className="w-9 h-9 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                style={{ backgroundColor: store.primary_color ?? '#6366f1' }}
              >
                {store.name[^0]}
              </div>
            )}
            <span className="font-bold text-gray-900 text-base truncate max-w-[140px]">
              {store.name}
            </span>
          </SubdomainAwareLink>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
            <SubdomainAwareLink href="/"          {...linkProps} className="hover:text-gray-900 transition-colors">Home</SubdomainAwareLink>
            <SubdomainAwareLink href="/products"  {...linkProps} className="hover:text-gray-900 transition-colors">Products</SubdomainAwareLink>
            <SubdomainAwareLink href="/about"     {...linkProps} className="hover:text-gray-900 transition-colors">About</SubdomainAwareLink>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <SubdomainAwareLink
              href="/search"
              {...linkProps}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              🔍
            </SubdomainAwareLink>

            {/* Cart */}
            <SubdomainAwareLink
              href="/cart"
              {...linkProps}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              🛒
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center"
                  style={{ backgroundColor: store.primary_color ?? '#6366f1' }}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </SubdomainAwareLink>

            {/* Account */}
            <SubdomainAwareLink
              href="/account"
              {...linkProps}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              👤
            </SubdomainAwareLink>

            {/* Back to marketplace (only on subdomain) */}
            {isSubdomain && (
              <a
                href={`https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 rounded-xl px-3 py-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>🏪</span>
                <span>Marketplace</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
```


***

## 11. Domain Management Page (Merchant Dashboard)

**`apps/web/src/app/(merchant)/dashboard/settings/domain/page.tsx`**:

```tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect }           from 'next/navigation'
import { DomainSettingsClient } from './DomainSettingsClient'

export const metadata = { title: 'Domain Settings' }

export default async function DomainSettingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, name, custom_domain, domain_verified, domain_txt_record, subdomain_active')
    .eq('owner_id', user.id)
    .single()

  if (!store) redirect('/dashboard/onboarding')

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mymarket.com'

  return (
    <DomainSettingsClient
      store={store}
      rootDomain={rootDomain}
    />
  )
}
```

**`apps/web/src/app/(merchant)/dashboard/settings/domain/DomainSettingsClient.tsx`**:

```tsx
'use client'
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  addCustomDomain, verifyCustomDomain, removeCustomDomain,
} from '@/lib/actions/domains'

interface Store {
  id:                 string
  slug:               string
  name:               string
  custom_domain:      string | null
  domain_verified:    boolean
  domain_txt_record:  string | null
  subdomain_active:   boolean
}

export function DomainSettingsClient({
  store, rootDomain,
}: { store: Store; rootDomain: string }) {
  const [domain, setDomain]         = useState('')
  const [txtRecord, setTxtRecord]   = useState(store.domain_txt_record)
  const [status, setStatus]         = useState<{ ok: boolean; msg: string } | null>(null)
  const [verifyResult, setVerify]   = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, start]          = useTransition()
  const [tab, setTab]               = useState<'subdomain' | 'custom'>('subdomain')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    start(async () => {
      const result = await addCustomDomain(store.id, domain)
      if (result.success) {
        setTxtRecord(result.txtRecord ?? null)
        setStatus({ ok: true, msg: 'Domain added! Now set your DNS records below.' })
        setDomain('')
      } else {
        setStatus({ ok: false, msg: result.error ?? 'Failed to add domain' })
      }
    })
  }

  async function handleVerify() {
    setVerify(null)
    start(async () => {
      const result = await verifyCustomDomain(store.id)
      setVerify({
        ok:  result.verified,
        msg: result.verified
          ? '✅ Domain verified! Your store is now live on this domain.'
          : `❌ DNS record not found yet. ${result.error ?? 'DNS changes can take up to 24 hours.'}`,
      })
    })
  }

  async function handleRemove() {
    if (!confirm(`Remove ${store.custom_domain}? Your store will stop working on this domain.`)) return
    start(async () => {
      await removeCustomDomain(store.id)
      window.location.reload()
    })
  }

  const subdomainUrl = `https://${store.slug}.${rootDomain}`
  const inputClass   = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white font-mono text-gray-900'
  const codeClass    = 'block bg-gray-900 text-green-400 font-mono text-xs px-4 py-3 rounded-xl overflow-x-auto select-all'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Domain Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure where customers find your store
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {(['subdomain', 'custom'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'subdomain' ? '🔗 Free Subdomain' : '🌐 Custom Domain'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Subdomain Tab ──────────────────────────────────────────────── */}
        {tab === 'subdomain' && (
          <motion.div
            key="subdomain"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
                🔗 Your Free Subdomain
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Included with every store. Ready immediately, no setup needed.
              </p>

              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span className="text-green-500 text-lg shrink-0">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-green-800 text-sm truncate">{subdomainUrl}</p>
                  <p className="text-xs text-green-600 mt-0.5">Active and verified</p>
                </div>
                <a
                  href={subdomainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-green-700 hover:underline shrink-0"
                >
                  Visit →
                </a>
              </div>

              <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2 text-xs text-gray-600">
                <p className="font-bold text-gray-700">Share your store link:</p>
                <code className={codeClass}>{subdomainUrl}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(subdomainUrl)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  📋 Copy link
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Custom Domain Tab ───────────────────────────────────────────── */}
        {tab === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {/* Current custom domain */}
            {store.custom_domain ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{store.custom_domain}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {store.domain_verified ? (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-yellow-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                          Pending verification
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleRemove}
                    disabled={isPending}
                    className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* DNS instructions */}
                {!store.domain_verified && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-4">
                    <p className="text-sm font-bold text-amber-900">
                      🔧 Complete DNS Setup
                    </p>
                    <p className="text-xs text-amber-800">
                      Add these records at your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.):
                    </p>

                    {/* CNAME record */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-gray-700">1. CNAME record (required)</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Type</p>
                          <code className="font-mono font-bold text-gray-900">CNAME</code>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Name</p>
                          <code className="font-mono font-bold text-gray-900">@</code>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Value</p>
                          <code className="font-mono font-bold text-gray-900 text-[10px]">
                            cname.vercel-dns.com
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* TXT verification record */}
                    {txtRecord && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-gray-700">2. TXT record (for verification)</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                            <p className="text-gray-400 text-[10px] uppercase font-bold">Type</p>
                            <code className="font-mono font-bold text-gray-900">TXT</code>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                            <p className="text-gray-400 text-[10px] uppercase font-bold">Name</p>
                            <code className="font-mono font-bold text-gray-900 text-[10px]">
                              _mymarket-verify
                            </code>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-gray-200">
                            <p className="text-gray-400 text-[10px] uppercase font-bold">Value</p>
                            <code className="font-mono font-bold text-gray-900 text-[10px] break-all">
                              {txtRecord}
                            </code>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verify button */}
                    <button
                      onClick={handleVerify}
                      disabled={isPending}
                      className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2"
                    >
                      {isPending
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking DNS…</>
                        : '🔍 Verify DNS Records'
                      }
                    </button>

                    {verifyResult && (
                      <p className={`text-xs font-semibold p-3 rounded-xl ${
                        verifyResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {verifyResult.msg}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Add custom domain form */
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 text-sm mb-1">🌐 Connect Your Domain</h2>
                <p className="text-xs text-gray-500 mb-5">
                  Use your own domain like <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">shop.yourbrand.com</code>
                </p>

                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Domain Name
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="shop.yourbrand.com"
                      required
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Enter without https://. Use www.yourdomain.com or a subdomain.
                    </p>
                  </div>

                  {status && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs font-semibold px-4 py-3 rounded-xl ${
                        status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {status.msg}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={isPending || !domain}
                    className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isPending
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
                      : '➕ Add Domain'
                    }
                  </button>
                </form>
              </div>
            )}

            {/* Plans note */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">💡</span>
              <div>
                <p className="text-sm font-bold text-indigo-900">Custom domains are free</p>
                <p className="text-xs text-indigo-700 mt-0.5">
                  You only need to own the domain. We handle SSL certificates automatically via Vercel.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```


***

## 12. Local Development Setup

Testing subdomains locally requires a `hosts` file entry since browsers don't support wildcard `localhost`.[^4]

**One-time setup:**

```bash
# macOS / Linux — add to /etc/hosts
sudo sh -c 'echo "127.0.0.1  teststore.localhost" >> /etc/hosts'
sudo sh -c 'echo "127.0.0.1  coffeeshop.localhost" >> /etc/hosts'

# Windows — add to C:\Windows\System32\drivers\etc\hosts
# 127.0.0.1  teststore.localhost

# Then visit:
# http://teststore.localhost:3000   → serves teststore's storefront
# http://localhost:3000             → main marketplace
```

**`apps/web/src/lib/tenant.ts`** — local dev subdomain reads correctly because the middleware already handles `.localhost` splitting. No extra config needed.

***

## 13. Vercel Deployment Configuration

**`vercel.json`** (root of monorepo):

```json
{
  "projects": [
    {
      "name": "mymarket-web",
      "root": "apps/web"
    }
  ]
}
```

**Vercel Dashboard steps (one-time):**

1. Go to **Project → Settings → Domains**
2. Add `mymarket.com` → set as primary
3. Add `*.mymarket.com` → wildcard — points all subdomains to this deployment
4. SSL is issued automatically for both `mymarket.com` and `*.mymarket.com`

***

## End-to-End Flow Summary

| Step | What happens |
| :-- | :-- |
| Merchant creates store | `slug = 'coffeeshop'` saved in DB; subdomain `coffeeshop.mymarket.com` is **instantly live** |
| Customer visits `coffeeshop.mymarket.com` | Middleware detects subdomain, rewrites to `/stores/coffeeshop`, sets `x-store-slug: coffeeshop` header |
| Store layout reads header | `getTenantContext()` returns `{ storeSlug: 'coffeeshop', isSubdomain: true }` |
| Navigation links | `SubdomainAwareLink` renders as `'/products/123'` (relative) instead of `'/stores/coffeeshop/products/123'` |
| Merchant adds `shop.brand.com` | `addCustomDomain()` calls Vercel API + writes to DB; DNS instructions shown |
| Customer visits `shop.brand.com` | Middleware detects non-root hostname, queries `stores.custom_domain`, resolves to `coffeeshop`, same rewrite |
| Loyalty / orders / cart | All store-scoped via `store_id` from previous session — no cross-merchant data leakage [^1] |

<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://vercel.com/docs/multi-tenant

[^2]: https://nextjslaunchpad.com/article/nextjs-multi-tenant-saas-subdomain-routing-custom-domains-app-router

[^3]: https://www.achromatic.dev/blog/multi-tenant-architecture-nextjs

[^4]: https://github.com/vercel/next.js/discussions/84461

[^5]: https://www.reddit.com/r/nextjs/comments/16ocsad/subdomain_routing_in_nextjs_project/

[^6]: https://www.linkedin.com/posts/sheharyar-ishfaq_subdomain-based-routing-in-nextjs-a-complete-activity-7307803800587673600-TYDy

[^7]: https://stackoverflow.com/questions/61761719/how-to-redirect-pages-app-folder-to-subdomain-in-next-js

[^8]: https://stackoverflow.com/questions/70873551/mapping-custom-domains-to-wildcard-sub-domains

[^9]: https://nextjs.org/docs/14/app/building-your-application/routing/middleware

[^10]: https://www.reddit.com/r/nextjs/comments/1m7yoid/wildcard_subdomain_not_working_on_vercel_need_help/

[^11]: https://www.youtube.com/watch?v=kAAt7077FkY

[^12]: https://github.com/vercel/next.js/discussions/17345

[^13]: https://javascript.plainenglish.io/multi-tenant-saas-in-next-js-is-way-easier-than-it-looks-9892d5b24a9b

[^14]: https://kitemetric.com/blogs/mastering-subdomain-routing-in-next-js-for-multi-tenant-applications

[^15]: https://vercel.com/blog/wildcard-domains

