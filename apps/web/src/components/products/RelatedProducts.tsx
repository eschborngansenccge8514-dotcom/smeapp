import Link from 'next/link'
import { ProductCard } from './ProductCard'
import { ChevronRight } from 'lucide-react'

export function RelatedProducts({
  products, storeId, storeName
}: { products: any[]; storeId: string; storeName: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">More from {storeName}</h2>
        <Link href={`/store/${storeId}`}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          View all <ChevronRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
