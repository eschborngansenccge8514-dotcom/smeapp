'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/merchant/ui/ImageUpload'
import toast from 'react-hot-toast'

export function StoreSettingsForm({ store }: { store: any }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [form, setForm] = useState({
    name: store?.name ?? '',
    description: store?.description ?? '',
    phone: store?.phone ?? '',
    address: store?.address ?? '',
    state: store?.state ?? '',
    postcode: store?.postcode ?? '',
  })
  const [logoUrl, setLogoUrl] = useState(store?.logo_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(store?.banner_url ?? '')
  const [loading, setLoading] = useState(false)

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setLoading(true)
    const { error } = await supabase
      .from('stores')
      .update({ ...form, logo_url: logoUrl || null, banner_url: bannerUrl || null })
      .eq('id', store.id)
    if (error) toast.error(error.message)
    else { toast.success('Store settings saved'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Store Logo</label>
          <ImageUpload bucket="store-logos" currentUrl={logoUrl}
            onUpload={setLogoUrl} onRemove={() => setLogoUrl('')} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Banner Image</label>
          <ImageUpload bucket="store-logos" currentUrl={bannerUrl}
            onUpload={setBannerUrl} onRemove={() => setBannerUrl('')} />
        </div>
      </div>

      <Field label="Store Name" value={form.name} onChange={(v : string) => update('name', v)} />
      <Field label="Description" value={form.description} onChange={(v : string) => update('description', v)} multiline />
      <Field label="Phone" value={form.phone} onChange={(v : string) => update('phone', v)} />
      <Field label="Address" value={form.address} onChange={(v : string) => update('address', v)} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="State" value={form.state} onChange={(v : string) => update('state', v)} />
        <Field label="Postcode" value={form.postcode} onChange={(v : string) => update('postcode', v)} />
      </div>

      <button onClick={save} disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
        {loading ? 'Saving...' : 'Save Store Details'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline = false }: any) {
  const props = { value, onChange: (e: any) => onChange(e.target.value), placeholder,
    className: 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300' }
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      {multiline ? <textarea {...props} rows={3} className={props.className + ' resize-none'} />
        : <input {...props} />}
    </div>
  )
}
