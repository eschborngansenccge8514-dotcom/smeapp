import Link from 'next/link'
import { MapPin } from 'lucide-react'

export function StoreCard({ store }: { store: any }) {
  return (
    <Link 
      href={`/store/${store.id}`}
      className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 border border-gray-100"
    >
      <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden shrink-0">
        {store.logo_url ? (
          <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">🏪</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{store.name}</h3>
        <p className="text-xs text-gray-500 capitalize mb-1">{store.category}</p>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <MapPin size={12} />
          <span className="truncate">{store.address}</span>
        </div>
      </div>
    </Link>
  )
}
