'use client'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { EmailComposer } from '@/components/dashboard/email/EmailComposer'

export default function EmailMarketingPage() {
  const [store, setStore] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: storeData } = await supabase.from('stores').select('*').eq('owner_id', user.id).single()
        setStore(storeData)
        if (storeData) {
          const { data: campData } = await supabase.from('email_campaigns').select('*').eq('store_id', storeData.id).order('created_at', { ascending: false })
          setCampaigns(campData || [])
        }
      }
      setLoading(false)
    }
    init()
  }, [supabase])

  if (!store) return <div className="p-8 animate-pulse bg-gray-50 rounded-3xl h-64" />

  const primaryColor = store.brand_primary_color || '#6366F1'

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <div className="flex items-center justify-between">
         <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Email Marketing</h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">Boost sales with targeted email campaigns and beautiful templates.</p>
         </div>
         <div className="flex gap-4">
            <div className="bg-white px-6 py-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[120px]">
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Total Sent</span>
               <span className="text-2xl font-black text-gray-900">{campaigns.length}</span>
            </div>
            <div className="bg-white px-6 py-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[120px]">
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Avg Open Rate</span>
               <span className="text-2xl font-black text-blue-600">--%</span>
            </div>
         </div>
      </div>

      <EmailComposer storeId={store.id} primaryColor={primaryColor} />

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden p-10">
         <h2 className="text-xl font-black text-gray-900 mb-8 tracking-tight">Past Campaigns</h2>
         
         {loading ? (
            <div className="space-y-4 animate-pulse">
               <div className="h-16 bg-gray-50 rounded-2xl w-full" />
               <div className="h-16 bg-gray-50 rounded-2xl w-full" />
            </div>
         ) : campaigns.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-[32px]">No campaigns sent yet. Get started above!</div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {campaigns.map((c) => (
                  <div key={c.id} className="p-6 rounded-[32px] border-2 border-gray-50 hover:border-gray-100 hover:shadow-2xl hover:translate-y-[-4px] transition-all bg-white relative overflow-hidden group">
                     {c.status === 'sent' && <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-3xl -mr-12 -mt-12 rounded-full" />}
                     <div className="relative z-10 flex flex-col h-full">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{new Date(c.created_at).toLocaleDateString()}</p>
                        <h3 className="font-bold text-gray-900 text-lg mb-1 leading-tight">{c.name}</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">{c.subject}</p>
                        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Recipients</span>
                              <span className="font-bold text-gray-800">{c.total_recipients || 0}</span>
                           </div>
                           <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                              c.status === 'sent' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-700 border-gray-200'
                           }`}>
                              {c.status}
                           </span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  )
}
