'use client'
import { useRouter } from 'next/navigation'
import { DataTable } from '../ui/DataTable'
import { StatusBadge } from '../ui/StatusBadge'
import { formatPrice } from '@/lib/utils'
import { formatDate } from '@/lib/date'
import { Download } from 'lucide-react'

export function OrdersTable({ orders }: { orders: any[] }) {
  const router = useRouter()

  function exportCSV() {
    const headers = ['Order ID','Customer','Store','Status','Amount','Delivery Type','Date']
    const rows = orders.map((o) => [
      o.id,
      o.profiles?.full_name,
      o.stores?.name,
      o.status,
      o.total_amount,
      o.delivery_type,
      o.created_at,
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>
      <DataTable
        data={orders}
        onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
        columns={[
          {
            key: 'id',
            label: 'Order ID',
            render: (row) => (
              <span className="font-mono text-xs text-gray-600">
                #{row.id.slice(0, 8).toUpperCase()}
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
          { key: 'store', label: 'Store', render: (row) => row.stores?.name },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          {
            key: 'payment',
            label: 'Payment',
            render: (row) => (
              <StatusBadge status={row.payments?.[0]?.status ?? 'pending'} />
            ),
          },
          {
            key: 'delivery_type',
            label: 'Delivery',
            render: (row) => (
              <span className="text-xs">
                {row.delivery_type === 'lalamove' ? '🛵 Lalamove' : '📦 EasyParcel'}
              </span>
            ),
          },
          {
            key: 'total_amount',
            label: 'Amount',
            render: (row) => (
              <span className="font-semibold text-indigo-600">{formatPrice(row.total_amount)}</span>
            ),
          },
          { key: 'created_at', label: 'Date', render: (row) => formatDate(row.created_at) },
        ]}
      />
    </div>
  )
}
