'use client'
import Link from 'next/link'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/date'

interface PendingApprovalsProps {
  stores: any[]
}

export function PendingApprovals({ stores }: PendingApprovalsProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Awaiting Approval</h3>
        <Link href="/admin/stores?status=pending" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <div key={store.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3 justify-between mb-2">
              <div className="flex items-center gap-3">
                {store.logo_url
                  ? <img src={store.logo_url} className="w-10 h-10 rounded-lg object-cover" />
                  : <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">🏪</div>
                }
                <div>
                  <p className="font-semibold text-sm text-gray-900 truncate max-w-[120px]">{store.name}</p>
                  <p className="text-xs text-gray-400">{store.category}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                {formatDate(store.created_at)}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/admin/stores/${store.id}`}
                  className="p-1 px-2 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100"
                >
                  REVIEW
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
