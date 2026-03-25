'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { ShoppingBag, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, ChevronRight, Settings, Key, Database, Save, Info } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  store: any
  gmcStats: {
    synced: number
    pending: number
    failed: number
  }
}

export default function GmcClient({ store, gmcStats: initialStats }: Props) {
  const supabase = createSupabaseBrowser()
  const [enabled, setEnabled] = useState(store.gmc_enabled ?? false)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState(initialStats)
  const [merchantId, setMerchantId] = useState(store.gmc_merchant_id || '')
  const [serviceAccountJson, setServiceAccountJson] = useState(store.gmc_service_account || '')
  const [savingSettings, setSavingSettings] = useState(false)

  async function saveGmcSettings() {
    setSavingSettings(true)
    try {
      // Basic JSON validation if provided
      if (serviceAccountJson) {
        JSON.parse(serviceAccountJson)
      }

      const { error } = await supabase
        .from('stores')
        .update({
          gmc_merchant_id: merchantId.trim(),
          gmc_service_account: serviceAccountJson.trim()
        })
        .eq('id', store.id)
      
      if (error) throw error
      toast.success('GMC Credentials updated successfully')
    } catch (err: any) {
      toast.error(err.message?.includes('JSON') ? 'Invalid JSON format' : 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  async function toggleGMC() {
    const newValue = !enabled
    const { error } = await supabase.from('stores').update({ gmc_enabled: newValue }).eq('id', store.id)
    
    if (error) {
      toast.error('Failed to update settings')
      return
    }

    setEnabled(newValue)
    toast.success(newValue ? 'Google Shopping feed enabled' : 'Google Shopping feed disabled')
  }

  async function syncNow() {
    setSyncing(true)
    try {
      const res = await fetch('/api/gmc/sync-store', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET ?? ''
        },
        body: JSON.stringify({ storeId: store.id }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Sync complete: ${data.succeeded} products synced`)
        // Refresh local stats
        const { data: products } = await supabase
          .from('products')
          .select('gmc_status')
          .eq('store_id', store.id)
        
        if (products) {
          setStats({
            synced:  products.filter(p => p.gmc_status === 'synced').length,
            pending: products.filter(p => p.gmc_status === 'pending').length,
            failed:  products.filter(p => p.gmc_status === 'failed').length,
          })
        }
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch (err) {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Google Merchant Center</h2>
        <p className="text-gray-500 text-lg mt-2">
          Reach millions of shoppers by listing your products on Google Shopping and Search for free.
        </p>
      </div>

      {/* Enable Toggle Card */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-blue-50/50 flex items-center justify-between group hover:border-blue-100 transition-all duration-300">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <ShoppingBag size={28} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">Google Shopping Feed</p>
            <p className="text-gray-500 mt-1">Automatically sync your inventory to Google Merchant Center.</p>
          </div>
        </div>
        
        <button
          onClick={toggleGMC}
          className={`relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-500 outline-none ring-offset-2 ring-indigo-500 focus:ring-2
            ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
            ${enabled ? 'translate-x-8' : 'translate-x-1'}`} />
        </button>
      </div>

      {enabled ? (
        <div className="space-y-8 animate-in zoom-in-95 fade-in duration-500">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Synced',  value: stats.synced,  color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
              { label: 'Pending', value: stats.pending, color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock },
              { label: 'Failed',  value: stats.failed,  color: 'text-rose-600',    bg: 'bg-rose-50',    icon: AlertTriangle },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className={`${bg} rounded-3xl p-6 border border-white shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-md transition-all duration-300`}>
                <div className={`w-10 h-10 ${bg} brightness-95 rounded-full flex items-center justify-center mb-3`}>
                   <Icon size={20} className={color} />
                </div>
                <p className={`text-4xl font-black ${color} tracking-tighter`}>{value}</p>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-2">{label}</p>
              </div>
            ))}
          </div>

          {/* Action Center */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-indigo-50/50 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Sync Controls</h3>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full uppercase tracking-tighter">Live Connection</span>
            </div>
            
            <button
              onClick={syncNow}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-indigo-200"
            >
              <RefreshCw size={22} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing Catalog...' : 'Trigger Manual Sync Now'}
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-sm transition-all duration-300 border border-transparent hover:border-gray-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <CheckCircle size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Real-time Sync</p>
                  <p className="text-sm text-gray-500 leading-relaxed">Changes to your products are pushed to Google within minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-sm transition-all duration-300 border border-transparent hover:border-gray-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Clock size={20} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Nightly Audit</p>
                  <p className="text-sm text-gray-500 leading-relaxed">Every night at 2 AM, we perform a full catalog integrity sync.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements & Knowledge */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-amber-900 text-xl flex items-center gap-3">
                <AlertTriangle size={24} className="text-amber-600" />
                Google Shopping Eligibility
              </h3>
              <a href="https://support.google.com/merchants" target="_blank" className="text-amber-700 text-sm font-bold flex items-center gap-1 hover:underline">
                Legal Requirements <ExternalLink size={14} />
              </a>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                 <div className="text-emerald-500 bg-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">✓</div>
                 <p className="text-amber-900 font-medium">Verified product names, prices and high-res images</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                 <div className="text-emerald-500 bg-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm">✓</div>
                 <p className="text-amber-900 font-medium">Publicly accessible product URLs for Googlebot</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-100/50 rounded-xl border border-amber-200/50">
                 <div className="text-amber-600 bg-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm font-bold">!</div>
                 <p className="text-amber-900 font-medium">Ensure your Store Return Policy is clearly defined</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-100/50 rounded-xl border border-amber-200/50">
                 <div className="text-amber-600 bg-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm font-bold">!</div>
                 <p className="text-amber-900 font-medium">Accurate shipping fees must be configured</p>
              </div>
            </div>
            
            <button className="mt-8 text-amber-700 font-bold flex items-center gap-2 hover:gap-3 transition-all duration-300">
               Learn more about Merchant Policies <ChevronRight size={18} />
            </button>
          </div>

          {/* Advanced Credentials */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-indigo-50/50 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Settings size={22} className="text-gray-400" />
                Advanced Configuration
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase">
                <Info size={12} /> Optional Overrides
              </div>
            </div>

            <p className="text-sm text-gray-500 bg-blue-50/50 p-4 rounded-2xl border border-blue-50 leading-relaxed">
              By default, we use the marketplace's global Merchant Center account. If you wish to use your own dedicated account, provide your credentials below.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2 ml-1">
                  <Database size={14} /> GMC Merchant ID
                </label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="e.g. 531284901"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2 ml-1">
                  <Key size={14} /> Service Account JSON
                </label>
                <textarea
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  placeholder='{ "type": "service_account", ... }'
                  rows={6}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs text-gray-600 leading-relaxed"
                />
              </div>
            </div>

            <button
              onClick={saveGmcSettings}
              disabled={savingSettings}
              className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black disabled:opacity-50 transition-all duration-300 shadow-lg shadow-gray-200"
            >
              {savingSettings ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
              Save Configuration
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-3xl p-12 border border-dashed border-gray-200 text-center animate-in fade-in zoom-in-95 duration-700">
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
             <ShoppingBag size={32} className="text-gray-300" />
           </div>
           <h3 className="text-2xl font-bold text-gray-900">Grow Your Reach</h3>
           <p className="text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">
             Enable Google Shopping to automatically list your products where millions of people shop every day.
           </p>
           <button 
             onClick={toggleGMC}
             className="mt-8 bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
           >
             Enable Free Listings
           </button>
        </div>
      )}
    </div>
  )
}

function Clock({ size, className }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
