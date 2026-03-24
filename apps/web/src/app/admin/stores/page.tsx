import { createSupabaseServer } from '@/lib/supabase/server'
import { StoresTable } from '@/components/admin/stores/StoresTable'

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = await createSupabaseServer()

  let query = supabase
    .from('stores')
    .select('*, profiles(full_name, phone, role)')
    .order('created_at', { ascending: false })

  if (status === 'pending') query = query.eq('is_active', false)
  else if (status === 'active') query = query.eq('is_active', true)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: stores } = await query

  const pending = stores?.filter((s) => !s.is_active).length ?? 0
  const active  = stores?.filter((s) => s.is_active).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {active} active · <span className="text-amber-600">{pending} awaiting approval</span>
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All',     value: undefined },
          { label: 'Active',  value: 'active' },
          { label: 'Pending', value: 'pending' },
        ].map(({ label, value }) => (
          <a
            key={label}
            href={value ? `/admin/stores?status=${value}` : '/admin/stores'}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${status === value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            {label}
          </a>
        ))}
      </div>

      <StoresTable stores={stores ?? []} />
    </div>
  )
}
