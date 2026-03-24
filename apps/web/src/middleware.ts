import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /merchant and /admin routes
  const pathname = request.nextUrl.pathname
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
  const rootDomain = process.env.ROOT_DOMAIN ?? 'localhost:3000'
  const isLocalhost = hostname.includes('localhost')
  const isRootDomain = hostname === rootDomain || hostname === `www.${rootDomain}`

  if (!isRootDomain && !isLocalhost && hostname.endsWith(`.${rootDomain}`)) {
    const slug = hostname.replace(`.${rootDomain}`, '')
    const url = request.nextUrl.clone()
    url.pathname = `/tenant/${slug}${request.nextUrl.pathname}`
    return NextResponse.rewrite(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
