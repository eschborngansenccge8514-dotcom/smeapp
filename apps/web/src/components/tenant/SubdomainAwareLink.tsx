'use client'
import Link from 'next/link'

interface Props {
  href:        string     // relative store path e.g. "/products/123"
  storeSlug:   string
  isTenant:    boolean
  children:    React.ReactNode
  className?:  string
  prefetch?:   boolean
}

/**
 * Smart link that resolves correctly whether the store is accessed via:
 * - Subdomain:    slug.mymarket.com/products/123
 * - Custom domain: shop.com/products/123
 * - Path-based:   mymarket.com/tenant/slug/products/123
 */
export function SubdomainAwareLink({
  href, storeSlug, isTenant, children, className, prefetch,
}: Props) {
  const cleanPath    = href.startsWith('/') ? href : `/${href}`
  
  // If we're on a tenant domain (subdomain or custom), the internal rewrite 
  // handles the mapping so we can just use the relative path.
  
  const resolvedHref = isTenant
    ? cleanPath                                // Already on tenant domain — relative path works
    : `/tenant/${storeSlug}${cleanPath}`       // Needs full path prefix on root domain

  return (
    <Link href={resolvedHref} className={className} prefetch={prefetch}>
      {children}
    </Link>
  )
}
