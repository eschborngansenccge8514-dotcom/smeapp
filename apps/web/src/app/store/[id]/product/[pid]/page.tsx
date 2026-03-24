import { notFound } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { ProductImageGallery } from '@/components/products/ProductImageGallery'
import { ProductInfo } from '@/components/products/ProductInfo'
import { ProductReviews } from '@/components/products/ProductReviews'
import { RelatedProducts } from '@/components/products/RelatedProducts'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string; pid: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pid } = await params
  const supabase = await createSupabaseServer()
  const { data: product } = await supabase
    .from('products').select('name, description, image_urls').eq('id', pid).single()
  return {
    title: product?.name ?? 'Product',
    description: product?.description ?? undefined,
    openGraph: {
      images: product?.image_urls?.[0] ? [product.image_urls[0]] : [],
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id, pid } = await params
  const supabase = await createSupabaseServer()

  const [
    { data: product },
    { data: reviews },
    { data: related },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        stores(id, name, logo_url, rating, reviews_count, is_active),
        categories(name, icon),
        product_variants(*)
      `)
      .eq('id', pid)
      .eq('store_id', id)
      .single(),
    supabase
      .from('product_reviews')
      .select('*, profiles(full_name, avatar_url)')
      .eq('product_id', pid)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('products')
      .select('*, product_variants(count)')
      .eq('store_id', id)
      .eq('is_available', true)
      .neq('id', pid)
      .order('views_count', { ascending: false })
      .limit(8),
  ])

  if (!product || !product.stores?.is_active) notFound()

  // Increment view count (fire and forget)
  supabase.rpc('increment_product_views', { p_product_id: pid })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 flex items-center gap-2">
        <a href="/" className="hover:text-indigo-600">Home</a>
        <span>›</span>
        <a href={`/store/${id}`} className="hover:text-indigo-600">{product.stores.name}</a>
        <span>›</span>
        <span className="text-gray-700 truncate max-w-xs font-medium">{product.name}</span>
      </nav>

      {/* Main product section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <ProductImageGallery images={product.image_urls ?? []} productName={product.name} />
        <ProductInfo product={product} />
      </div>

      {/* Description */}
      {product.description && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-lg text-gray-900 mb-3">About this product</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
          {(product.sku || product.weight_kg) && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-sm text-gray-500">
              {product.sku && <span>SKU: <span className="font-mono">{product.sku}</span></span>}
              {product.weight_kg && <span>Weight: {product.weight_kg}kg</span>}
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      <ProductReviews
        productId={pid}
        reviews={reviews ?? []}
        avgRating={product.avg_rating}
        reviewCount={product.review_count}
      />

      {/* Related products */}
      {related && related.length > 0 && (
        <RelatedProducts products={related} storeId={id} storeName={product.stores.name} />
      )}
    </div>
  )
}
