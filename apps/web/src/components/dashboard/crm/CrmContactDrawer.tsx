'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'
import type { CrmContact } from './types'

interface Activity {
  id: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, any>
  created_at: string
}

interface Props {
  contact: CrmContact
  primaryColor: string
  onClose: () => void
}

export function CrmContactDrawer({ contact, primaryColor, onClose }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading]     = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchActivities() {
       const { data } = await supabase
         .from('crm_activities')
         .select('*')
         .eq('contact_id', contact.id)
         .order('created_at', { ascending: false })
       if (data) setActivities(data as any)
       setLoading(false)
    }
    fetchActivities()
  }, [contact.id, supabase])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in transition-all" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[450px] bg-white shadow-2xl z-50 animate-in slide-in-from-right transition-all flex flex-col p-8 overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all text-gray-400 hover:text-gray-900 border border-gray-100 font-black text-xl">✕</button>
        
        <div className="flex flex-col items-center mb-10 mt-4 space-y-4">
          <div className="w-24 h-24 rounded-[32px] bg-white shadow-2xl border-4 border-white flex items-center justify-center text-4xl font-black text-gray-400 ring-8 ring-gray-50">
             {contact.avatar_url ? <img src={contact.avatar_url} className="w-full h-full object-cover rounded-[32px]" /> : contact.full_name[0]}
          </div>
          <div className="text-center space-y-1">
             <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{contact.full_name}</h2>
             <p className="text-sm font-bold text-gray-400 tracking-wide uppercase">{contact.email}</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3.5 py-1.5 bg-gray-100 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white shadow-sm">{contact.segment || 'new'}</span>
            {contact.is_subscribed && <span className="px-3.5 py-1.5 bg-green-50 text-green-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white shadow-sm">✉️ Opted-in</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-10 px-2">
           {[
             { label: 'Total Orders', val: contact.total_orders, i: '🛒' },
             { label: 'Total Spent',  val: '$' + Number(contact.total_spent).toLocaleString(), i: '💰' },
             { label: 'Customer Since', val: format(new Date(contact.first_order_at || contact.created_at), 'MMM yyyy'), i: '📅' },
             { label: 'Avg Value',    val: '$' + Number(contact.avg_order_value).toLocaleString(), i: '✨' },
           ].map((s) => (
             <div key={s.label} className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all cursor-default">
                <span className="text-2xl mb-2 group-hover:scale-125 transition-transform">{s.i}</span>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{s.label}</p>
                <p className="text-sm font-black text-gray-900 leading-none">{s.val}</p>
             </div>
           ))}
        </div>

        <div className="space-y-6 flex-1 px-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] pl-1 h-3 flex items-center justify-between">
             Activity Timeline
          </h3>
          <div className="space-y-4">
             {loading ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded-3xl animate-pulse" />)
             ) : activities.length === 0 ? (
                <div className="bg-gray-50/30 border-2 border-dashed border-gray-100 rounded-[32px] py-16 text-center text-gray-400 font-bold text-sm">No activity logged yet...</div>
             ) : (
                activities.map((a) => (
                  <div key={a.id} className="relative pl-10 pb-8 last:pb-0">
                    <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-100/50" />
                    <div className="absolute left-[3px] top-0 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs shadow-sm z-10 group hover:border-gray-900 transition-all font-black text-gray-400 group-hover:text-black" style={{ borderColor: a.type === 'order' ? primaryColor : '#E5E7EB' }}>
                        {a.type === 'order' ? '🛒' : a.type === 'email_sent' ? '✉️' : '📝'}
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-900 mb-0.5">{a.title}</p>
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                       {a.type === 'order' && (
                         <div className="mt-2.5 p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-black text-gray-900 opacity-80 uppercase tracking-widest">Order Amount</span>
                            <span className="text-sm font-black text-gray-900">${a.metadata.amount}</span>
                         </div>
                       )}
                    </div>
                  </div>
                )
              ))}
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col gap-4">
           <button
             className="w-full py-4 rounded-3xl text-white font-bold shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
             style={{ backgroundColor: primaryColor }}
           >
             🚀 Send Direct Email
           </button>
           <button className="w-full py-4 rounded-3xl bg-gray-900 text-white font-bold shadow-xl hover:bg-black transition-all">
             ✏️ Edit Contact Note
           </button>
        </div>
      </div>
    </>
  )
}
