import Image from 'next/image'
import { isStoreOpen } from '@/lib/industry'

interface Props {
  store: any
  primaryColor: string
}

const TRUST_BADGES = [
  { icon: '✅', label: 'MOH Licensed' },
  { icon: '🔒', label: '100% Authentic' },
  { icon: '🚚', label: 'Same-day Delivery' },
  { icon: '👨‍⚕️', label: 'Pharmacist Consulted' },
]

export function PharmacyHero({ store, primaryColor }: Props) {
  const { isOpen, label, nextChange } = isStoreOpen(store.operating_hours)

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Store identity bar */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 overflow-hidden"
            style={{ borderColor: primaryColor }}
          >
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={56} height={56} className="object-cover" />
            ) : (
              <span className="text-2xl">💊</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-gray-900 text-lg">{store.name}</h1>
              {store.is_halal_certified && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  ✓ Halal
                </span>
              )}
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {store.address && (
                <span className="text-gray-500 text-xs flex items-center gap-1">📍 {store.address}</span>
              )}
              {nextChange && (
                <span className="text-gray-400 text-xs">· {nextChange}</span>
              )}
              {store.registration_no && (
                <span className="text-gray-400 text-xs">· Reg: {store.registration_no}</span>
              )}
            </div>
          </div>

          {/* Rating */}
          {store.rating && (
            <div className="hidden sm:flex flex-col items-center shrink-0">
              <span className="text-2xl font-bold text-gray-900">{store.rating.toFixed(1)}</span>
              <span className="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</span>
              <span className="text-xs text-gray-400">{store.review_count ?? 0} reviews</span>
            </div>
          )}
        </div>
      </div>

      {/* Trust badges strip */}
      <div className="border-t border-gray-50" style={{ backgroundColor: `${primaryColor}08` }}>
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-6 overflow-x-auto scrollbar-none">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm">{badge.icon}</span>
              <span className="text-xs font-semibold text-gray-600">{badge.label}</span>
            </div>
          ))}
          {store.description && (
            <>
              <div className="w-px h-4 bg-gray-200 shrink-0" />
              <p className="text-xs text-gray-500 shrink-0 max-w-xs truncate">{store.description}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
