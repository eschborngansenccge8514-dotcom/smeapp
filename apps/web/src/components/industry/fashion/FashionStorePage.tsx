'use client'
import { useState, useMemo, useCallback } from 'react'
import { useCartStore } from '@/stores/useCartStore'
import { getIndustryTheme } from '@/lib/industry'
import { FashionHero } from './FashionHero'
import { FashionCollectionNav } from './FashionCollectionNav'
import { FashionFilterBar } from './FashionFilterBar'
import { FashionProductCard } from './FashionProductCard'
import { FashionProductDrawer } from './FashionProductDrawer'
import { FashionWishlist } from './FashionWishlist'
import { FashionCartDrawer } from './FashionCartDrawer'
import type { FashionProduct } from '@/lib/industry/types'

interface Props {
  store: any
  products: FashionProduct[]
}

export function FashionStorePage({ store, products }: Props) {
  const theme = getIndustryTheme(store.category)
  const primary = store.primary_color ?? theme.primaryColor
  const accent  = theme.accentColor

  const [activeCategory, setCategory]         = useState('All')
  const [genderFilter, setGender]             = useState('all')
  const [sortBy, setSort]                     = useState('default')
  const [searchQuery, setSearch]              = useState('')
  const [selectedProduct, setProduct]         = useState<FashionProduct | null>(null)
  const [wishlist, setWishlist]               = useState<FashionProduct[]>([])
  const [wishlistOpen, setWishlistOpen]       = useState(false)
  const [cartOpen, setCartOpen]               = useState(false)

  const { addItem, clearCart, getItemCount, getTotal, items, storeId } = useCartStore()
  const cartCount = getItemCount()
  const total = getTotal()


  // Product counts by category
  const productCountByCat = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1
      if (p.is_new_arrival) counts['New Arrivals'] = (counts['New Arrivals'] ?? 0) + 1
    }
    return counts
  }, [products])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products]

    if (activeCategory === 'New Arrivals') result = result.filter((p) => p.is_new_arrival)
    else if (activeCategory !== 'All')     result = result.filter((p) => p.category === activeCategory)

    if (genderFilter !== 'all') result = result.filter((p) => !p.gender_target || p.gender_target === genderFilter)

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.material?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q)) ||
        p.colours?.some((c) => c.name.toLowerCase().includes(q))
      )
    }

    switch (sortBy) {
      case 'new_first':   result.sort((a, b) => (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0)); break
      case 'price_asc':   result.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));   break
      case 'price_desc':  result.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));   break
      case 'bestseller':  result.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));   break
      case 'sale_first':  result.sort((a, b) => (b.is_on_sale ? 1 : 0) - (a.is_on_sale ? 1 : 0));         break
    }
    return result
  }, [products, activeCategory, genderFilter, sortBy, searchQuery])

  // Wishlist helpers
  const isWishlisted = useCallback(
    (id: string) => wishlist.some((w) => w.id === id),
    [wishlist]
  )
  function toggleWishlist(product: FashionProduct) {
    setWishlist((prev) =>
      prev.find((w) => w.id === product.id)
        ? prev.filter((w) => w.id !== product.id)
        : [...prev, product]
    )
  }

  function handleAddToCart(product: FashionProduct, size: string, colour: string, qty: number) {
    const isOnSale = product.is_on_sale && product.sale_price != null
    const name = `${product.name} — ${colour}, ${size}`
    const variantId = product.variants?.find(v => v.size === size && v.colour === colour)?.id ?? null
    
    const result = addItem(
      {
        id: product.id,
        name,
        price: isOnSale ? product.sale_price! : product.price,
        quantity: qty,
        image_urls: [product.colours?.find((c) => c.name === colour)?.image_url ?? product.image_url].filter(Boolean) as string[],
        stock_qty: product.stock_qty,
        variant_id: variantId,
        store_id: store.id
      },
      store.id,
      store.name
    )
    if (result === 'cross_store') {

      if (window.confirm(`Clear cart and add from ${store.name}?`)) {
        clearCart()
        handleAddToCart(product, size, colour, qty)
      }
    } else {
      setCartOpen(true)
    }
  }

  function handleMoveWishlistToCart(product: FashionProduct) {
    setProduct(product)
    setWishlistOpen(false)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Lookbook hero */}
      <FashionHero
        store={store}
        primaryColor={primary}
        accentColor={accent}
        onCollectionSelect={(col) => { setCategory(col); setSearch('') }}
      />

      {/* Collection category nav */}
      <FashionCollectionNav
        activeCategory={activeCategory}
        genderFilter={genderFilter}
        onCategoryChange={(c) => { setCategory(c); setSearch('') }}
        primaryColor={primary}
        productCountByCat={productCountByCat}
      />

      {/* Filter bar */}
      <FashionFilterBar
        genderFilter={genderFilter}
        sortBy={sortBy}
        searchQuery={searchQuery}
        totalCount={filtered.length}
        onGenderChange={setGender}
        onSortChange={setSort}
        onSearchChange={(q) => { setSearch(q); if (q) setCategory('All') }}
        onWishlistOpen={() => setWishlistOpen(true)}
        wishlistCount={wishlist.length}
        primaryColor={primary}
      />

      {/* Product Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-28">
        {/* Results label */}
        {!searchQuery && (
          <p className="text-xs text-gray-400 mb-4 font-medium">
            {filtered.length} style{filtered.length !== 1 ? 's' : ''}
            {activeCategory !== 'All' && ` in ${activeCategory}`}
          </p>
        )}

        {/* 2-col mobile / 3-col tablet / 4-col desktop portrait grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {filtered.map((product) => (
              <FashionProductCard
                key={product.id}
                product={product}
                primaryColor={primary}
                accentColor={accent}
                isWishlisted={isWishlisted(product.id)}
                onOpenDetail={setProduct}
                onWishlistToggle={toggleWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-5xl mb-3">👗</p>
            <p className="font-semibold text-gray-700">No styles found</p>
            <p className="text-gray-400 text-sm mt-1">Try different filters or browse all collections</p>
            <button
              onClick={() => { setSearch(''); setCategory('All'); setGender('all') }}
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
              <span className="bg-white/25 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {cartCount}
              </span>
              <span>View Bag</span>
            </div>
            <span>RM {total.toFixed(2)}</span>

          </button>
        </div>
      )}

      {/* Product detail drawer */}
      <FashionProductDrawer
        product={selectedProduct}
        primaryColor={primary}
        accentColor={accent}
        isWishlisted={selectedProduct ? isWishlisted(selectedProduct.id) : false}
        onClose={() => setProduct(null)}
        onAddToCart={handleAddToCart}
        onWishlistToggle={toggleWishlist}
      />

      {/* Wishlist panel */}
      <FashionWishlist
        isOpen={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        wishlist={wishlist}
        primaryColor={primary}
        onRemove={(id) => setWishlist((w) => w.filter((p) => p.id !== id))}
        onMoveToCart={handleMoveWishlistToCart}
      />

      {/* Cart drawer */}
      <FashionCartDrawer
        primaryColor={primary}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  )
}
