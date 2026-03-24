import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductGrid } from '@/components/merchant/products/ProductGrid'
import { ProductSearch } from '@/components/merchant/products/ProductSearch'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function MerchantProductsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  let query = supabase
    .from('products')
    .select('*, categories(name)')
    .eq('store_id', store!.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: products } = await query

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{products?.length ?? 0} products</p>
        </div>
        <Link href="/merchant/products/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      <div className="flex gap-3">
        <ProductSearch defaultValue={q} />
      </div>

      <ProductGrid products={products ?? []} storeId={store!.id} />
    </div>
  )
}
