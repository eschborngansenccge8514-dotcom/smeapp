import Image from 'next/image'
import { isStoreOpen } from '@/lib/industry'
import type { ElectronicsProduct } from '@/lib/industry/types'

interface Props {
  store: any
  primaryColor: string
  featuredProduct?: ElectronicsProduct | null
  onFeaturedClick: () => void
}

export function ElectronicsHero({ store, primaryColor, featuredProduct, onFeaturedClick }: Props) {
  const { isOpen, label } = isStoreOpen(store.operating_hours)

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm">
      {/* Store identity bar */}
      <div style={{ background: `linear-gradient(135deg, #0F172A, ${primaryColor})` }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-white/20 flex items-center justify-center bg-white/10 shrink-0">
              {store.logo_url
                ? <Image src={store.logo_url} alt={store.name} width={32} height={32} className="object-cover" />
                : <span className="text-base">💻</span>}
            </div>
            <span className="text-white font-bold text-sm">{store.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              isOpen ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              {label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {store.is_official_store && (
              <span className="text-xs font-bold bg-yellow-400/20 text-yellow-300 px-2.5 py-1 rounded-full border border-yellow-400/30">
                ⭐ Official Store
              </span>
            )}
            {store.address && (
              <span className="text-white/60 text-xs hidden sm:inline">📍 {store.address}</span>
            )}
          </div>
        </div>
      </div>

      {/* Featured product banner (optional) */}
      {featuredProduct && (
        <div
          className="relative overflow-hidden cursor-pointer group"
          style={{ background: `linear-gradient(135deg, #0F172A 0%, ${primaryColor}33 100%)` }}
          onClick={onFeaturedClick}
        >
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between gap-6">
            <div className="space-y-2 max-w-sm">
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-white/50">
                Featured Deal
              </span>
              <h2 className="text-2xl font-bold text-white leading-snug">
                {featuredProduct.name}
              </h2>
              {featuredProduct.quick_specs && featuredProduct.quick_specs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {featuredProduct.quick_specs.slice(0, 3).map((spec) => (
                    <span key={spec}
                      className="text-xs text-white/70 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                      {spec}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-baseline gap-2 pt-1">
                {featuredProduct.is_on_promotion && featuredProduct.promotion_price ? (
                  <>
                    <span className="text-2xl font-bold text-white">
                      RM {featuredProduct.promotion_price.toFixed(2)}
                    </span>
                    <span className="text-white/50 line-through text-sm">
                      RM {featuredProduct.price.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-white">
                    From RM {featuredProduct.price.toFixed(2)}
                  </span>
                )}
              </div>
              <button
                className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-900 bg-white hover:bg-gray-100 transition-all shadow-md group-hover:scale-105"
              >
                View Details →
              </button>
            </div>

            {featuredProduct.image_url && (
              <div className="relative h-36 w-36 shrink-0 hidden sm:block group-hover:scale-105 transition-transform duration-300">
                <Image
                  src={featuredProduct.image_url}
                  alt={featuredProduct.name}
                  fill
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
