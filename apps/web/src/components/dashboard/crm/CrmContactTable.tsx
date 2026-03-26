'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import type { CrmContact } from './types'
import { CrmContactDrawer } from './CrmContactDrawer'

interface Props {
  storeId: string
  primaryColor: string
}

export function CrmContactTable({ storeId, primaryColor }: Props) {
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [selected, setSelected] = useState<CrmContact | null>(null)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchContacts() {
      if (!storeId) return
      let query = supabase
        .from('crm_contacts')
        .select('*')
        .eq('store_id', storeId)
        .order('last_order_at', { ascending: false })
      
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data } = await query
      if (data) setContacts(data as any)
      setLoading(false)
    }
    fetchContacts()
  }, [storeId, supabase, search])

  const Badge = ({ type }: { type: string }) => {
    const colors: any = {
      vip:      { bg: '#FEF3C7', text: '#92400E', label: '👑 VIP' },
      at_risk:  { bg: '#FEE2E2', text: '#991B1B', label: '⚠️ At Risk' },
      new:      { bg: '#ECFDF5', text: '#065F46', label: '🆕 New' },
      loyal:    { bg: '#EFF6FF', text: '#1E40AF', label: '💎 Loyal' },
      inactive: { bg: '#F3F4F6', text: '#374151', label: '💤 Inactive' },
    }
    const c = colors[type] || { bg: '#F3F4F6', text: '#374151', label: type }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-white" style={{ backgroundColor: c.bg, color: c.text }}>
        {c.label}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden flex flex-col h-[700px]">
      <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Customer Registry</h2>
          <p className="text-sm text-gray-500 font-medium">Manage and engage with your store audience.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers..."
              className="w-64 h-12 pl-12 pr-4 bg-white rounded-2xl border-2 border-gray-100 focus:border-opacity-100 transition-all outline-none text-sm font-medium shadow-sm"
              style={{ '--tw-border-opacity': '1', borderColor: primaryColor + '20' } as any}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button className="h-12 px-6 rounded-2xl text-white font-bold text-sm shadow-xl shadow-opacity-20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all" style={{ backgroundColor: primaryColor }}>
             ✨ Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <tr>
              <th className="px-10 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer</th>
              <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Orders</th>
              <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Spent</th>
              <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Last Order</th>
              <th className="px-10 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
               Array.from({ length: 5 }).map((_, i) => (
                 <tr key={i} className="animate-pulse">
                   <td className="px-10 py-6"><div className="flex gap-4 items-center"><div className="w-10 h-10 bg-gray-100 rounded-2xl"/><div className="space-y-2"><div className="h-3 w-32 bg-gray-100 rounded"/><div className="h-2 w-24 bg-gray-50 rounded"/></div></div></td>
                   <td className="px-6 py-6"><div className="h-6 w-20 bg-gray-100 rounded-full"/></td>
                   <td className="px-6 py-6"><div className="h-3 w-8 bg-gray-100 rounded"/></td>
                   <td className="px-6 py-6"><div className="h-3 w-16 bg-gray-100 rounded"/></td>
                   <td className="px-6 py-6"><div className="h-3 w-28 bg-gray-100 rounded"/></td>
                   <td className="px-10 py-6 text-right"><div className="h-10 w-24 bg-gray-100 rounded-xl ml-auto"/></td>
                 </tr>
               ))
            ) : contacts.length === 0 ? (
               <tr><td colSpan={6} className="py-32 text-center text-gray-400 font-medium">No customers found. Keep selling! 📈</td></tr>
            ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="group hover:bg-gray-50/50 transition-all cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="px-10 py-6">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-gray-100 font-black text-gray-400 group-hover:scale-110 transition-transform">
                          {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : c.full_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight group-hover:text-black transition-colors">{c.full_name}</p>
                          <p className="text-xs text-gray-400 font-medium truncate max-w-[180px]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6"><Badge type={c.segment || 'new'} /></td>
                    <td className="px-6 py-6 text-sm font-bold text-gray-700">{c.total_orders}</td>
                    <td className="px-6 py-6 text-sm font-black text-gray-900">${Number(c.total_spent).toLocaleString()}</td>
                    <td className="px-6 py-6 text-xs font-medium text-gray-500">{c.last_order_at ? format(new Date(c.last_order_at), 'MMM dd, h:mm a') : '-'}</td>
                    <td className="px-10 py-6 text-right">
                       <button className="px-5 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-xs font-bold text-gray-700 hover:border-gray-200 hover:bg-white hover:shadow-lg transition-all active:scale-95">
                         View Log
                       </button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <CrmContactDrawer
          contact={selected}
          primaryColor={primaryColor}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
