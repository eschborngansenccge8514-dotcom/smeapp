import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { resolveCustomDomainToSlug } from './lib/domain-cache'

// ── Constants ────────────────────────────────────────────────────────────────
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mymarket.com'

// Subdomains that are part of the platform — never store routes
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'dashboard', 'admin',
  'mail', 'smtp', 'ftp', 'staging', 'dev', 'preview',
])

// Routes that are publicly cacheable at the CDN edge
const CACHEABLE_ROUTES = [
  /^\/stores\/[^/]+$/,           // /stores/[slug]
  /^\/stores\/[^/]+\/products$/, // /stores/[slug]/products
  /^\/$/, // home page
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractSubdomain(hostname: string): string | null {
  // Local dev: storeslug.localhost:3000 → 'storeslug'
  if (hostname.includes('.localhost')) {
    const sub = hostname.split('.')[0]
    return sub === 'localhost' ? null : sub
  }

  // Vercel preview: storeslug---branch.vercel.app → 'storeslug'
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    return hostname.split('---')[0]
  }

  // Production: slug.mymarket.com → 'slug'
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length))
    return sub || null
  }

  return null
}

function isRootDomain(hostname: string): boolean {
  const h = hostname.split(':')[0]
  return (
    h === ROOT_DOMAIN ||
    h === `www.${ROOT_DOMAIN}` ||
    h === 'localhost' ||
    h === '127.0.0.1'
  )
}

// ── Proxy (Middleware) ───────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname     = request.headers.get('host') ?? ''

  // ① Skip static assets & internal rewrites immediately
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/tenant') ||
    pathname.includes('.') // file extension
  ) {
    return NextResponse.next()
  }

  // ② Refresh Supabase auth session
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: ()                     => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ③ RBAC / Route Protection
  if ((pathname.startsWith('/merchant') && !pathname.startsWith('/merchant-signup')) || pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ④ Root domain - apply security headers & return
  if (isRootDomain(hostname)) {
    applySecurityHeaders(supabaseResponse)
    return supabaseResponse
  }

  // ⑤ Tenant Routing Logic
  let storeSlug: string | null = null
  let isCustomDomain = false

  const subdomain = extractSubdomain(hostname)

  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
    storeSlug = subdomain
  } else if (!subdomain && !isRootDomain(hostname)) {
    // Treat as custom domain
    storeSlug      = await resolveCustomDomainToSlug(hostname.split(':')[0], () => request.cookies)
    isCustomDomain = true
  }

  // Reserved subdomain pass through
  if (subdomain && RESERVED_SUBDOMAINS.has(subdomain)) {
    applySecurityHeaders(supabaseResponse)
    return supabaseResponse
  }

  if (!storeSlug) {
    applySecurityHeaders(supabaseResponse)
    return supabaseResponse
  }

  // ⑥ Rewrite to /tenant/[slug]/...
  const rewriteUrl      = request.nextUrl.clone()
  rewriteUrl.pathname   = `/tenant/${storeSlug}${pathname === '/' ? '' : pathname}`

  const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'x-store-slug':     storeSlug,
        'x-store-hostname': hostname,
        'x-is-tenant':      '1',
      }),
    },
  })

  // Transfer auth cookies & security headers
  supabaseResponse.cookies.getAll().forEach((cookie) => rewriteResponse.cookies.set(cookie))
  applySecurityHeaders(rewriteResponse)
  
  // CDN Cache hints
  const isCacheable = CACHEABLE_ROUTES.some((r) => r.test(pathname))
  if (isCacheable) {
    rewriteResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
  }

  return rewriteResponse
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set(
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
}

export const config = {
  matcher: ['/((?!api/auth|api/webhook|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'],
}
