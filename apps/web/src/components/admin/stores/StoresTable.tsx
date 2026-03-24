'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { DataTable } from '../ui/DataTable'
import { StatusBadge } from '../ui/StatusBadge'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import { formatDate } from '@/lib/date'
import toast from 'react-hot-toast'

export function StoresTable({ stores }: { stores: any[] }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [loading, setLoading] = useState<string | null>(null)

  async function approveStore(storeId: string, storeName: string) {
    setLoading(storeId)
    const { error } = await supabase.rpc('admin_approve_store', { p_store_id: storeId })
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`${storeName} has been approved`)
      router.refresh()
    }
    setLoading(null)
  }

  async function suspendStore(storeId: string, storeName: string) {
    const reason = prompt(`Reason for suspending "${storeName}":`)
    if (!reason) return
    setLoading(storeId)
    const { error } = await supabase.rpc('admin_suspend_store', {
      p_store_id: storeId,
      p_reason: reason,
    })
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`${storeName} has been suspended`)
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <DataTable
      data={stores}
      columns={[
        {
          key: 'name',
          label: 'Store',
          render: (row) => (
            <div className="flex items-center gap-3">
              {row.logo_url
                ? <img src={row.logo_url} className="w-9 h-9 rounded-lg object-cover" />
                : <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg">🏪</div>
              }
              <div>
                <p className="font-medium text-gray-900">{row.name}</p>
                <p className="text-xs text-gray-500 capitalize">{row.category}</p>
              </div>
            </div>
          ),
        },
        {
          key: 'owner',
          label: 'Owner',
          render: (row) => (
            <div>
              <p className="text-sm">{row.profiles?.full_name ?? '—'}</p>
              <p className="text-xs text-gray-400">{row.profiles?.phone ?? '—'}</p>
            </div>
          ),
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => (
            <StatusBadge status={row.is_active ? 'active' : 'pending'} />
          ),
        },
        {
          key: 'address',
          label: 'Location',
          render: (row) => (
            <span className="text-sm text-gray-500">{row.state ?? row.address?.slice(0, 30)}</span>
          ),
        },
        {
          key: 'created_at',
          label: 'Applied',
          render: (row) => <span className="text-sm text-gray-500">{formatDate(row.created_at)}</span>,
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            <div className="flex items-center gap-2">
              <a
                href={`/admin/stores/${row.id}`}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                title="View details"
              >
                <Eye size={15} />
              </a>
              {!row.is_active ? (
                <button
                  onClick={() => approveStore(row.id, row.name)}
                  disabled={loading === row.id}
                  className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50"
                >
                  <CheckCircle size={13} />
                  {loading === row.id ? '...' : 'Approve'}
                </button>
              ) : (
                <button
                  onClick={() => suspendStore(row.id, row.name)}
                  disabled={loading === row.id}
                  className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  <XCircle size={13} />
                  Suspend
                </button>
              )}
            </div>
          ),
        },
      ]}
    />
  )
}
