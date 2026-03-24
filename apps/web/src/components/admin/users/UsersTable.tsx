'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { DataTable } from '../ui/DataTable'
import { StatusBadge } from '../ui/StatusBadge'
import { MoreHorizontal, Shield, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

export function UsersTable({ users }: { users: any[] }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [loading, setLoading] = useState<string | null>(null)

  async function setRole(userId: string, role: string) {
    setLoading(userId)
    const { error } = await supabase.rpc('admin_set_user_role', { p_user_id: userId, p_role: role })
    if (error) toast.error(error.message)
    else {
      toast.success(`Role updated to ${role}`)
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <DataTable
      data={users}
      columns={[
        {
          key: 'full_name',
          label: 'User',
          render: (row) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                {row.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{row.full_name}</p>
                <p className="text-xs text-gray-500">{row.phone}</p>
              </div>
            </div>
          )
        },
        { key: 'role', label: 'Role', render: (row) => (
          <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
            row.role === 'admin' ? 'bg-purple-100 text-purple-700' :
            row.role === 'merchant' ? 'bg-amber-100 text-amber-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {row.role}
          </span>
        )},
        { key: 'stores', label: 'Store count', render: (row) => row.stores?.length ?? 0 },
        { key: 'orders', label: 'Orders', render: (row) => row.orders?.length ?? 0 },
        { key: 'created_at', label: 'Joined', render: (row) => formatDate(row.created_at) },
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            <div className="flex gap-2">
              {row.role !== 'admin' && (
                <button
                  onClick={() => setRole(row.id, 'admin')}
                  className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600"
                  title="Promote to Admin"
                >
                  <Shield size={14}/>
                </button>
              )}
              {row.role === 'customer' && (
                <button
                  onClick={() => setRole(row.id, 'merchant')}
                  className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600"
                  title="Make Merchant"
                >
                  <MoreHorizontal size={14}/>
                </button>
              )}
            </div>
          )
        }
      ]}
    />
  )
}
