'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PRESET_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#06B6D4',
  '#3B82F6', '#1E293B',
]

export function Step3Brand({ userId, storeId }: { userId: string; storeId: string }) {
  const router = useRouter()
  const [primaryColor, setColor] = useState('#6366F1')
  const [subdomain, setSubdomain] = useState('')
  const [appName, setAppName]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const subdomainValid = /^[a-z0-9-]+$/.test(subdomain)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (subdomain && !subdomainValid) {
      setError('Subdomain can only contain lowercase letters, numbers, and hyphens')
      return
    }
    setLoading(true); setError('')
    const supabase = createClient()

    // Check subdomain uniqueness
    if (subdomain) {
      const { data: existing } = await supabase
        .from('stores').select('id').eq('brand_subdomain', subdomain).neq('id', storeId).single()
      if (existing) { setError('This subdomain is already taken. Please choose another.'); setLoading(false); return }
    }

    const { error: storeErr } = await supabase.from('stores').update({
      brand_primary_color: primaryColor,
      brand_subdomain: subdomain.trim() || null,
      brand_app_name: appName.trim() || null,
    }).eq('id', storeId)

    if (storeErr) { setError(storeErr.message); setLoading(false); return }

    await supabase.from('profiles').update({
      role: 'merchant',
      onboarding_step: 4,
      onboarding_done: true,
    }).eq('id', userId)

    router.push('/onboarding/complete')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Brand your store</h2>
        <p className="text-gray-500 mt-1">Make it yours — you can always change this later</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">⚠️ {error}</div>
      )}

      <div className="space-y-6">
        {/* Live Brand Preview */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="h-12 flex items-center px-4 gap-2 text-white text-sm font-bold transition-colors"
            style={{ backgroundColor: primaryColor }}>
            🛒 {appName || 'Your Store Name'}
          </div>
          <div className="bg-gray-50 px-4 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors"
              style={{ backgroundColor: primaryColor }}>
              +
            </div>
            <div>
              <div className="h-3 w-24 rounded bg-gray-200 mb-1.5" />
              <div className="h-2.5 w-16 rounded bg-gray-100" />
            </div>
            <div className="ml-auto font-bold transition-colors" style={{ color: primaryColor }}>RM 9.90</div>
          </div>
          <div className="bg-white px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
            ↑ Live preview of your brand color
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Brand color</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === c ? 'border-gray-800 scale-110' : 'border-white shadow-sm'}`}
                style={{ backgroundColor: c }} />
            ))}
            {/* Custom color */}
            <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 overflow-hidden"
              title="Custom colour">
              <input type="color" value={primaryColor} onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 cursor-pointer opacity-0 absolute" />
              <span className="text-gray-400 text-xs">+</span>
            </label>
          </div>
          <p className="text-xs text-gray-400 font-mono">{primaryColor}</p>
        </div>

        {/* App / Brand Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Brand display name <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
            placeholder="Leave blank to use your store name"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900" />
          <p className="text-xs text-gray-400 mt-1">Shown in the nav bar of your branded storefront</p>
        </div>

        {/* Subdomain */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Custom subdomain <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex">
            <input type="text" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              placeholder="yourstore"
              className={`flex-1 border rounded-l-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 ${
                subdomain && !subdomainValid ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`} />
            <span className="inline-flex items-center px-4 border border-l-0 border-gray-300 rounded-r-xl bg-gray-50 text-gray-500 text-sm whitespace-nowrap">
              .mymarketplace.com
            </span>
          </div>
          {subdomain && !subdomainValid && (
            <p className="text-red-500 text-xs mt-1.5">⚠ Lowercase letters, numbers, and hyphens only</p>
          )}
          {subdomain && subdomainValid && (
            <p className="text-green-600 text-xs mt-1.5">✓ Your store will be at <strong>{subdomain}.mymarketplace.com</strong></p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => router.push('/onboarding/step-2')}
          className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <button type="submit" disabled={loading}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-200">
          {loading ? (
             <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>Finishing up…</>
          ) : <>Submit for approval →</>}
        </button>
      </div>
    </form>
  )
}
