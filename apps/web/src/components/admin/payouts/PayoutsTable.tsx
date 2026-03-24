'use client'
import { DataTable } from '../ui/DataTable'
import { StatusBadge } from '../ui/StatusBadge'
import { formatPrice } from '@/lib/utils'
import { formatDate } from '@/lib/date'

export function PayoutsTable({ payouts }: { payouts: any[] }) {
  return (
    <DataTable
      data={payouts}
      columns={[
        { key: 'store', label: 'Store', render: (row) => (
          <div className="flex items-center gap-3">
            {row.stores?.logo_url
              ? <img src={row.stores?.logo_url} className="w-8 h-8 rounded-lg object-cover" />
              : <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs">🏪</div>
            }
            <span className="font-medium">{row.stores?.name}</span>
          </div>
        )},
        { key: 'amount', label: 'Amount', render: (row) => <span className="font-bold text-indigo-600">{formatPrice(row.amount)}</span> },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { key: 'reference', label: 'Reference', render: (row) => <span className="text-xs font-mono text-gray-400 capitalize underline underline-offset-4">{row.razorpay_payout_id?.slice(0, 12)}</span> },
        { key: 'created_at', label: 'Processed', render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}
