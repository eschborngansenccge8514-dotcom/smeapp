import Image from 'next/image'
import { isStoreOpen } from '@/lib/industry'
import type { FnbStore } from '@/lib/industry/types'

export function FnbHero({ store, theme }: { store: FnbStore; theme: any }) {
  const { isOpen, label, nextChange } = isStoreOpen(store.operating_hours)

  return (
    <div className="relative">
      {/* Cover image */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-orange-900 to-amber-800 overflow-hidden">
        {store.cover_image_url ? (
          <Image src={store.cover_image_url} alt={store.name} fill
            className="object-cover opacity-80" priority />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-20">🍜</div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Open/Closed pill */}
        <div className="absolute top-4 right-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border ${
            isOpen
              ? 'bg-green-500/90 text-white border-green-400'
              : 'bg-gray-900/80 text-gray-300 border-gray-700'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
            {label}
          </div>
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end gap-4">
            {/* Logo */}
            {store.logo_url && (
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0">
                <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-2xl font-bold drop-shadow">{store.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {store.is_halal_certified && (
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ HALAL
                  </span>
                )}
                {store.rating && (
                  <span className="text-yellow-400 text-sm font-semibold flex items-center gap-1">
                    ⭐ {store.rating.toFixed(1)}
                    <span className="text-white/70 font-normal">({store.review_count ?? 0})</span>
                  </span>
                )}
                {store.avg_prep_time_min && (
                  <span className="text-white/80 text-sm flex items-center gap-1">
                    🕐 {store.avg_prep_time_min}–{store.avg_prep_time_min + 10} min
                  </span>
                )}
                {store.loyalty_programs?.[0]?.is_enabled && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    🏆 {store.loyalty_programs[0].base_points_per_myr}X REWARDS
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-6 text-sm overflow-x-auto scrollbar-none">
          {store.address && (
            <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
              📍 {store.address}
            </span>
          )}
          {nextChange && (
            <span className={`flex items-center gap-1.5 shrink-0 font-medium ${isOpen ? 'text-green-600' : 'text-orange-500'}`}>
              🕐 {nextChange}
            </span>
          )}
          {store.min_order_amount && (
            <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
              🛒 Min. order RM {store.min_order_amount.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
