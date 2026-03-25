'use client'
import Image from 'next/image'
import type { GroceryBundle, GroceryProduct } from '@/lib/industry/types'

interface Props {
  bundles: GroceryBundle[]
  primaryColor: string
  onAddBundle: (bundle: GroceryBundle) => void
}

export function GroceryBundleSection({ bundles, primaryColor, onAddBundle }: Props) {
  if (!bundles.length) return null

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🔥</span>
        <h2 className="text-base font-bold text-gray-900">Promotions & Bundle Deals</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="shrink-0 w-72 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-3 text-white" style={{ backgroundColor: primaryColor }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {bundle.bundle_type === 'buy_x_free_y' ? '🎁'
                    : bundle.bundle_type === 'combo' ? '🤝'
                    : '💰'}
                </span>
                <div>
                  <p className="font-bold text-sm leading-snug">{bundle.title}</p>
                  {bundle.subtitle && (
                    <p className="text-white/80 text-xs">{bundle.subtitle}</p>
                  )}
                </div>
              </div>
              {bundle.end_date && (
                <p className="text-white/70 text-xs mt-1.5 flex items-center gap-1">
                  ⏰ Ends {new Date(bundle.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>

            {/* Products preview */}
            <div className="flex gap-2 px-3 pt-3 overflow-x-auto scrollbar-none">
              {bundle.products.slice(0, 3).map((p) => (
                <div key={p.id} className="shrink-0 text-center">
                  <div className="relative w-14 h-14 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🛒</div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 w-14 truncate">{p.name}</p>
                  <p className="text-xs font-semibold text-gray-900">RM {p.price.toFixed(2)}</p>
                </div>
              ))}
              {bundle.products.length > 3 && (
                <div className="shrink-0 w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-xs font-bold text-gray-500 self-start">
                  +{bundle.products.length - 3}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="p-3 mt-auto">
              <div className="flex items-center justify-between mb-2">
                <div>
                  {bundle.bundle_price && (
                    <p className="text-sm font-bold" style={{ color: primaryColor }}>
                      Bundle: RM {bundle.bundle_price.toFixed(2)}
                    </p>
                  )}
                  {bundle.bundle_type === 'buy_x_free_y' && bundle.buy_qty && bundle.free_qty && (
                    <p className="text-xs text-gray-500">
                      Buy {bundle.buy_qty} get {bundle.free_qty} free
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onAddBundle(bundle)}
                className="w-full py-2 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: primaryColor }}
              >
                Add Bundle to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
