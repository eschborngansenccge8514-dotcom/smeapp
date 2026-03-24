import Link from 'next/link'
import Image from 'next/image'

interface StoreCardProps {
  store: {
    id: string
    name: string
    description: string | null
    category: string | null
    address: string | null
    logo_url: string | null
    distance_km?: number
  }
  href?: string
}

export function StoreCard({ store, href }: StoreCardProps) {
  return (
    <Link href={href ?? `/store/${store.id}`} className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
      <div className="relative h-40 bg-gray-100">
        {store.logo_url ? (
          <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{store.name}</h3>
        {store.category && <p className="text-sm text-gray-500 mt-0.5">{store.category}</p>}
        {store.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{store.description}</p>}
        <div className="flex items-center gap-3 mt-2">
          {store.address && <span className="text-xs text-gray-400 truncate">📍 {store.address}</span>}
          {store.distance_km !== undefined && (
            <span className="text-xs text-indigo-500 font-medium ml-auto shrink-0">{store.distance_km.toFixed(1)} km</span>
          )}
        </div>
      </div>
    </Link>
  )
}
