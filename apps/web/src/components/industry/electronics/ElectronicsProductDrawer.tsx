'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { SPEC_GROUP_ORDER, REFURBISHED_GRADES, TRUST_BADGES } from '@/lib/industry/themes/electronics'
import type { ElectronicsProduct, ElectronicsVariant } from '@/lib/industry/types'

interface Props {
  product: ElectronicsProduct | null
  primaryColor: string
  onClose: () => void
  onAddToCart: (product: ElectronicsProduct, variant: ElectronicsVariant | null, qty: number) => void
}

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'specs',     label: '📋 Specs' },
  { key: 'in_box',    label: '📦 In the Box' },
] as const
type TabKey = typeof TABS[number]['key']

export function ElectronicsProductDrawer({ product, primaryColor, onClose, onAddToCart }: Props) {
  const [activeImg, setActiveImg]           = useState(0)
  const [selectedOptions, setOptions]       = useState<Record<string, string>>({})
  const [qty, setQty]                       = useState(1)
  const [tab, setTab]                       = useState<TabKey>('overview')
  const [added, setAdded]                   = useState(false)
  const [variantError, setVariantError]     = useState(false)
  const [specGroupOpen, setSpecGroupOpen]   = useState<Record<string, boolean>>({ Overview: true })

  useEffect(() => {
    if (!product) return
    setActiveImg(0)
    setTab('overview')
    setAdded(false)
    setVariantError(false)
    // Pre-select first option for each variant dimension
    if (product.variant_options) {
      const defaults: Record<string, string> = {}
      for (const [key, vals] of Object.entries(product.variant_options)) {
        if (vals.length > 0) defaults[key] = vals[0]
      }
      setOptions(defaults)
    } else {
      setOptions({})
    }
  }, [product?.id])

  if (!product) return null

  const gallery = [
    product.image_url,
    ...(product.gallery_urls ?? []),
  ].filter(Boolean) as string[]

  // Find matching variant from selected options
  const selectedVariant = product.variants.find((v) =>
    Object.entries(selectedOptions).every(([k, val]) => v.options[k] === val)
  ) ?? (product.variants.length === 1 ? product.variants[0] : null)

  const variantPrice = selectedVariant?.price ?? product.price
  const isOnPromo    = product.is_on_promotion && product.promotion_price != null
  const displayPrice = isOnPromo ? product.promotion_price! : variantPrice
  const discountPct  = isOnPromo
    ? Math.round(((product.price - product.promotion_price!) / product.price) * 100)
    : 0
  const stockQty     = selectedVariant?.stock_qty ?? product.stock_qty
  const unavailable  = !product.is_available || stockQty <= 0
  const grade        = product.is_refurbished && product.refurbished_grade
    ? REFURBISHED_GRADES[product.refurbished_grade] : null
  const maxQty       = Math.min(product.max_order_qty ?? 10, stockQty)

  // Group specs
  const specsByGroup: Record<string, typeof product.specs> = {}
  for (const spec of product.specs) {
    if (!specsByGroup[spec.group]) specsByGroup[spec.group] = []
    specsByGroup[spec.group].push(spec)
  }
  const groupOrder = [
    ...SPEC_GROUP_ORDER.filter((g) => specsByGroup[g]),
    ...Object.keys(specsByGroup).filter((g) => !SPEC_GROUP_ORDER.includes(g)),
  ]

  function handleAdd() {
    if (product!.variant_options && Object.keys(product!.variant_options).length > 0 && !selectedVariant) {
      setVariantError(true)
      return
    }
    onAddToCart(product!, selectedVariant, qty)
    setAdded(true)
    setTimeout(() => { setAdded(false); onClose() }, 1200)
  }

  const stars = product.rating
    ? Math.round(product.rating)
    : 0

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[95vh] flex flex-col overflow-hidden md:inset-0 md:m-auto md:max-w-2xl md:max-h-[92vh] md:rounded-3xl">

        {/* Image gallery */}
        <div className="relative shrink-0 bg-gray-50" style={{ aspectRatio: '16/9', maxHeight: 280 }}>
          {gallery.length > 0 ? (
            <Image src={gallery[activeImg]} alt={product.name} fill className="object-contain p-4" priority />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl text-gray-200">💻</div>
          )}

          {/* Controls */}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-700 shadow-sm font-bold hover:bg-white">
            ✕
          </button>

          {/* Promo badge */}
          {isOnPromo && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow">
              -{discountPct}% OFF
            </div>
          )}

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm rounded-2xl px-3 py-2">
              {gallery.map((url, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeImg ? 'border-white scale-110' : 'border-white/30'
                  }`}>
                  <Image src={url} alt="" width={32} height={32} className="object-contain w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name + brand */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {product.brand && (
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{product.brand}</p>
                )}
                <h2 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h2>
                {product.model_number && (
                  <p className="text-xs text-gray-400 mt-0.5">Model: {product.model_number}</p>
                )}
              </div>
              {grade && (
                <div className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-xl"
                  style={{ backgroundColor: grade.bg, color: grade.color }}>
                  Grade {product.refurbished_grade}
                </div>
              )}
            </div>

            {/* Rating row */}
            {product.rating && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className={`text-sm ${s <= stars ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-900">{product.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({product.review_count ?? 0} reviews)</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: isOnPromo ? '#E53E3E' : '#1A202C' }}>
              RM {displayPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </span>
            {isOnPromo && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  RM {product.price.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                  Save RM {(product.price - product.promotion_price!).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
              </>
            )}
          </div>

          {/* Trust badges row */}
          <div className="flex flex-wrap gap-2">
            {product.is_official_warranty && product.warranty_months && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-xl">
                🛡️ {product.warranty_months >= 12
                  ? `${product.warranty_months / 12}yr`
                  : `${product.warranty_months}mo`} Official Warranty
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl">
              ✅ Genuine Product
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1.5 rounded-xl">
              🔄 Free Returns
            </span>
          </div>

          {/* Variant selectors */}
          {product.variant_options && Object.keys(product.variant_options).length > 0 && (
            <div className={`space-y-4 ${variantError ? 'ring-2 ring-red-300 rounded-2xl p-3 bg-red-50' : ''}`}>
              {variantError && (
                <p className="text-red-500 text-xs font-semibold flex items-center gap-1">⚠ Please select all options</p>
              )}
              {Object.entries(product.variant_options).map(([optKey, optVals]) => {
                const isColour = optKey.toLowerCase() === 'colour' || optKey.toLowerCase() === 'color'
                return (
                  <div key={optKey}>
                    <p className="text-sm font-bold text-gray-800 mb-2 capitalize">
                      {optKey}:
                      <span className="font-normal text-gray-500 ml-1">
                        {selectedOptions[optKey] ?? '—'}
                      </span>
                    </p>

                    {isColour ? (
                      // Colour circles
                      <div className="flex flex-wrap gap-2">
                        {optVals.map((val) => {
                          const variantForVal = product.variants.find((v) => v.options[optKey] === val)
                          const outOfStock = variantForVal ? variantForVal.stock_qty === 0 : false
                          const isSelected = selectedOptions[optKey] === val
                          // Try to derive hex from colour name map or use primaryColor
                          const colourHexMap: Record<string, string> = {
                            'Midnight Black': '#1A1A1A', 'Space Gray': '#6E6E6E',
                            'Silver': '#C0C0C0', 'Gold': '#FFD700', 'Blue': '#3B82F6',
                            'Green': '#22C55E', 'Red': '#EF4444', 'White': '#F9FAFB',
                            'Purple': '#A855F7', 'Pink': '#EC4899',
                          }
                          const hex = colourHexMap[val] ?? primaryColor
                          return (
                            <button
                              key={val}
                              onClick={() => { if (!outOfStock) { setOptions((o) => ({ ...o, [optKey]: val })); setVariantError(false) } }}
                              disabled={outOfStock}
                              title={`${val}${outOfStock ? ' — Out of Stock' : ''}`}
                              className={`relative w-9 h-9 rounded-full border-4 transition-all hover:scale-110 ${
                                outOfStock ? 'opacity-30 cursor-not-allowed' : ''
                              } ${isSelected ? 'border-gray-800 scale-110 shadow-md' : 'border-white shadow-sm'}`}
                              style={{ backgroundColor: hex, outline: isSelected ? `2px solid ${hex}` : 'none', outlineOffset: 2 }}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      // Generic option buttons
                      <div className="flex flex-wrap gap-2">
                        {optVals.map((val) => {
                          const variantForVal = product.variants.find((v) => v.options[optKey] === val)
                          const outOfStock = variantForVal ? variantForVal.stock_qty === 0 : false
                          const priceAddon = variantForVal ? (variantForVal.price - product.price) : 0
                          const isSelected = selectedOptions[optKey] === val
                          return (
                            <button
                              key={val}
                              onClick={() => { if (!outOfStock) { setOptions((o) => ({ ...o, [optKey]: val })); setVariantError(false) } }}
                              disabled={outOfStock}
                              className={`relative px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                                outOfStock ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through' :
                                isSelected ? 'text-white shadow-md scale-105' :
                                'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                              }`}
                              style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                            >
                              {val}
                              {priceAddon > 0 && (
                                <span className={`text-xs ml-1 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                                  +RM{priceAddon}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Stock status */}
          {!unavailable && stockQty <= (product.low_stock_threshold ?? 5) && (
            <p className="text-orange-500 text-sm font-semibold flex items-center gap-2">
              ⚠ Only {stockQty} unit{stockQty !== 1 ? 's' : ''} left
            </p>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-1 border-b border-gray-100 mb-3">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    tab === t.key ? '' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  style={tab === t.key ? { color: primaryColor, borderColor: primaryColor } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {tab === 'overview' && (
              <div className="space-y-3">
                {product.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                )}
                {/* Highlight specs */}
                {product.specs.filter((s) => s.highlight).length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {product.specs.filter((s) => s.highlight).map((spec) => (
                      <div key={spec.key} className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                        <p className="text-xs text-gray-400">{spec.key}</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {grade && (
                  <div className="rounded-xl p-4 space-y-1"
                    style={{ backgroundColor: grade.bg, border: `1px solid ${grade.color}30` }}>
                    <p className="font-bold text-sm" style={{ color: grade.color }}>
                      ♻️ {grade.label}
                    </p>
                    <p className="text-xs" style={{ color: grade.color }}>{grade.description}</p>
                    <p className="text-xs opacity-70" style={{ color: grade.color }}>
                      Refurbished products are tested, cleaned and verified by our technicians.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Full Specs */}
            {tab === 'specs' && (
              <div className="space-y-2">
                {groupOrder.map((group) => (
                  <div key={group} className="border border-gray-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setSpecGroupOpen((s) => ({ ...s, [group]: !s[group] }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-bold text-gray-800">{group}</span>
                      <span className={`text-gray-400 text-xs transition-transform ${specGroupOpen[group] ? 'rotate-180' : ''}`}>
                        ▾
                      </span>
                    </button>
                    {specGroupOpen[group] && (
                      <table className="w-full text-sm">
                        <tbody>
                          {specsByGroup[group]?.map((spec, idx) => (
                            <tr key={spec.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-2.5 text-gray-500 text-xs font-medium w-2/5">{spec.key}</td>
                              <td className="px-4 py-2.5 text-gray-900 text-xs font-semibold">{spec.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* In the Box */}
            {tab === 'in_box' && (
              <div className="space-y-2">
                {(product.in_box_items ?? ['Device', 'USB-C Cable', 'Quick Charger', 'Documentation']).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <span className="text-green-500 font-bold shrink-0">✓</span>
                    <span className="text-sm text-gray-800">{item}</span>
                  </div>
                ))}
                <div className="flex gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-2">
                  <span className="text-blue-400 shrink-0">ℹ️</span>
                  <p className="text-xs text-blue-600">
                    Box contents may vary slightly by region. Contact us if you have questions.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>

        {/* CTA Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: isOnPromo ? '#E53E3E' : '#1A202C' }}>
                RM {displayPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </p>
              {selectedVariant && (
                <p className="text-xs text-gray-400 mt-0.5">{selectedVariant.label}</p>
              )}
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-8 h-8 rounded-lg font-bold flex items-center justify-center"
                style={{ color: primaryColor }}>−</button>
              <span className="text-base font-bold text-gray-900 w-5 text-center">{qty}</span>
              <button onClick={() => setQty(Math.min(maxQty, qty + 1))}
                disabled={qty >= maxQty}
                className="w-8 h-8 rounded-lg font-bold text-white flex items-center justify-center disabled:opacity-30"
                style={{ backgroundColor: primaryColor }}>+</button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={unavailable}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-between px-5 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            style={{ backgroundColor: added ? '#10B981' : primaryColor, color: 'white' }}
          >
            <span>{unavailable ? 'Out of Stock' : added ? '✓ Added to Cart!' : 'Add to Cart'}</span>
            {!added && !unavailable && (
              <span>RM {(displayPrice * qty).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
