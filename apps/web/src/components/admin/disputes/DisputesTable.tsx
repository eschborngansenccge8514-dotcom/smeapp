'use client'
import { useRouter } from 'next/navigation'
import { DataTable } from '../ui/DataTable'
import { StatusBadge } from '../ui/StatusBadge'
import { formatPrice } from '@/lib/utils'
import { formatDate } from '@/lib/date'

export function DisputesTable({ disputes }: { disputes: any[] }) {
  const router = useRouter()

  return (
    <DataTable
      data={disputes}
      onRowClick={(row) => router.push(`/admin/disputes/${row.id}`)}
      columns={[
        {
          key: 'order_id',
          label: 'Order',
          render: (row) => (
            <span className="font-mono text-xs">
              #{row.orders?.id.slice(0, 8).toUpperCase()}
            </span>
          ),
        },
        {
          key: 'customer',
          label: 'Customer',
          render: (row) => (
            <div>
              <p className="font-medium text-sm">{row.profiles?.full_name}</p>
              <p className="text-xs text-gray-400">{row.profiles?.phone}</p>
            </div>
          ),
        },
        { key: 'store', label: 'Store', render: (row) => row.orders?.stores?.name },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
          key: 'amount',
          label: 'Amount',
          render: (row) => (
            <span className="font-semibold text-red-600">{formatPrice(row.orders?.total_amount)}</span>
          ),
        },
        { key: 'created_at', label: 'Date', render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}
