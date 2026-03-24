'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { ImageUpload } from '../ui/ImageUpload'
import toast from 'react-hot-toast'

export function BrandSettingsForm({ store }: { store: any }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [form, setForm] = useState({
    brand_app_name:        store?.brand_app_name ?? '',
    brand_primary_color:   store?.brand_primary_color ?? '#6366F1',
    brand_secondary_color: store?.brand_secondary_color ?? '#F59E0B',
    brand_subdomain:       store?.brand_subdomain ?? '',
    brand_custom_domain:   store?.brand_custom_domain ?? '',
  })
  const [logoUrl, setLogoUrl] = useState(store?.brand_logo_url ?? '')
  const [splashUrl, setSplashUrl] = useState(store?.brand_splash_url ?? '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const { error } = await supabase
      .from('stores')
      .update({ ...form, brand_logo_url: logoUrl || null, brand_splash_url: splashUrl || null })
      .eq('id', store.id)
    if (error) toast.error(error.message)
    else { toast.success('Brand settings saved'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">

      {/* Live preview */}
      <div className="rounded-xl p-4 text-white flex items-center gap-3 transition-all"
        style={{ backgroundColor: form.brand_primary_color }}>
        {logoUrl
          ? <img src={logoUrl} className="w-10 h-10 rounded-xl object-cover" />
          : <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🏪</div>
        }
        <span className="font-bold text-lg">{form.brand_app_name || 'Your App Name'}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Brand Logo</label>
          <ImageUpload bucket="store-logos" currentUrl={logoUrl}
            onUpload={setLogoUrl} onRemove={() => setLogoUrl('')} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Splash Screen</label>
          <ImageUpload bucket="store-logos" currentUrl={splashUrl}
            onUpload={setSplashUrl} onRemove={() => setSplashUrl('')} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">App Name</label>
        <input value={form.brand_app_name}
          onChange={(e) => setForm((f) => ({ ...f, brand_app_name: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="My Store App" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Primary Colour</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.brand_primary_color}
              onChange={(e) => setForm((f) => ({ ...f, brand_primary_color: e.target.value }))}
              className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
            <input value={form.brand_primary_color}
              onChange={(e) => setForm((f) => ({ ...f, brand_primary_color: e.target.value }))}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="#6366F1" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Secondary Colour</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.brand_secondary_color}
              onChange={(e) => setForm((f) => ({ ...f, brand_secondary_color: e.target.value }))}
              className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
            <input value={form.brand_secondary_color}
              onChange={(e) => setForm((f) => ({ ...f, brand_secondary_color: e.target.value }))}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="#F59E0B" />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Web Storefront Domain</p>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Subdomain</label>
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-300">
            <input value={form.brand_subdomain}
              onChange={(e) => setForm((f) => ({ ...f, brand_subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') }))}
              className="flex-1 px-4 py-2.5 text-sm focus:outline-none"
              placeholder="mystore" />
            <span className="px-3 bg-gray-50 text-gray-400 text-sm border-l border-gray-200 py-2.5">
              .yourdomain.com
            </span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Custom Domain (optional)</label>
          <input value={form.brand_custom_domain}
            onChange={(e) => setForm((f) => ({ ...f, brand_custom_domain: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="order.mybrand.com.my" />
          <p className="text-xs text-gray-400 mt-1">
            Point your domain's CNAME to <code className="bg-gray-100 px-1 rounded">cname.vercel-dns.com</code>
          </p>
        </div>
      </div>

      <button onClick={save} disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
        {loading ? 'Saving...' : 'Save Brand Settings'}
      </button>
    </div>
  )
}
