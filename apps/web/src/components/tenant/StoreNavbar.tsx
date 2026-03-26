'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { SubdomainAwareLink } from './SubdomainAwareLink'
import { CartDrawer } from '@/components/cart/CartDrawer'
import type { Store } from '@/types/customer'

interface Props {
  store:       any // any for now to avoid TS issues with the new schema during build
  isTenant:    boolean
}

export function StoreNavbar({ store, isTenant }: Props) {
  const [scrolled, setScrolled]   = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkProps = { storeSlug: store.slug, isTenant }
  const primary = store.primary_color ?? '#6366f1'

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
                style={{ backgroundColor: primary }}
              >
                {store.name[0]}
              </div>
            )}
            <span className="font-bold text-gray-900 text-base truncate max-w-[140px]">
              {store.app_name ?? store.name}
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
            <CartDrawer store={store} />

            {/* Account */}
            <SubdomainAwareLink
              href="/account"
              {...linkProps}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              👤
            </SubdomainAwareLink>

            {/* Back to marketplace (only on tenant domain) */}
            {isTenant && (
              <a
                href={`https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'mymarket.com'}`}
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
