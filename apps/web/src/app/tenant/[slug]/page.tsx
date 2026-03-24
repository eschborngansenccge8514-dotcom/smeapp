import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/ProductCard'

export default async function TenantStorePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .or(`brand_subdomain.eq.${params.slug},brand_custom_domain.eq.${params.slug}`)
    .eq('is_active', true)
    .single()

  if (!store) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_available', true)
    .order('name')

  const primary = store.brand_primary_color ?? '#6366F1'

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10" style={{ borderBottomColor: primary }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-xl" style={{ color: primary }}>{store.brand_app_name ?? store.name}</span>
          <a href={`/tenant/${params.slug}/cart`} className="text-gray-600 hover:opacity-80">Cart</a>
        </div>
      </nav>

      <div className="py-10" style={{ background: `linear-gradient(135deg, ${primary}22, transparent)` }}>
        <div className="max-w-6xl mx-auto px-4 text-center py-6">
          <h1 className="text-4xl font-bold" style={{ color: primary }}>{store.name}</h1>
          {store.description && <p className="text-gray-500 mt-2 text-lg">{store.description}</p>}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} storeId={store.id} storeName={store.name} />
          ))}
        </div>
      </div>
    </main>
  )
}
