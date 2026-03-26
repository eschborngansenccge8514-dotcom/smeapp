'use client'
import { useState, useMemo, useEffect } from 'react'
import { useCartStore } from '@/stores/useCartStore'
import { getIndustryTheme } from '@/lib/industry'
import { FnbHero } from './FnbHero'
import { FnbCategoryTabs } from './FnbCategoryTabs'
import { FnbProductCard } from './FnbProductCard'
import { FnbProductModal } from './FnbProductModal'
import { FnbCartDrawer } from './FnbCartDrawer'
import type { FnbStore, FnbProduct, FnbAddonOption } from '@/lib/industry/types'

interface Props {
  store: FnbStore
  products: FnbProduct[]
}

export function FnbStorePage({ store, products }: Props) {
  const theme = getIndustryTheme(store.category)
  const primary = store.primary_color ?? theme.primaryColor
  const accent  = theme.accentColor

  const [activeCategory, setActiveCategory]   = useState('All')
  const [searchQuery, setSearchQuery]         = useState('')
  const [selectedProduct, setSelectedProduct] = useState<FnbProduct | null>(null)
  const [cartOpen, setCartOpen]               = useState(false)
  const [mounted, setMounted]                 = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { addItem, clearCart, getItemCount, storeId } = useCartStore()
  const cartCount = getItemCount()

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = products
      .map((p) => p.category)
      .filter(Boolean) as string[]
    return [...new Set(cats)]
  }, [products])

  // Popular items for featured section
  const popularItems = useMemo(() =>
    products.filter((p) => p.is_popular && p.is_available).slice(0, 6),
    [products]
  )

  // Filtered products
  const filtered = useMemo(() => {
    let result = products
    if (activeCategory !== 'All') result = result.filter((p) => p.category === activeCategory)
    if (searchQuery) result = result.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return result
  }, [products, activeCategory, searchQuery])

  // Group by category
  const grouped = useMemo(() => {
    if (activeCategory !== 'All' || searchQuery) return { [activeCategory || 'Items']: filtered }
    const groups: Record<string, FnbProduct[]> = {}
    if (popularItems.length > 0) groups['⭐ Popular'] = popularItems
    for (const cat of categories) {
      const items = filtered.filter((p) => p.category === cat)
      if (items.length) groups[cat] = items
    }
    if (!categories.length) groups['Menu'] = filtered
    return groups
  }, [filtered, categories, activeCategory, searchQuery, popularItems])

  function handleAddToCart(product: FnbProduct, qty: number, addons: FnbAddonOption[], notes: string) {
    const addonPrice = addons.reduce((s, a) => s + a.price_add, 0)
    const itemName = addons.length
      ? `${product.name} (${addons.map((a) => a.name).join(', ')})`
      : notes ? `${product.name} — ${notes}` : product.name
    // Encode addon selection as variant_id so the cart store deduplicates correctly.
    // When there are no addons, variant_id is null (maps to the "_base" key in the cart UI).
    const addonKey = addons.map((a) => a.id).join('-')
    const variantId = addonKey || null

    const result = addItem(
      {
        id: product.id,
        name: itemName,
        price: product.price + addonPrice,
        quantity: Math.abs(qty),
        image_urls: product.image_url ? [product.image_url] : [],
        stock_qty: product.stock_qty ?? 999,
        variant_id: variantId,
        store_id: store.id,
      },
      store.id,
      store.name
    )

    if (result === 'cross_store') {
      if (window.confirm(`Your cart has items from another store. Clear and add from ${store.name}?`)) {
        clearCart()
        handleAddToCart(product, qty, addons, notes)
      }
    }
  }

  function handleQuickAdd(product: FnbProduct, qty: number) {
    if (product.addons?.length) {
      setSelectedProduct(product)
      return
    }
    if (qty < 0) {
      const { items, updateQuantity } = useCartStore.getState()
      const existing = items.find((i) => i.id === product.id && i.variant_id === null)
      if (existing) updateQuantity(product.id, null, Math.max(0, existing.quantity + qty))
      return
    }
    handleAddToCart(product, qty, [], '')
  }

  return (
    <div style={{ backgroundColor: theme.bgColor, minHeight: '100vh' }}>
      {/* F&B Hero */}
      <FnbHero store={store} theme={theme} />

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder={theme.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory('All') }}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 shadow-sm text-gray-900 placeholder-gray-400"
            style={{ '--tw-ring-color': primary } as React.CSSProperties}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <FnbCategoryTabs
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
          primaryColor={primary}
        />
      )}

      {/* Menu Sections */}
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-8 pb-32">
        {Object.entries(grouped).map(([sectionName, items]) => (
          <section key={sectionName}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{sectionName}</h2>
            <div className="space-y-3">
              {items.map((product) => (
                <FnbProductCard
                  key={product.id}
                  product={product}
                  primaryColor={primary}
                  accentColor={accent}
                  onAdd={handleQuickAdd}
                  onOpenDetail={setSelectedProduct}
                />
              ))}
            </div>
          </section>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">{theme.emptyIcon}</p>
            <p className="text-gray-500">{theme.emptyLabel}</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {mounted && cartCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-30">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-between px-5 shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: primary }}>
            <div className="flex items-center gap-2">
              <span className="bg-white/25 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
              <span>View Order</span>
            </div>
            <span>RM {useCartStore.getState().getTotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      <FnbProductModal
        product={selectedProduct}
        primaryColor={primary}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(product, qty, addons, notes) => {
          handleAddToCart(product, qty, addons, notes)
          setCartOpen(true)
        }}
      />

      {/* Cart Drawer */}
      <FnbCartDrawer
        primaryColor={primary}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  )
}
