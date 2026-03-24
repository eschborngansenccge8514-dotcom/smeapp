import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ProductForm } from '@/components/merchant/products/ProductForm'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  const { data: product } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .eq('store_id', store!.id)
    .single()

  if (!product) notFound()

  const { data: categories } = await supabase
    .from('categories').select('*').eq('is_active', true).order('sort_order')

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h1>
      <ProductForm storeId={store!.id} categories={categories ?? []} product={product} />
    </div>
  )
}
