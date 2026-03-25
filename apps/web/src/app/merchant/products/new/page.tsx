import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductForm } from '@/components/merchant/products/ProductForm'

export default async function NewProductPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id, category').eq('owner_id', user.id).single()

  const { data: categories } = await supabase
    .from('categories').select('*').eq('is_active', true).order('sort_order')

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Product</h1>
      <ProductForm storeId={store!.id} storeCategory={store?.category} categories={categories ?? []} />
    </div>
  )
}
