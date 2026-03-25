'use client'
import { useState, useMemo, useCallback } from 'react'
import { useCartStore } from '@/stores/useCartStore'
import { getIndustryTheme } from '@/lib/industry'
import { PharmacyHero } from './PharmacyHero'
import { PharmacySearchHero } from './PharmacySearchHero'
import { PharmacyCategoryNav } from './PharmacyCategoryNav'
import { PharmacyProductCard } from './PharmacyProductCard'
import { PharmacyProductDrawer } from './PharmacyProductDrawer'
import { PharmacyCartPanel } from './PharmacyCartPanel'
import { PharmacyConsultBanner } from './PharmacyConsultBanner'
import type { PharmacyProduct } from '@/lib/industry/types'

interface Props {
  store: any
  products: PharmacyProduct[]
}

const SORT_OPTIONS = [
  { value: 'default',     label: 'Recommended' },
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'name_asc',    label: 'A → Z' },
  { value: 'promo_first', label: 'Promotions First' },
  { value: 'rx_first',    label: 'OTC First' },
]

const RX_FILTER_OPTIONS = [
  { value: 'all',               label: 'All' },
  { value: 'otc',               label: '✅ OTC' },
  { value: 'pharmacist_only',   label: '💬 Pharmacist Only' },
  { value: 'supplement',        label: '🌿 Supplements' },
  { value: 'prescription',      label: '📋 Prescription (Rx)' },
]

export function PharmacyStorePage({ store, products }: Props) {
  const theme = getIndustryTheme(store.category)
  const primary = store.brand_primary_color ?? theme.primaryColor

  const [searchQuery, setSearchQuery]         = useState('')
  const [activeCategory, setActiveCategory]   = useState('All')
  const [rxFilter, setRxFilter]               = useState('all')
  const [sortBy, setSortBy]                   = useState('default')
  const [selectedProduct, setSelectedProduct] = useState<PharmacyProduct | null>(null)
  const [cartOpen, setCartOpen]               = useState(false)

  const { addItem, updateQuantity, clearCart, getItemCount, items, storeId } = useCartStore()
  const cartCount = getItemCount()

  // Product count by category
  const productCountByCat = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1
    }
    return counts
  }, [products])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products]

    if (activeCategory !== 'All') result = result.filter((p) => p.category === activeCategory)
    if (rxFilter !== 'all')       result = result.filter((p) => p.rx_status === rxFilter)

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.generic_name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.active_ingredient?.toLowerCase().includes(q) ||
        p.indications?.some((i) => i.toLowerCase().includes(q)) ||
        p.category?.toLowerCase().includes(q)
      )
    }

    switch (sortBy) {
      case 'price_asc':   result.sort((a, b) => a.price - b.price);                                             break
      case 'price_desc':  result.sort((a, b) => b.price - a.price);                                             break
      case 'name_asc':    result.sort((a, b) => a.name.localeCompare(b.name));                                  break
      case 'promo_first': result.sort((a, b) => (b.is_on_promotion ? 1 : 0) - (a.is_on_promotion ? 1 : 0));    break
      case 'rx_first':    result.sort((a, b) => (a.rx_status === 'otc' ? -1 : 1));                              break
    }

    return result
  }, [products, activeCategory, rxFilter, searchQuery, sortBy])

  // Group by category for All view
  const sections = useMemo(() => {
    if (searchQuery || activeCategory !== 'All') {
      return [{ label: searchQuery ? `Results for "${searchQuery}"` : activeCategory, items: filtered }]
    }
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[]
    const result = cats
      .map((cat) => ({ label: cat, items: filtered.filter((p) => p.category === cat) }))
      .filter((s) => s.items.length > 0)
      
    // Add uncategorized products to "Other"
    const uncategorized = filtered.filter((p) => !p.category)
    if (uncategorized.length > 0) {
      result.push({ label: 'Other', items: uncategorized })
    }
    
    return result
  }, [filtered, activeCategory, searchQuery, products])

  function getCartQty(productId: string) {
    return items.find((i) => i.id === productId)?.quantity ?? 0
  }

  const handleAdd = useCallback((product: PharmacyProduct, delta: number) => {
    if (delta < 0) {
      const existing = items.find((i) => i.id === product.id)
      if (existing) updateQuantity(product.id, null, Math.max(0, existing.quantity + delta))
      return
    }
    const hasPromo = product.is_on_promotion && product.promotion_price != null
    const result = addItem(
      {
        id: product.id,
        name: product.name,
        price: hasPromo ? product.promotion_price! : product.price,
        quantity: delta,
        image_urls: product.image_url ? [product.image_url] : [],
        stock_qty: product.stock_qty,
        variant_id: null,
        store_id: store.id,
      },
      store.id,
      store.name
    )
    if (result === 'cross_store') {
      if (window.confirm(`Your cart has items from another store. Clear and start fresh from ${store.name}?`)) {
        clearCart()
        handleAdd(product, delta)
      }
    }
  }, [items, addItem, updateQuantity, clearCart, store])

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Store hero + trust bar */}
      <PharmacyHero store={store} primaryColor={primary} />

      {/* Sticky search */}
      <PharmacySearchHero
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); if (q) setActiveCategory('All') }}
        primaryColor={primary}
        resultCount={filtered.length}
      />

      {/* Category nav */}
      {!searchQuery && (
        <PharmacyCategoryNav
          activeCategory={activeCategory}
          onChange={(c) => { setActiveCategory(c); setRxFilter('all') }}
          primaryColor={primary}
          productCountByCat={productCountByCat}
        />
      )}

      {/* Page body */}
      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5 pb-28">
        {/* Pharmacist consultation banner — always visible at top */}
        <PharmacyConsultBanner primaryColor={primary} storePhone={store.phone} />

        {/* Filter + sort bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Rx type filter pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {RX_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRxFilter(opt.value)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  rxFilter === opt.value
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
                style={rxFilter === opt.value ? { backgroundColor: primary } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="shrink-0 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': primary } as React.CSSProperties}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Result count */}
        <p className="text-xs text-gray-400 font-medium">
          Showing <span className="font-bold text-gray-700">{filtered.length}</span> product{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Product sections */}
        {sections.map((section) => (
          <section key={section.label} className="space-y-3">
            {sections.length > 1 && (
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span className="w-1 h-4 rounded-full inline-block" style={{ backgroundColor: primary }} />
                {section.label}
              </h2>
            )}
            <div className="space-y-3">
              {section.items.map((product) => (
                <PharmacyProductCard
                  key={product.id}
                  product={product}
                  primaryColor={primary}
                  cartQty={getCartQty(product.id)}
                  onAdd={handleAdd}
                  onOpenDetail={setSelectedProduct}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-semibold text-gray-700">No products found</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
              Try adjusting your search or filters, or speak with our pharmacist for personalised advice.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); setRxFilter('all') }}
              className="mt-4 text-sm font-semibold hover:underline"
              style={{ color: primary }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 max-w-sm mx-auto z-30">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-between px-5 shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: primary }}
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/25 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
              <span>View Cart</span>
            </div>
            <span>RM {useCartStore.getState().getTotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Product detail drawer */}
      <PharmacyProductDrawer
        product={selectedProduct}
        primaryColor={primary}
        cartQty={selectedProduct ? getCartQty(selectedProduct.id) : 0}
        onClose={() => setSelectedProduct(null)}
        onAdd={handleAdd}
      />

      {/* Cart panel */}
      <PharmacyCartPanel
        primaryColor={primary}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  )
}
