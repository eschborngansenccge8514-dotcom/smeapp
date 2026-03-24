import { createSupabaseServer } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductFilters } from '@/components/products/ProductFilters'

interface Props {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; min_price?: string; max_price?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, category, sort, min_price, max_price } = await searchParams
  const supabase = await createSupabaseServer()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.rpc('search_products', {
      p_query:       q || null,
      p_category_id: category || null,
      p_min_price:   min_price ? parseFloat(min_price) : null,
      p_max_price:   max_price ? parseFloat(max_price) : null,
      p_sort:        sort ?? 'popular',
      p_limit:       48,
      p_offset:      0,
    }),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {q ? <>Results for "<span className="text-indigo-600">{q}</span>"</> : 'All Products'}
        </h1>
      </div>

      {/* Search box */}
      <form>
        <div className="relative">
          <input name="q" defaultValue={q}
            placeholder="Search products across all stores..."
            className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm" />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        </div>
      </form>

      <ProductFilters categories={categories ?? []} totalCount={products?.length ?? 0} />
      <ProductGrid products={products ?? []} showStore cols={4} />
    </div>
  )
}
