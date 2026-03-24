import { createSupabaseServer } from '@/lib/supabase/server'
import { DisputesTable } from '@/components/admin/disputes/DisputesTable'

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createSupabaseServer()

  let query = supabase
    .from('disputes')
    .select(`
      *,
      orders(id, total_amount, store_id, stores(name)),
      profiles!raised_by(full_name, phone)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data: disputes } = await query

  const openCount = disputes?.filter((d) => d.status === 'open').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="text-gray-500 text-sm mt-1">
          {openCount > 0
            ? <span className="text-red-600 font-medium">{openCount} open disputes require attention</span>
            : 'No open disputes'}
        </p>
      </div>

      <div className="flex gap-2">
        {['all','open','under_review','resolved','closed'].map((s) => (
          <a
            key={s}
            href={`/admin/disputes?status=${s}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors
              ${(status ?? 'all') === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s.replace('_', ' ')}
          </a>
        ))}
      </div>

      <DisputesTable disputes={disputes ?? []} />
    </div>
  )
}
