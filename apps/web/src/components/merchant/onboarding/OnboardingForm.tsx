'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/merchant/ui/ImageUpload'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Restaurant','Grocery','Pharmacy','Hardware',
  'Convenience','Electronics','Fashion','Bakery','Other'
]

export function OnboardingForm({ userId }: { userId: string }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', description: '', category: '', phone: '',
    address: '', state: '', postcode: '',
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name || !form.category || !form.address || !form.postcode) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        owner_id: userId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        phone: form.phone || null,
        address: form.address,
        state: form.state,
        postcode: form.postcode,
        logo_url: logoUrl,
        is_active: false, // pending admin approval
        lat: 3.1390, lng: 101.6869, // default KL coords; updated via store settings later
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
    } else {
      // Seed default opening hours (Mon–Fri 9am–10pm)
      await supabase.from('store_hours').insert(
        Array.from({ length: 7 }, (_, i) => ({
          store_id: store.id,
          day_of_week: i,
          open_time: i === 0 ? null : '09:00',
          close_time: i === 0 ? null : '22:00',
          is_closed: i === 0,
        }))
      )
      toast.success('Store created! Pending admin approval.')
      router.push('/merchant/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <ImageUpload
        bucket="store-logos"
        label="Store Logo"
        onUpload={setLogoUrl}
        currentUrl={logoUrl}
      />
      <Field label="Store Name *" value={form.name} onChange={(v : string) => update('name', v)} placeholder="Ali's Nasi Lemak" />
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Category *</label>
        <select value={form.category} onChange={(e) => update('category', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">Select category</option>
          {CATEGORIES.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
        </select>
      </div>
      <Field label="Description" value={form.description} onChange={(v : string) => update('description', v)}
        placeholder="Best nasi lemak in KL..." multiline />
      <Field label="Phone" value={form.phone} onChange={(v : string) => update('phone', v)} placeholder="011-12345678" />
      <Field label="Address *" value={form.address} onChange={(v : string) => update('address', v)}
        placeholder="No. 12, Jalan Mawar" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="State *" value={form.state} onChange={(v : string) => update('state', v)} placeholder="Kuala Lumpur" />
        <Field label="Postcode *" value={form.postcode} onChange={(v : string) => update('postcode', v)} placeholder="50450" />
      </div>
      <button onClick={submit} disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 mt-2">
        {loading ? 'Creating Store...' : 'Create Store →'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline = false }: any) {
  const props = { value, onChange: (e: any) => onChange(e.target.value), placeholder,
    className: 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300' }
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      {multiline ? <textarea {...props} rows={3} className={props.className + ' resize-none'} />
        : <input {...props} />}
    </div>
  )
}
