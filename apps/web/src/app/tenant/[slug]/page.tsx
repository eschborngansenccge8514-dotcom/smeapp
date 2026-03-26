import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/products/ProductCard'

export default async function TenantStorePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .or(`slug.eq.${params.slug},custom_domain.eq.${params.slug}`)
    .eq('is_active', true)
    .single()

  if (!store) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('is_available', true)
    .order('name')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="py-16 bg-[var(--store-primary-10)]">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
            {store.name}
          </h1>
          {store.description && (
            <p className="text-gray-500 mt-4 text-xl max-w-2xl mx-auto">
              {store.description}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products?.map((product) => (
            <ProductCard
              key={product.id}
              product={product as any}
              storeSlug={params.slug}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
