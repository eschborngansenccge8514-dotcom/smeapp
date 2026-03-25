'use client'
import { useState, useMemo, useCallback } from 'react'
import { useCartStore } from '@/stores/useCartStore'
import { getIndustryTheme } from '@/lib/industry'
import { GROCERY_SORT_OPTIONS } from '@/lib/industry/themes/grocery'
import { GroceryHeader } from './GroceryHeader'
import { GrocerySidebar } from './GrocerySidebar'
import { GroceryDeptTabs } from './GroceryDeptTabs'
import { GroceryProductCard } from './GroceryProductCard'
import { GroceryBundleSection } from './GroceryBundleSection'
import { GroceryCartSidebar } from './GroceryCartSidebar'
import { GroceryProductDrawer } from './GroceryProductDrawer'
import type { GroceryProduct, GroceryBundle } from '@/lib/industry/types'

interface Props {
  store: any
  products: GroceryProduct[]
  bundles?: GroceryBundle[]
}

export function GroceryStorePage({ store, products, bundles = [] }: Props) {
  const theme = getIndustryTheme(store.category)
  const primary = store.brand_primary_color ?? theme.primaryColor

  const [activeDept, setActiveDept]           = useState('All')
  const [activeSubcat, setActiveSubcat]       = useState('')
  const [searchQuery, setSearchQuery]         = useState('')
  const [sortBy, setSortBy]                   = useState('default')
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null)
  const [cartOpen, setCartOpen]               = useState(false)

  const { addItem, updateQuantity, clearCart, getItemCount, items, storeId } = useCartStore()
  const cartCount = getItemCount()

  // Count products per department
  const productCountByDept = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      const cat = p.category || 'Other'
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    return counts
  }, [products])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products]

    if (activeDept !== 'All') {
      if (activeDept === 'Other') {
        result = result.filter((p) => !p.category)
      } else {
        result = result.filter((p) => p.category === activeDept)
      }
    }
    if (activeSubcat)         result = result.filter((p) => p.subcategory === activeSubcat)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      )
    }

    switch (sortBy) {
      case 'price_asc':   result.sort((a, b) => a.price - b.price);                                  break
      case 'price_desc':  result.sort((a, b) => b.price - a.price);                                  break
      case 'name_asc':    result.sort((a, b) => a.name.localeCompare(b.name));                       break
      case 'promo_first': result.sort((a, b) => (b.is_on_promotion ? 1 : 0) - (a.is_on_promotion ? 1 : 0)); break
    }

    return result
  }, [products, activeDept, activeSubcat, searchQuery, sortBy])

  // Group by subcategory when in a department
  const sections = useMemo(() => {
    if (searchQuery || activeSubcat) return [{ label: searchQuery ? `Results for "${searchQuery}"` : activeSubcat, items: filtered }]
    if (activeDept === 'All') {
      // Group by department
      const groups: { label: string; items: GroceryProduct[] }[] = []
      const deptNames = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[]
      for (const dept of deptNames) {
        const deptItems = filtered.filter((p) => p.category === dept)
        if (deptItems.length) groups.push({ label: dept, items: deptItems.slice(0, 8) })
      }
      const uncategorized = filtered.filter((p) => !p.category)
      if (uncategorized.length) {
        groups.push({ label: 'Other', items: uncategorized.slice(0, 8) })
      }
      return groups
    }
    // Group by subcategory within department
    const subcats = [...new Set(filtered.map((p) => p.subcategory).filter(Boolean))] as string[]
    if (subcats.length > 1) {
      const groups = subcats.map((sub) => ({ label: sub, items: filtered.filter((p) => p.subcategory === sub) }))
      const noSubcat = filtered.filter((p) => !p.subcategory)
      if (noSubcat.length) groups.push({ label: activeDept, items: noSubcat })
      return groups
    }
    return [{ label: activeDept, items: filtered }]
  }, [filtered, activeDept, activeSubcat, searchQuery, products])

  function getCartQty(productId: string): number {
    return items.find((i) => i.id === productId)?.quantity ?? 0
  }

  const handleAdd = useCallback((product: GroceryProduct, delta: number) => {
    if (delta < 0) {
      const existing = items.find((i) => i.id === product.id)
      if (existing) updateQuantity(product.id, null, Math.max(0, existing.quantity + delta))
      return
    }

    const hasPromo = product.is_on_promotion && product.promotion_price != null
    const price = hasPromo ? product.promotion_price! : product.price

    const result = addItem(
      {
        id: product.id,
        name: product.name,
        price,
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
      if (window.confirm(`Your basket has items from another store. Clear and start fresh from ${store.name}?`)) {
        clearCart()
        handleAdd(product, delta)
      }
    }
  }, [items, addItem, updateQuantity, clearCart, store])

  function handleAddBundle(bundle: GroceryBundle) {
    bundle.products.forEach((p) => handleAdd(p, bundle.buy_qty ?? 1))
  }

  function handleDeptChange(dept: string, subcat?: string) {
    setActiveDept(dept)
    setActiveSubcat(subcat ?? '')
    setSearchQuery('')
  }

  const showAll = activeDept === 'All' && !searchQuery

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Sticky Header */}
      <GroceryHeader
        store={store}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); if (q) setActiveDept('All') }}
        primaryColor={primary}
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
      />

      {/* Mobile Department Tabs */}
      {!searchQuery && (
        <GroceryDeptTabs
          activeDept={activeDept}
          onChange={(d) => handleDeptChange(d)}
          primaryColor={primary}
          productCountByDept={productCountByDept}
        />
      )}

      {/* Page body: sidebar + content + cart */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-5">
          {/* Left sidebar (desktop only) */}
          {!searchQuery && (
            <GrocerySidebar
              activeDept={activeDept}
              activeSubcat={activeSubcat}
              onDeptChange={handleDeptChange}
              primaryColor={primary}
              productCountByDept={productCountByDept}
            />
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* Bundles (only on All view) */}
            {showAll && (
              <GroceryBundleSection
                bundles={bundles}
                primaryColor={primary}
                onAddBundle={handleAddBundle}
              />
            )}

            {/* Sort + results bar */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500 font-medium">
                {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                {activeDept !== 'All' && ` in ${activeDept}`}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primary } as React.CSSProperties}
              >
                {GROCERY_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Product sections */}
            {[...sections].map((section) => (
              <section key={section.label} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 text-base">{section.label}</h2>
                  {showAll && section.items.length >= 8 && (
                    <button
                      onClick={() => handleDeptChange(section.label)}
                      className="text-sm font-semibold hover:underline"
                      style={{ color: primary }}
                    >
                      See all →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {section.items.map((product) => (
                    <GroceryProductCard
                      key={product.id}
                      product={product}
                      primaryColor={primary}
                      onAdd={handleAdd}
                      onOpenDetail={setSelectedProduct}
                      cartQty={getCartQty(product.id)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-24">
                <p className="text-5xl mb-3">🔍</p>
                <p className="font-semibold text-gray-700">No products found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search or browse departments</p>
                <button onClick={() => { setSearchQuery(''); setActiveDept('All') }}
                  className="mt-4 text-sm font-semibold hover:underline"
                  style={{ color: primary }}>
                  Clear filters
                </button>
              </div>
            )}
          </main>

          {/* Right cart sidebar (desktop) */}
          <GroceryCartSidebar
            primaryColor={primary}
            isOpen={cartOpen}
            onClose={() => setCartOpen(false)}
            minOrderAmount={store.min_order_amount}
          />
        </div>
      </div>

      {/* Mobile floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 max-w-sm mx-auto z-30 lg:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-between px-5 shadow-xl"
            style={{ backgroundColor: primary }}
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/25 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
              <span>View Basket</span>
            </div>
            <span>RM {useCartStore.getState().getTotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Product detail drawer */}
      <GroceryProductDrawer
        product={selectedProduct}
        primaryColor={primary}
        cartQty={selectedProduct ? getCartQty(selectedProduct.id) : 0}
        onClose={() => setSelectedProduct(null)}
        onAdd={handleAdd}
      />
    </div>
  )
}
