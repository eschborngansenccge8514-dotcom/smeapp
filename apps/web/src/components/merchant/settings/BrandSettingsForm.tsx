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
    app_name:         store?.app_name ?? '',
    primary_color:    store?.primary_color ?? '#6366F1',
    secondary_color:  store?.secondary_color ?? '#F59E0B',
    slug:             store?.slug ?? '',
    custom_domain:    store?.custom_domain ?? '',
    collection_label: store?.collection_label ?? '',
    hero_slides:      store?.hero_slides ?? [],
    font_family:      store?.font_family ?? 'Inter',
    subdomain_active: store?.subdomain_active ?? true,
  })

  const [logoUrl, setLogoUrl] = useState(store?.logo_url ?? '')
  const [splashUrl, setSplashUrl] = useState(store?.splash_url ?? '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const { error } = await supabase
      .from('stores')
      .update({ 
        ...form, 
        logo_url: logoUrl || null, 
        splash_url: splashUrl || null 
      })
      .eq('id', store.id)
    if (error) toast.error(error.message)
    else { toast.success('Brand settings saved'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">

      {/* Live preview */}
      <div className="rounded-xl p-4 text-white flex items-center gap-3 transition-all"
        style={{ backgroundColor: form.primary_color, fontFamily: form.font_family }}>
        {logoUrl
          ? <img src={logoUrl} className="w-10 h-10 rounded-xl object-cover" />
          : <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🏪</div>
        }
        <span className="font-bold text-lg">{form.app_name || 'Your App Name'}</span>
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
        <input value={form.app_name}
          onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="My Store App" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Primary Colour</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.primary_color}
              onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
              className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
            <input value={form.primary_color}
              onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="#6366F1" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Secondary Colour</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.secondary_color}
              onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
              className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" />
            <input value={form.secondary_color}
              onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
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
            <input value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') }))}
              className="flex-1 px-4 py-2.5 text-sm text-gray-900 focus:outline-none"
              placeholder="mystore" />
            <span className="px-3 bg-gray-50 text-gray-400 text-sm border-l border-gray-200 py-2.5">
              .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'mymarket.com'}
            </span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Custom Domain (optional)</label>
          <input value={form.custom_domain}
            onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="order.mybrand.com.my" />
          {store.domain_verified ? (
            <p className="text-xs text-green-500 mt-1">Verified & Active</p>
          ) : form.custom_domain && (
            <p className="text-xs text-gray-400 mt-1">
              Point your domain's CNAME to <code className="bg-gray-100 px-1 rounded">cname.vercel-dns.com</code>
            </p>
          )}
        </div>
      </div>

      {/* Fashion Industry Settings */}
      {(store.category?.includes('Fashion') || store.category?.includes('Apparel')) && (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
            👗 Fashion Storefront Configuration
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Collection Label (e.g. Featured, Winter 24)</label>
            <input value={form.collection_label}
              onChange={(e) => setForm((f) => ({ ...f, collection_label: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Seasonal Collection" />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Hero Slides (Portrait 3:4 recommended)</label>
            <div className="space-y-3">
              {(form.hero_slides ?? []).map((slide: any, i: number) => (
                 <div key={i} className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <img src={slide.image_url} className="w-12 h-16 object-cover rounded-md" />
                    <div className="flex-1 min-w-0">
                      <input value={slide.title} onChange={(e) => {
                        const next = [...form.hero_slides]; next[i].title = e.target.value;
                        setForm(f => ({ ...f, hero_slides: next }))
                      }} className="w-full bg-transparent text-sm font-bold focus:outline-none" placeholder="Slide Title" />
                      <input value={slide.subtitle} onChange={(e) => {
                        const next = [...form.hero_slides]; next[i].subtitle = e.target.value;
                        setForm(f => ({ ...f, hero_slides: next }))
                      }} className="w-full bg-transparent text-xs text-gray-500 focus:outline-none" placeholder="Slide Subtitle" />
                    </div>
                    <button onClick={() => {
                      const next = form.hero_slides.filter((_:any, idx:number) => idx !== i)
                      setForm(f => ({ ...f, hero_slides: next }))
                    }} className="text-red-400 p-2">✕</button>
                 </div>
              ))}
              <div className="flex gap-2">
                 <ImageUpload bucket="hero-slides" onUpload={(url) => {
                   const next = [...(form.hero_slides ?? []), { image_url: url, title: '', subtitle: '', link: '' }]
                   setForm(f => ({ ...f, hero_slides: next }))
                 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <button onClick={save} disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
        {loading ? 'Saving...' : 'Save Brand Settings'}
      </button>
    </div>
  )
}
