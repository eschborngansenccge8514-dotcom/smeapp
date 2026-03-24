import { ProductCard } from './ProductCard'

export function ProductGrid({
  products,
  showStore = false,
  loading = false,
  cols = 4,
}: {
  products: any[]
  showStore?: boolean
  loading?: boolean
  cols?: 2 | 3 | 4
}) {
  const GRID_COLS = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }

  if (loading) {
    return (
      <div className={`grid ${GRID_COLS[cols]} gap-4`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-5 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 col-span-full">
        <p className="text-5xl mb-3">🔍</p>
        <p className="text-gray-500 font-medium">No products found</p>
        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className={`grid ${GRID_COLS[cols]} gap-4`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} showStore={showStore} />
      ))}
    </div>
  )
}
