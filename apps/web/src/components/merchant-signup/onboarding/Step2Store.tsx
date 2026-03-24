'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/merchant/ImageUpload'

const CATEGORIES = [
  '🍜 Food & Beverages', '🛒 Grocery & Market', '💊 Health & Pharmacy',
  '👗 Fashion & Apparel', '📱 Electronics', '🏠 Home & Living',
  '💄 Beauty & Wellness', '📦 Others',
]

const BUSINESS_TYPES = [
  { value: 'sole_prop', label: 'Sole Proprietorship', icon: '👤' },
  { value: 'partnership', label: 'Partnership', icon: '🤝' },
  { value: 'sdn_bhd', label: 'Sdn. Bhd.', icon: '🏢' },
  { value: 'individual', label: 'Individual / Freelancer', icon: '🙋' },
]

export function Step2Store({ userId, storeId }: { userId: string; storeId?: string }) {
  const router = useRouter()
  const [name, setName]             = useState('')
  const [description, setDesc]      = useState('')
  const [category, setCategory]     = useState('')
  const [address, setAddress]       = useState('')
  const [businessType, setBizType]  = useState('')
  const [regNo, setRegNo]           = useState('')
  const [logoUrl, setLogoUrl]       = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())     { setError('Store name is required'); return }
    if (!category)        { setError('Please select a category'); return }
    if (!address.trim())  { setError('Address is required'); return }
    if (!businessType)    { setError('Please select a business type'); return }
    setLoading(true); setError('')

    const supabase = createClient()

    if (storeId) {
      // Update existing draft store
      const { error } = await supabase.from('stores').update({
        name: name.trim(), description: description.trim() || null,
        category, address: address.trim(),
        business_type: businessType,
        business_reg_no: regNo.trim() || null,
        logo_url: logoUrl,
        approval_status: 'pending',
      }).eq('id', storeId)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      // Create new store
      const { error } = await supabase.from('stores').insert({
        owner_id: userId,
        name: name.trim(),
        description: description.trim() || null,
        category,
        address: address.trim(),
        business_type: businessType,
        business_reg_no: regNo.trim() || null,
        logo_url: logoUrl,
        is_active: false,
        approval_status: 'pending',
      })
      if (error) { setError(error.message); setLoading(false); return }
    }

    await supabase.from('profiles').update({ onboarding_step: 3 }).eq('id', userId)
    router.push('/onboarding/step-3')
    router.refresh()
  }

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Set up your store</h2>
        <p className="text-gray-500 mt-1">Tell us about your business</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">⚠️ {error}</div>
      )}

      <div className="space-y-5">
        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Store Logo</label>
          <ImageUpload bucket="store-logos" onUpload={setLogoUrl} />
        </div>

        {/* Store name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Store name <span className="text-red-500">*</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mak Cik Nasi Lemak" maxLength={60}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900" />
          <p className="text-xs text-gray-400 mt-1">{name.length}/60 characters</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDesc(e.target.value)}
            placeholder="Tell customers what makes your store special…"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 resize-none" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                  category === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Store address <span className="text-red-500">*</span>
          </label>
          <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="No. 12, Jalan Bunga Raya, 50000 Kuala Lumpur"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 resize-none" />
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((b) => (
              <button key={b.value} type="button" onClick={() => setBizType(b.value)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  businessType === b.value
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                }`}>
                <span className="text-2xl">{b.icon}</span>
                <span className="text-sm font-medium leading-tight">{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reg No (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Business registration no. <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input type="text" value={regNo} onChange={(e) => setRegNo(e.target.value)}
            placeholder="e.g. 202101234567"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => router.push('/onboarding/step-1')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Back
        </button>
        <button type="submit" disabled={loading}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-200">
          {loading ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>Saving…</>
          ) : <>Continue <span>→</span></>}
        </button>
      </div>
    </form>
  )
}
