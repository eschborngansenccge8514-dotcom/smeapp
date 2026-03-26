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
    return cached.slug === '__NOT_FOUND__' ? null : cached.slug
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
