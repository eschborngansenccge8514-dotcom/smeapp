import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createSupabaseServer } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/products/ProductGrid'
import { ProductFilters } from '@/components/products/ProductFilters'
import { Star, Clock, MapPin, Phone, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    q?: string; category?: string; sort?: string
    min_price?: string; max_price?: string
  }>
}

export default async function StorePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { q, category, sort, min_price, max_price } = await searchParams

  const supabase = await createSupabaseServer()

  const [{ data: store }, { data: categories }] = await Promise.all([
    supabase.from('stores')
      .select('*, store_hours(*), profiles(full_name)')
      .eq('id', id).eq('is_active', true).single(),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
  ])

  if (!store) notFound()

  const { data: products } = await supabase.rpc('search_products', {
    p_store_id:    id,
    p_query:       q || null,
    p_category_id: category || null,
    p_min_price:   min_price ? parseFloat(min_price) : null,
    p_max_price:   max_price ? parseFloat(max_price) : null,
    p_sort:        sort ?? 'popular',
    p_limit:       48,
    p_offset:      0,
  })

  // Is store open now?
  const now = new Date()
  const todayHours = store.store_hours?.find(
    (h: any) => h.day_of_week === now.getDay()
  )
  const isOpen = todayHours && !todayHours.is_closed

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Store Hero Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl overflow-hidden mb-6">
        {store.banner_url && (
          <Image src={store.banner_url} alt={store.name} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
        <div className="absolute inset-0 flex items-end p-6">
          <div className="flex items-end gap-4">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl border-4 border-white">
                🏪
              </div>
            )}
            <div className="text-white pb-1">
              <h1 className="text-2xl md:text-3xl font-bold">{store.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {store.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-medium">{Number(store.rating).toFixed(1)}</span>
                    <span className="text-white/70 text-sm">({store.reviews_count})</span>
                  </div>
                )}
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
                  ${isOpen ? 'bg-green-500/80' : 'bg-gray-500/60'}`}>
                  <Clock size={11} />
                  {isOpen
                    ? `Open · closes ${todayHours.close_time}`
                    : 'Closed'}
                </span>
                {store.est_delivery_minutes && (
                  <span className="text-white/80 text-xs">
                    ~{store.est_delivery_minutes} min delivery
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store meta strip */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        {store.address && (
          <div className="flex items-center gap-1.5">
            <MapPin size={15} className="text-indigo-400" />
            <span>{store.address}</span>
          </div>
        )}
        {store.phone && (
          <div className="flex items-center gap-1.5">
            <Phone size={15} className="text-indigo-400" />
            <a href={`tel:${store.phone}`} className="hover:text-indigo-600">{store.phone}</a>
          </div>
        )}
        {store.min_order_amount > 0 && (
          <div className="flex items-center gap-1.5">
            <Package size={15} className="text-indigo-400" />
            <span>Min order {formatPrice(store.min_order_amount)}</span>
          </div>
        )}
        {store.description && (
          <p className="w-full text-gray-600 text-sm">{store.description}</p>
        )}
      </div>

      {/* Search bar */}
      <form className="mb-4">
        <div className="relative">
          <input
            name="q"
            defaultValue={q}
            placeholder={`Search in ${store.name}...`}
            className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          {q && (
            <a href={`/store/${id}`}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</a>
          )}
        </div>
      </form>

      {/* Filters */}
      <div className="mb-5">
        <ProductFilters categories={categories ?? []} totalCount={products?.length ?? 0} />
      </div>

      {/* Product Grid */}
      <ProductGrid products={products ?? []} />
    </div>
  )
}
