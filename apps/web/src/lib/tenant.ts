import { headers } from 'next/headers'
import { cache }   from 'react'
import { createClient } from '@/lib/supabase/server'
import { unstable_cache }     from 'next/cache'
import type { Store }         from '@/types/customer'

// ── Read tenant context injected by middleware (Server Components only) ───────
export async function getTenantContext(): Promise<{
  storeSlug:     string | null
  storeHostname: string | null
  isTenant:      boolean
}> {
  const h = await headers()
  return {
    storeSlug:     h.get('x-store-slug'),
    storeHostname: h.get('x-store-hostname'),
    isTenant:      h.get('x-is-tenant') === '1',
  }
}

// ── Fetch full store data by slug (cached per request via React cache()) ─────
export const getStoreBySlug = cache(
  async (slug: string): Promise<Store | null> => {
    return unstable_cache(
      async () => {
        const supabase = await createClient()
        const { data } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()
        return data as Store | null
      },
      [`store-${slug}`],
      { revalidate: 60, tags: ['stores'] }
    )()
  }
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

  return `/tenant/${slug}${cleanPath}`
}
