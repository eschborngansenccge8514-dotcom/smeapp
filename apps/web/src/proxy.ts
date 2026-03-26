import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Routes that are publicly cacheable at the CDN edge
const CACHEABLE_ROUTES = [
  /^\/stores\/[^/]+$/,           // /stores/[slug]
  /^\/stores\/[^/]+\/products$/, // /stores/[slug]/products
  /^\/$/, // home page
]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Guard against missing Supabase envs to prevent 500 error
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Middleware: Missing Supabase environment variables')
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Try to get user session, but don't crash if it fails
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    console.error('Middleware: Auth check failed', e)
  }

  const pathname = request.nextUrl.pathname
  
  // Protect routes only if user is missing
  if ((pathname.startsWith('/merchant') && !pathname.startsWith('/merchant-signup')) || pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Subdomain tenant routing
  const hostname = request.headers.get('host') ?? ''
  // Use VERCEL_URL if ROOT_DOMAIN is missing
  const rootDomain = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:3000'
  const isLocalhost = hostname.includes('localhost')
  const isRootDomain = hostname === rootDomain || hostname === `www.${rootDomain}`

  if (!isRootDomain && !isLocalhost && hostname.endsWith(`.${rootDomain}`)) {
    const slug = hostname.replace(`.${rootDomain}`, '')
    const url = request.nextUrl.clone()
    url.pathname = `/tenant/${slug}${request.nextUrl.pathname}`
    supabaseResponse = NextResponse.rewrite(url)
  }

  // ── Security headers ────────────────────────────────────────────────────
  supabaseResponse.headers.set('X-Frame-Options', 'SAMEORIGIN')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  supabaseResponse.headers.set(
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
    supabaseResponse.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=600'
    )
  }

  // ── Resource hints (preconnect to external origins) ────────────────────
  if (pathname === '/') {
    supabaseResponse.headers.append(
      'Link',
      '<https://fonts.gstatic.com>; rel=preconnect; crossorigin'
    )
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabaseResponse.headers.append(
        'Link',
        `<${process.env.NEXT_PUBLIC_SUPABASE_URL}>; rel=preconnect`
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
