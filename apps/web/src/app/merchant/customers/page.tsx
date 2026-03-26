'use client'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { CrmContactTable } from '@/components/dashboard/crm/CrmContactTable'

export default function MerchantCustomersPage() {
  const [store, setStore] = useState<any>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    async function getStore() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', user.id)
          .single()
        setStore(data)
      }
    }
    getStore()
  }, [supabase])

  if (!store) return <div className="p-8 animate-pulse bg-gray-50 rounded-[40px] h-[600px]" />

  const primaryColor = store.brand_primary_color || '#6366F1'

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-3">
            <CrmContactTable storeId={store.id} primaryColor={primaryColor} />
         </div>
         
         <div className="space-y-6">
            <div className="bg-gray-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-all duration-700" />
               <div className="relative z-10">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Audience Growth</h3>
                 <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black">2.4k</span>
                    <span className="text-green-400 text-xs font-bold font-bold">↑ 12%</span>
                 </div>
                 <p className="text-sm font-medium text-gray-500 mb-8 italic">"Your organic reach is expanding."</p>
                 <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-indigo-500 rounded-full" />
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-6">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Quick Segments</h3>
               <div className="space-y-4">
                  {[
                    { label: 'High Value', count: 124, icon: '💎', color: 'blue' },
                    { label: 'Recent Buyers', count: 56, icon: '🔥', color: 'orange' },
                    { label: 'Dormant', count: 89, icon: '💤', color: 'gray' },
                  ].map((s) => (
                    <button key={s.label} className="w-full group flex items-center justify-between p-1 hover:pr-2 transition-all">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-sm shadow-sm border border-gray-100 group-hover:scale-110 transition-transform`}>{s.icon}</div>
                          <span className="text-sm font-bold text-gray-900">{s.label}</span>
                       </div>
                       <span className="text-xs font-black text-gray-400">{s.count}</span>
                    </button>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
