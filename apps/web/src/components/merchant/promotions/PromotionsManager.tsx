'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { formatDate } from '@/lib/date'
import { Plus, Tag, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  code: '', description: '', discount_type: 'percent',
  discount_value: '', min_order_amount: '', max_uses: '',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: '',
}

export function PromotionsManager({ storeId, promotions }: { storeId: string; promotions: any[] }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function createPromo() {
    if (!form.code || !form.discount_value) {
      toast.error('Code and discount value are required')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('promotions').insert({
      store_id: storeId,
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      valid_from: form.valid_from,
      valid_until: form.valid_until || null,
      is_active: true,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Promo code created!')
      setForm(EMPTY_FORM)
      setShowForm(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function togglePromo(id: string, current: boolean) {
    await supabase.from('promotions').update({ is_active: !current }).eq('id', id)
    router.refresh()
  }

  async function deletePromo(id: string, code: string) {
    if (!confirm(`Delete code "${code}"?`)) return
    await supabase.from('promotions').delete().eq('id', id)
    toast.success('Promo deleted')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
        <Plus size={16} /> Create Promo Code
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-900">New Promo Code</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Code *</label>
              <input value={form.code}
                onChange={(e) => update('code', e.target.value.toUpperCase())}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="SAVE10" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Discount Type *</label>
              <select value={form.discount_type} onChange={(e) => update('discount_type', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed (RM)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Discount Value * ({form.discount_type === 'percent' ? '%' : 'RM'})
              </label>
              <input type="number" min="0" value={form.discount_value}
                onChange={(e) => update('discount_value', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={form.discount_type === 'percent' ? '10' : '5.00'} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Min Order (RM)</label>
              <input type="number" min="0" value={form.min_order_amount}
                onChange={(e) => update('min_order_amount', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Max Uses</label>
              <input type="number" min="1" value={form.max_uses}
                onChange={(e) => update('max_uses', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Unlimited" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Expires</label>
              <input type="date" value={form.valid_until}
                onChange={(e) => update('valid_until', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <input value={form.description} onChange={(e) => update('description', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Description (optional)" />
          <div className="flex gap-3">
            <button onClick={createPromo} disabled={loading}
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Code'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Promo codes list */}
      <div className="space-y-3">
        {promotions.map((promo) => (
          <div key={promo.id}
            className={`bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4
              ${!promo.is_active ? 'opacity-60 border-gray-100' : 'border-indigo-100'}`}>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Tag size={22} className="text-indigo-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 font-mono">{promo.code}</span>
                {!promo.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Disabled</span>
                )}
                {promo.valid_until && new Date(promo.valid_until) < new Date() && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Expired</span>
                )}
              </div>
              <p className="text-sm text-indigo-600 font-medium">
                {promo.discount_type === 'percent'
                  ? `${promo.discount_value}% off`
                  : `RM ${promo.discount_value} off`}
                {promo.min_order_amount > 0 && ` (min. ${formatPrice(promo.min_order_amount)})`}
              </p>
              <p className="text-xs text-gray-400">
                Used {promo.uses_count} times
                {promo.max_uses && ` / ${promo.max_uses}`}
                {promo.valid_until && ` · Expires ${formatDate(promo.valid_until)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => togglePromo(promo.id, promo.is_active)}>
                {promo.is_active
                  ? <ToggleRight size={28} className="text-indigo-500" />
                  : <ToggleLeft size={28} className="text-gray-300" />
                }
              </button>
              <button onClick={() => deletePromo(promo.id, promo.code)}
                className="p-1.5 text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
