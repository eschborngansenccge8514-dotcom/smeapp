'use client'
import { useState, useMemo, useCallback } from 'react'
import { useCartStore } from '@/stores/useCartStore'
import { getIndustryTheme } from '@/lib/industry'
import { ElectronicsHero } from './ElectronicsHero'
import { ElectronicsCategoryNav } from './ElectronicsCategoryNav'
import { ElectronicsFilterBar } from './ElectronicsFilterBar'
import { ElectronicsProductCard } from './ElectronicsProductCard'
import { ElectronicsProductDrawer } from './ElectronicsProductDrawer'
import { ElectronicsCompareBar } from './ElectronicsCompareBar'
import { ElectronicsCompareDrawer } from './ElectronicsCompareDrawer'
import { ElectronicsCartDrawer } from './ElectronicsCartDrawer'
import type { ElectronicsProduct, ElectronicsVariant } from '@/lib/industry/types'

interface Props {
  store: any
  products: ElectronicsProduct[]
}

export function ElectronicsStorePage({ store, products }: Props) {
  const theme   = getIndustryTheme(store.category)
  const primary = store.brand_primary_color ?? theme.primaryColor

  const [activeCategory, setCategory]       = useState('All')
  const [searchQuery, setSearch]            = useState('')
  const [sortBy, setSort]                   = useState('default')
  const [brandFilter, setBrand]             = useState('all')
  const [priceRange, setPriceRange]         = useState<[number, number]>([0, 999999])
  const [selectedProduct, setProduct]       = useState<ElectronicsProduct | null>(null)
  const [compareList, setCompareList]       = useState<ElectronicsProduct[]>([])
  const [compareOpen, setCompareOpen]       = useState(false)
  const [cartOpen, setCartOpen]             = useState(false)

  const { addItem, clearCart, getItemCount, items } = useCartStore()
  const cartCount = getItemCount()

  // Derived values
  const maxPrice = useMemo(() =>
    Math.ceil(Math.max(0, ...products.map((p) => p.price)) / 500) * 500 || 5000
  , [products])

  const availableBrands = useMemo(() =>
    [...new Set(products.map((p) => p.brand).filter(Boolean))] as string[]
  , [products])

  const productCountByCat = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1
    }
    return counts
  }, [products])

  // Featured product = first bestseller or promo
  const featuredProduct = useMemo(() =>
    products.find((p) => p.is_bestseller || p.is_on_promotion) ?? null
  , [products])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products]
    if (activeCategory !== 'All') result = result.filter((p) => p.category === activeCategory)
    if (brandFilter !== 'all')    result = result.filter((p) => p.brand === brandFilter)
    result = result.filter((p) => {
      const price = p.is_on_promotion && p.promotion_price ? p.promotion_price : p.price
      return price >= priceRange[0] && price <= priceRange[1]
    })
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.model_number?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.quick_specs?.some((s) => s.toLowerCase().includes(q)) ||
        p.specs?.some((s) => s.value.toLowerCase().includes(q))
      )
    }
    switch (sortBy) {
      case 'price_asc':   result.sort((a, b) => a.price - b.price); break
      case 'price_desc':  result.sort((a, b) => b.price - a.price); break
      case 'rating':      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
      case 'new_first':   result.sort((a, b) => (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0)); break
      case 'promo_first': result.sort((a, b) => (b.is_on_promotion ? 1 : 0) - (a.is_on_promotion ? 1 : 0)); break
    }
    return result
  }, [products, activeCategory, brandFilter, priceRange, searchQuery, sortBy])

  function getCartQty(productId: string) {
    // Sum all variants of a product in cart
    return items
      .filter((i) => i.id === productId)
      .reduce((sum, i) => sum + i.quantity, 0)
  }

  function toggleCompare(p: ElectronicsProduct) {
    setCompareList((prev) => {
      if (prev.find((x) => x.id === p.id)) return prev.filter((x) => x.id !== p.id)
      if (prev.length >= 3) return prev
      return [...prev, p]
    })
  }

  const handleAddToCart = useCallback((
    product: ElectronicsProduct,
    variant: ElectronicsVariant | null,
    qty: number
  ) => {
    const isOnPromo = product.is_on_promotion && product.promotion_price != null
    const price = variant?.price ?? (isOnPromo ? product.promotion_price! : product.price)
    const name = variant ? `${product.name} · ${variant.label}` : product.name
    const productId = variant ? `${product.id}-${variant.id}` : product.id

    const result = addItem(
      { 
        id: product.id, 
        name, 
        price, 
        quantity: qty, 
        image_urls: product.image_url ? [product.image_url] : [],
        stock_qty: variant ? variant.stock_qty : product.stock_qty,
        variant_id: variant?.id ?? null,
        store_id: store.id
      },
      store.id, store.name
    )
    if (result === 'cross_store') {
      if (window.confirm(`Clear cart and start fresh from ${store.name}?`)) {
        clearCart()
        handleAddToCart(product, variant, qty)
      }
    } else {
      setCartOpen(true)
    }
  }, [addItem, clearCart, store])

  // Reset price range when max changes
  useMemo(() => { setPriceRange([0, maxPrice]) }, [maxPrice])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <ElectronicsHero
        store={store}
        primaryColor={primary}
        featuredProduct={featuredProduct}
        onFeaturedClick={() => featuredProduct && setProduct(featuredProduct)}
      />

      {/* Category nav */}
      <ElectronicsCategoryNav
        activeCategory={activeCategory}
        onChange={(c) => { setCategory(c); setSearch('') }}
        primaryColor={primary}
        productCountByCat={productCountByCat}
      />

      {/* Filter bar */}
      <ElectronicsFilterBar
        searchQuery={searchQuery}
        sortBy={sortBy}
        brandFilter={brandFilter}
        priceRange={priceRange}
        maxPrice={maxPrice}
        availableBrands={availableBrands}
        resultCount={filtered.length}
        onSearchChange={(q) => { setSearch(q); if (q) setCategory('All') }}
        onSortChange={setSort}
        onBrandChange={setBrand}
        onPriceChange={setPriceRange}
        compareCount={compareList.length}
        onCompareOpen={() => setCompareOpen(true)}
        primaryColor={primary}
      />

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-36">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ElectronicsProductCard
                key={product.id}
                product={product}
                primaryColor={primary}
                cartQty={getCartQty(product.id)}
                isInCompare={compareList.some((c) => c.id === product.id)}
                onOpenDetail={setProduct}
                onAdd={(p) => handleAddToCart(p, null, 1)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-5xl mb-3">💻</p>
            <p className="font-semibold text-gray-700">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query</p>
            <button
              onClick={() => { setSearch(''); setCategory('All'); setBrand('all'); setPriceRange([0, maxPrice]) }}
              className="mt-4 text-sm font-semibold hover:underline"
              style={{ color: primary }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Floating cart */}
      {cartCount > 0 && compareList.length === 0 && (
        <div className="fixed bottom-5 left-4 right-4 max-w-sm mx-auto z-30">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-between px-5 shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: primary }}
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/25 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {cartCount}
              </span>
              <span>View Cart</span>
            </div>
            <span>RM {useCartStore.getState().getTotal().toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
          </button>
        </div>
      )}

      {/* Compare bar */}
      <ElectronicsCompareBar
        compareList={compareList}
        primaryColor={primary}
        onRemove={(id) => setCompareList((l) => l.filter((p) => p.id !== id))}
        onCompare={() => setCompareOpen(true)}
        onClear={() => setCompareList([])}
      />

      {/* Drawers */}
      <ElectronicsProductDrawer
        product={selectedProduct}
        primaryColor={primary}
        onClose={() => setProduct(null)}
        onAddToCart={handleAddToCart}
      />
      <ElectronicsCompareDrawer
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        compareList={compareList}
        primaryColor={primary}
        onAddToCart={(p) => handleAddToCart(p, null, 1)}
      />
      <ElectronicsCartDrawer
        primaryColor={primary}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  )
}
