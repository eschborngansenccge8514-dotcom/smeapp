'use client'
import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductGridSkeleton } from '@/components/skeletons/ProductGridSkeleton'
import { staggerContainer, cardVariant } from '@/components/ui/animations'
import type { Product } from '@/types/customer'

interface Props {
  initialProducts: Product[]
  initialHasMore: boolean
  storeId: string
  storeSlug: string
  primaryColor: string
  query: string
  category: string
  // Server Action passed from parent page
  loadMore: (
    storeId: string, page: number, query: string, category: string
  ) => Promise<{ products: Product[]; hasMore: boolean }>
}

export function InfiniteProductGrid({
  initialProducts,
  initialHasMore,
  storeId,
  storeSlug,
  primaryColor,
  query,
  category,
  loadMore,
}: Props) {
  const [products, setProducts]     = useState<Product[]>(initialProducts)
  const [hasMore, setHasMore]       = useState(initialHasMore)
  const [page, setPage]             = useState(2)
  const [isPending, startTransition]= useTransition()
  const sentinelRef                 = useRef<HTMLDivElement>(null)
  const lastQueryRef                = useRef(query + category)

  // Reset when filters change
  useEffect(() => {
    const key = query + category
    if (key !== lastQueryRef.current) {
      lastQueryRef.current = key
      setProducts(initialProducts)
      setHasMore(initialHasMore)
      setPage(2)
    }
  }, [query, category, initialProducts, initialHasMore])

  const fetchMore = useCallback(() => {
    if (!hasMore || isPending) return
    startTransition(async () => {
      const result = await loadMore(storeId, page, query, category)
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id))
        return [...prev, ...result.products.filter((p) => !ids.has(p.id))]
      })
      setHasMore(result.hasMore)
      setPage((p) => p + 1)
    })
  }, [hasMore, isPending, page, storeId, query, category, loadMore])

  // Intersection Observer sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMore() },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchMore])

  if (products.length === 0 && !isPending) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg font-bold text-gray-900">No products found</p>
        <p className="text-sm text-gray-500 mt-1">
          {query ? `No results for "${query}"` : 'No products in this category yet.'}
        </p>
        {query && (
          <p className="text-sm text-gray-400 mt-1">
            Try a different keyword or{' '}
            <button
              className="font-semibold underline"
              style={{ color: primaryColor }}
              onClick={() => window.history.back()}
            >
              browse all products
            </button>
          </p>
        )}
      </motion.div>
    )
  }

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {products.map((p, i) => (
            <motion.div key={p.id} variants={cardVariant} layout>
              <ProductCard
                product={p}
                storeSlug={storeSlug}
                priority={i < 8}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Sentinel + Load More indicator */}
      <div ref={sentinelRef} className="flex justify-center pt-8">
        {isPending && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
            <ProductGridSkeleton count={5} />
          </div>
        )}
        {!hasMore && products.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-400 py-4"
          >
            ✓ All {products.length} products loaded
          </motion.p>
        )}
      </div>
    </>
  )
}
