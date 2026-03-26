'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Building2, Save, CreditCard } from 'lucide-react'

export function PaymentSettingsForm({ store }: { store: any }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  
  const [form, setForm] = useState({
    bank_name: store?.bank_name ?? '',
    bank_account_number: store?.bank_account_number ?? '',
    bank_account_holder_name: store?.bank_account_holder_name ?? '',
    accepts_razorpay: store?.accepts_razorpay ?? true,
    accepts_billplz: store?.accepts_billplz ?? true,
  })
  const [loading, setLoading] = useState(false)

  function update(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setLoading(true)
    const { error } = await supabase
      .from('stores')
      .update({
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account_number || null,
        bank_account_holder_name: form.bank_account_holder_name || null,
        accepts_razorpay: form.accepts_razorpay,
        accepts_billplz: form.accepts_billplz,
      })
      .eq('id', store.id)
      
    if (error) {
      toast.error('Failed to save payment settings')
      console.error(error)
    } else {
      toast.success('Payment settings saved successfully')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex flex-shrink-0 items-center justify-center text-indigo-600">
          <Building2 size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Bank Account Details</h3>
          <p className="text-sm text-gray-500">Configure where you receive your payouts from the platform</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Bank Name</label>
          <input 
            type="text" 
            value={form.bank_name} 
            onChange={(e) => update('bank_name', e.target.value)} 
            placeholder="e.g. Maybank, CIMB, Public Bank"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
          />
        </div>

        <div>
           <label className="text-sm font-medium text-gray-700 block mb-1">Account Number</label>
          <input 
            type="text" 
            value={form.bank_account_number} 
            onChange={(e) => update('bank_account_number', e.target.value)} 
            placeholder="e.g. 114123456789"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow font-mono"
          />
        </div>

        <div>
           <label className="text-sm font-medium text-gray-700 block mb-1">Account Holder Name</label>
          <input 
            type="text" 
            value={form.bank_account_holder_name} 
            onChange={(e) => update('bank_account_holder_name', e.target.value)} 
            placeholder="e.g. Acme Enterprise Sdn Bhd"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow uppercase"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mt-8 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex flex-shrink-0 items-center justify-center text-indigo-600">
          <CreditCard size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Accepted Payment Methods</h3>
          <p className="text-sm text-gray-500">Enable or disable payment methods for your customers</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 font-bold text-xs uppercase">RZP</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Razorpay</p>
              <p className="text-xs text-gray-500">Accept Credit/Debit Cards and Wallets</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={form.accepts_razorpay} 
            onChange={(e) => update('accepts_razorpay', e.target.checked)}
            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs uppercase">BPZ</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Billplz</p>
              <p className="text-xs text-gray-500">Accept FPX Online Banking</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={form.accepts_billplz} 
            onChange={(e) => update('accepts_billplz', e.target.checked)}
            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-gray-100">
        <button onClick={save} disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <Save size={18} />
          <span>{loading ? 'Saving...' : 'Save Payment Configuration'}</span>
        </button>
      </div>
    </div>
  )
}
