import { createSupabaseServer } from '@/lib/supabase/server'
import { UsersTable } from '@/components/admin/users/UsersTable'

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServer()
  const { data: users } = await supabase
    .from('profiles')
    .select('*, stores(id), orders(id)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">{users?.length ?? 0} total users registered</p>
      </div>
      <UsersTable users={users ?? []} />
    </div>
  )
}
