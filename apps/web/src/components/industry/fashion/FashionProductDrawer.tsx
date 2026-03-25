'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { FashionProduct } from '@/lib/industry/types'
import { FashionSizeGuide } from './FashionSizeGuide'

interface Props {
  product: FashionProduct | null
  primaryColor: string
  accentColor: string
  isWishlisted: boolean
  onClose: () => void
  onAddToCart: (product: FashionProduct, size: string, colour: string, qty: number) => void
  onWishlistToggle: (product: FashionProduct) => void
}

export function FashionProductDrawer({
  product, primaryColor, accentColor,
  isWishlisted, onClose, onAddToCart, onWishlistToggle,
}: Props) {
  const [activeImg, setActiveImg]       = useState(0)
  const [selectedColour, setColour]     = useState<string>('')
  const [selectedSize, setSize]         = useState<string>('')
  const [qty, setQty]                   = useState(1)
  const [tab, setTab]                   = useState<'details' | 'care'>('details')
  const [sizeGuideOpen, setSizeGuide]   = useState(false)
  const [addedAnim, setAddedAnim]       = useState(false)
  const [sizeError, setSizeError]       = useState(false)

  // Reset on product change
  useEffect(() => {
    if (!product) return
    setActiveImg(0)
    setColour(product.colours?.[0]?.name ?? '')
    setSize('')
    setQty(1)
    setTab('details')
    setSizeError(false)
  }, [product?.id])

  if (!product) return null

  const activeColour = product.colours?.find((c) => c.name === selectedColour)
    ?? product.colours?.[0]

  // Build image gallery
  const gallery = [
    activeColour?.image_url ?? product.image_url,
    ...(product.gallery_urls ?? []),
    ...(product.colours?.filter((c) => c.name !== selectedColour && c.image_url).map((c) => c.image_url!) ?? []),
  ].filter(Boolean) as string[]

  // Get stock for selected variant
  function getVariantStock(size: string): number {
    if (!product) return 0
    const variant = product.variants?.find(
      (v) => v.size === size && v.colour === (selectedColour || product.colours?.[0]?.name)
    )
    return variant?.stock_qty ?? (product.stock_qty > 0 ? 99 : 0)
  }

  const isOnSale = product.is_on_sale && product.sale_price != null
  const displayPrice = isOnSale ? product.sale_price! : product.price
  const discountPct = isOnSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0

  function handleAddToCart() {
    if (!selectedSize) { setSizeError(true); return }
    onAddToCart(product!, selectedSize, selectedColour, qty)
    setAddedAnim(true)
    setTimeout(() => { setAddedAnim(false); onClose() }, 1200)
  }

  const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'care',    label: 'Care & Fabric' },
  ] as const

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Full-width bottom sheet on mobile, side panel on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[95vh] flex flex-col bg-white rounded-t-3xl overflow-hidden md:inset-0 md:m-auto md:max-w-2xl md:max-h-[92vh] md:rounded-3xl">

        {/* Image gallery */}
        <div className="relative shrink-0" style={{ aspectRatio: '16/9', maxHeight: 320 }}>
          {gallery.length > 0 ? (
            <Image
              src={gallery[activeImg]}
              alt={product.name}
              fill
              className="object-cover object-top"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-7xl text-gray-200">👗</div>
          )}

          {/* Close + wishlist */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-700 font-bold shadow-sm hover:bg-white">
            ✕
          </button>
          <button
            onClick={() => onWishlistToggle(product)}
            className="absolute top-4 right-16 w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
            style={{ backgroundColor: isWishlisted ? primaryColor : 'rgba(255,255,255,0.9)' }}
          >
            {isWishlisted ? '❤️' : '🤍'}
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-1.5">
            {product.is_new_arrival && (
              <span className="bg-black text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">NEW</span>
            )}
            {isOnSale && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Image thumbnails */}
          {gallery.length > 1 && (
            <div className="absolute bottom-3 left-4 flex gap-1.5">
              {gallery.slice(0, 6).map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeImg ? 'border-white shadow-md scale-110' : 'border-white/40'
                  }`}
                >
                  <Image src={url} alt="" width={40} height={40} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name + price */}
          <div>
            {product.brand && (
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{product.brand}</p>
            )}
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h2>
            {product.fit_type && (
              <p className="text-xs text-gray-400 mt-0.5">{product.fit_type}</p>
            )}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold" style={{ color: isOnSale ? '#E53E3E' : '#1A202C' }}>
                RM {displayPrice.toFixed(2)}
              </span>
              {isOnSale && (
                <span className="text-sm text-gray-400 line-through">RM {product.price.toFixed(2)}</span>
              )}
              {isOnSale && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                  Save RM {(product.price - product.sale_price!).toFixed(2)}
                </span>
              )}
            </div>
            {product.model_height && (
              <p className="text-xs text-gray-400 mt-1 italic">{product.model_height}</p>
            )}
          </div>

          {/* Colour selector */}
          {product.colours && product.colours.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2">
                Colour: <span className="font-normal text-gray-500">{selectedColour || product.colours[0].name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colours.map((colour) => {
                  const isSelected = selectedColour === colour.name || (!selectedColour && colour === product.colours[0])
                  return (
                    <button
                      key={colour.name}
                      onClick={() => { setColour(colour.name); setSize('') }}
                      title={colour.name}
                      className={`relative w-9 h-9 rounded-full border-4 transition-all hover:scale-110 ${
                        isSelected ? 'border-gray-800 scale-110 shadow-md' : 'border-white shadow-sm'
                      }`}
                      style={{ backgroundColor: colour.hex, outline: isSelected ? `2px solid ${colour.hex}` : 'none', outlineOffset: 2 }}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Size selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-bold ${sizeError ? 'text-red-500' : 'text-gray-800'}`}>
                Size {sizeError && <span className="font-normal text-red-500">— please select a size</span>}
              </p>
              <button
                onClick={() => setSizeGuide(true)}
                className="text-xs font-semibold hover:underline flex items-center gap-1"
                style={{ color: primaryColor }}
              >
                📏 Size Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                const stock = getVariantStock(size)
                const outOfStock = stock === 0
                const isSelected = selectedSize === size
                const isLowStock = !outOfStock && stock <= 3

                return (
                  <button
                    key={size}
                    onClick={() => { if (!outOfStock) { setSize(size); setSizeError(false) } }}
                    disabled={outOfStock}
                    className={`relative min-w-[48px] h-11 px-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      outOfStock
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50 line-through'
                        : isSelected
                        ? 'text-white shadow-md scale-105'
                        : 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                    }`}
                    style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                  >
                    {size}
                    {isLowStock && !outOfStock && (
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-orange-400 rounded-full border border-white" />
                    )}
                  </button>
                )
              })}
            </div>
            {product.sizes.some((s) => getVariantStock(s) <= 3 && getVariantStock(s) > 0) && (
              <p className="text-xs text-orange-500 mt-1.5 flex items-center gap-1">
                🟠 Sizes with orange dot are almost sold out
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex gap-4 mb-3">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-sm font-semibold pb-1.5 border-b-2 transition-all ${
                    tab === t.key ? 'border-current' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  style={tab === t.key ? { color: primaryColor, borderColor: primaryColor } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'details' && (
              <div className="space-y-3">
                {product.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {product.fit_type && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400">Fit</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{product.fit_type}</p>
                    </div>
                  )}
                  {product.material && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400">Material</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{product.material}</p>
                    </div>
                  )}
                  {product.gender_target && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400">Gender</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{product.gender_target}</p>
                    </div>
                  )}
                  {product.country_of_origin && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400">Made in</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{product.country_of_origin}</p>
                    </div>
                  )}
                </div>
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'care' && (
              <div className="space-y-2">
                {product.material && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Fabric</p>
                    <p className="text-sm text-gray-800">{product.material}</p>
                  </div>
                )}
                {product.care_instructions && product.care_instructions.length > 0 ? (
                  <div className="space-y-1.5">
                    {product.care_instructions.map((inst, i) => (
                      <div key={i} className="flex gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                        <span className="text-gray-400 shrink-0">🧺</span>
                        <p className="text-sm text-gray-700">{inst}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {[
                      '🌡️ Machine wash cold (30°C)',
                      '❌ Do not bleach',
                      '🔄 Tumble dry low',
                      '🔥 Iron on low heat',
                      '🧴 Do not dry clean',
                    ].map((i) => (
                      <div key={i} className="flex gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                        <p className="text-sm text-gray-700">{i}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="h-4" />
        </div>

        {/* CTA Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0 space-y-3">
          {/* Qty selector */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">Quantity</p>
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-2 py-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center"
                style={{ color: primaryColor }}>−</button>
              <span className="text-base font-bold text-gray-900 w-5 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)}
                className="w-8 h-8 rounded-lg font-bold text-base text-white flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}>+</button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-between px-5 transition-all hover:opacity-90 active:scale-[0.99]"
            style={{
              backgroundColor: addedAnim ? '#10B981' : primaryColor,
              color: 'white',
            }}
          >
            <span>{addedAnim ? '✓ Added to Cart!' : 'Add to Cart'}</span>
            {!addedAnim && <span>RM {(displayPrice * qty).toFixed(2)}</span>}
          </button>
        </div>
      </div>

      <FashionSizeGuide
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuide(false)}
        category={product.category}
        primaryColor={primaryColor}
      />
    </>
  )
}
