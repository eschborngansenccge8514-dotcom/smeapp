'use client'
import { DataTable } from '../ui/DataTable'
import { StatusBadge } from '../ui/StatusBadge'
import { formatPrice } from '@/lib/utils'
import { formatDate } from '@/lib/date'

export function PaymentsTable({ payments }: { payments: any[] }) {
  return (
    <DataTable
      data={payments}
      columns={[
        { key: 'id', label: 'ID', render: (row) => <span className="font-mono text-xs text-gray-400">#{row.id.slice(0, 8).toUpperCase()}</span> },
        { key: 'order', label: 'Order', render: (row) => <span className="font-mono text-xs">#{row.order_id.slice(0, 8).toUpperCase()}</span> },
        { key: 'store', label: 'Store', render: (row) => <span className="text-sm font-medium">{row.orders?.stores?.name}</span> },
        { key: 'amount', label: 'Amount', render: (row) => <span className="font-bold text-indigo-600 underline underline-offset-4">{formatPrice(row.amount)}</span> },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { key: 'method', label: 'Method', render: (row) => <span className="text-xs uppercase font-medium bg-gray-50 px-2 py-1 rounded-lg decoration-indigo-400 decoration-wavy">{row.payment_method}</span> },
        { key: 'date', label: 'Date', render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}
