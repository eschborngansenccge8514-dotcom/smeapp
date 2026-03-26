import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
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

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname     = request.headers.get('host') ?? ''

  // ① Skip static assets immediately — no processing cost
  if (STATIC_ASSET.test(pathname)) return NextResponse.next()

  // ② Refresh Supabase auth session on ALL requests
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

  await supabase.auth.getUser()

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
    storeSlug      = await resolveCustomDomainToSlug(hostname.split(':')[0], () => request.cookies)
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

  // ⑦ Rewrite to /tenant/[slug]/...
  const rewriteUrl      = request.nextUrl.clone()
  rewriteUrl.pathname   = `/tenant/${storeSlug}${pathname === '/' ? '' : pathname}`

  const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        // Pass tenant context to Server Components via headers
        'x-store-slug':        storeSlug,
        'x-store-hostname':    hostname,
        'x-is-tenant':         '1',
      }),
    },
  })

  // Copy Supabase auth cookies from session refresh to rewrite response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    rewriteResponse.cookies.set(cookie)
  })

  return rewriteResponse
}

// ── Simple 404 HTML for unknown custom domains ────────────────────────────────
function buildErrorPage(title: string, message: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mymarket.com'
  return `<!DOCTYPE html><html><head><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
  .box{text-align:center;max-width:400px;padding:2rem}h1{font-size:2rem;color:#111}p{color:#6b7280}</style>
  </head><body><div class="box"><h1>🏪</h1><h1>${title}</h1><p>${message}</p>
  <a href="https://${rootDomain}" style="color:#6366f1;font-weight:bold">← Go to Marketplace</a>
  </div></body></html>`
}

// ── Matcher — what middleware runs on ────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!api/auth|api/webhook|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
}
