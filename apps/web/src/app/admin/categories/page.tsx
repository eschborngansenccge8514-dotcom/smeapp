import { createSupabaseServer } from '@/lib/supabase/server'
import { CategoriesTable } from '@/components/admin/categories/CategoriesTable'

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServer()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Global Categories</h1>
        <p className="text-gray-500 text-sm mt-1">Manage product categories across the platform</p>
      </div>
      <CategoriesTable categories={categories ?? []} />
    </div>
  )
}
