'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { StoreSearchBar } from '@/components/search/StoreSearchBar'
import { InfiniteProductGrid } from '@/components/search/InfiniteProductGrid'
import { useUrlState } from '@/lib/url-state'
import { loadMoreProducts } from '@/lib/actions/products'
import { fadeUp, fadeIn } from '@/components/ui/animations'
import { isStoreOpen } from '@/lib/industry'
import type { Store, Product, FeeConfig } from '@/types/customer'

interface Props {
  store: Store
  initialProducts: Product[]
  initialHasMore: boolean
  feeConfig: FeeConfig
  initialQuery: string
  initialCategory: string
}

export function StorePageClient({
  store, initialProducts, initialHasMore,
  feeConfig, initialQuery, initialCategory,
}: Props) {
  const { getParam, setParam } = useUrlState()

  const query    = getParam('q',   initialQuery)
  const category = getParam('cat', initialCategory)
  const { isOpen, label } = isStoreOpen(store.operating_hours as any)

  const CATEGORIES = ['All', ...Array.from(
    new Set(initialProducts.map((p) => p.category).filter(Boolean) as string[])
  )]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {store.banner_url ? (
          <Image src={store.banner_url} alt={store.name} fill className="object-cover" priority />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, #0f172a, ${store.primary_color ?? '#6366f1'})` }}
          />
        )}
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Floating store info */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="absolute bottom-0 left-0 right-0 px-4 pb-4 md:px-8 md:pb-6 flex items-end gap-4"
        >
          {/* Logo */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-3 border-white/30 bg-white/10 backdrop-blur-md shadow-xl shrink-0 flex items-center justify-center">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <span className="text-3xl">🏪</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow">
              {store.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {/* Open / Closed pill */}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 ${
                isOpen
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-400/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                {label}
              </span>
              {/* Rating */}
              {store.rating && (
                <span className="text-xs font-semibold text-yellow-300 flex items-center gap-1">
                  ⭐ {store.rating.toFixed(1)} ({store.review_count})
                </span>
              )}
              {/* Address */}
              {store.city && (
                <span className="text-xs text-white/70">📍 {store.city}</span>
              )}
            </div>
          </div>

          {/* Cart FAB removed - now handled by persistent Navbar/CartDrawer trigger */}
        </motion.div>
      </div>

      {/* ── Sticky Search + Category Nav ───────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-2.5">
          {/* Search bar */}
          <StoreSearchBar
            primaryColor={store.primary_color ?? '#6366f1'}
            placeholder={`Search in ${store.name}…`}
          />

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setParam('cat', cat === 'All' ? null : cat, { replace: true, scroll: false })}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  category === cat || (cat === 'All' && !category)
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={
                  category === cat || (cat === 'All' && !category)
                    ? { backgroundColor: store.primary_color ?? '#6366f1' }
                    : {}
                }
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Store Description ──────────────────────────────────────────────── */}
      {store.description && !query && category === 'All' && (
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto px-4 pt-4"
        >
          <p className="text-sm text-gray-500 leading-relaxed">{store.description}</p>
        </motion.div>
      )}

      {/* ── Products ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        {query && (
          <p className="text-sm text-gray-500 mb-4">
            Results for <strong className="text-gray-900">"{query}"</strong>
            {category && category !== 'All' && ` in ${category}`}
          </p>
        )}

        <InfiniteProductGrid
          initialProducts={initialProducts}
          initialHasMore={initialHasMore}
          storeId={store.id}
          storeSlug={store.slug}
          primaryColor={store.primary_color ?? '#6366f1'}
          query={query}
          category={category === 'All' ? '' : category}
          loadMore={loadMoreProducts}
        />
      </div>
    </div>
  )
}
