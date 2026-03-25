'use client'
import { useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Clock, ExternalLink, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export function GMCSyncPanel({ stats, recentLogs, failedProducts }: any) {
  const [syncing, setSyncing] = useState<string | null>(null)

  async function triggerSync(type: 'all' | 'failed') {
    setSyncing(type)
    try {
      const res = await fetch('/api/gmc/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET ?? '',
        },
        body: JSON.stringify({ onlyFailed: type === 'failed' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Sync complete: ${data.succeeded} synced, ${data.failed} failed`)
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch {
      toast.error('Sync failed')
    }
    setSyncing(null)
  }

  async function retrySingle(productId: string) {
    setSyncing(productId)
    try {
      const res = await fetch('/api/gmc/sync-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET ?? '',
        },
        body: JSON.stringify({ productId, action: 'upsert' }),
      })
      const data = await res.json()
      if (data.success) toast.success('Product synced to GMC')
      else toast.error(`Sync failed: ${data.error}`)
    } catch {
      toast.error('Sync failed')
    }
    setSyncing(null)
  }

  const STATUS_COLORS: Record<string, string> = {
    success: 'text-green-600 bg-green-50',
    failed:  'text-red-600 bg-red-50',
    pending: 'text-amber-600 bg-amber-50',
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Synced',   value: stats?.synced  ?? 0, icon: CheckCircle2, color: 'text-green-500'  },
          { label: 'Pending Sync',   value: stats?.pending ?? 0, icon: Clock,        color: 'text-amber-500'  },
          { label: 'Failed',         value: stats?.failed  ?? 0, icon: XCircle,      color: 'text-red-500'    },
          { label: 'Excluded',       value: stats?.excluded ?? 0, icon: AlertTriangle, color: 'text-gray-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={18} className={color} />
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-indigo-600 rounded-full" />
            Sync Controls
          </h3>
          <p className="text-sm text-gray-400">
            {stats?.last_sync_at
              ? `Last full sync: ${new Date(stats.last_sync_at).toLocaleString('en-MY')}`
              : 'Never fully synced'
            }
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => triggerSync('all')}
            disabled={!!syncing}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
          >
            <RefreshCw size={18} className={syncing === 'all' ? 'animate-spin' : ''} />
            {syncing === 'all' ? 'Syncing...' : 'Sync All Products'}
          </button>
          
          <button
            onClick={() => triggerSync('failed')}
            disabled={!!syncing || failedProducts.length === 0}
            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={18} className={syncing === 'failed' ? 'animate-spin' : ''} />
            Retry Failed ({failedProducts.length})
          </button>
          
          <a
            href={`https://merchants.google.com/mc/overview?a=${process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID || ''}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-50 text-gray-700 border border-gray-100 px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-all ml-auto"
          >
            Merchant Center <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Products */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <XCircle size={18} className="text-red-500" />
            Failed Products
          </h3>
          {failedProducts.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed">
              <CheckCircle2 className="mx-auto text-green-400 mb-2" size={32} />
              <p className="text-sm text-gray-500">No failed products currently</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {failedProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.stores?.name} · {
                      p.gmc_synced_at ? new Date(p.gmc_synced_at).toLocaleString('en-MY') : 'Never'
                    }</p>
                  </div>
                  <button
                    onClick={() => retrySingle(p.id)}
                    disabled={syncing === p.id}
                    className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 disabled:opacity-50 transition-all"
                  >
                    <RefreshCw size={12} className={syncing === p.id ? 'animate-spin' : ''} />
                    Retry
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sync Log */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <Clock size={18} className="text-amber-500" />
            Recent Activity
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                  log.status === 'success' ? 'bg-green-500' : 
                  log.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {log.products?.name ?? log.offer_id}
                    </p>
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                      {new Date(log.synced_at).toLocaleTimeString('en-MY')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">
                      {log.products?.stores?.name || 'Internal Update'}
                    </span>
                  </div>
                  {log.error && (
                    <p className="text-[11px] text-red-500 mt-2 bg-red-50 p-2 rounded-lg border border-red-100 italic">
                      Error: {log.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
