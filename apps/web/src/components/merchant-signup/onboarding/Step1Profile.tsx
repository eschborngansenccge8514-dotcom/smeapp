'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function Step1Profile({ userId, initialData }: {
  userId: string
  initialData: { full_name?: string; phone?: string }
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialData.full_name ?? '')
  const [phone, setPhone]       = useState(initialData.phone ?? '')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Full name is required'); return }
    if (!phone.trim())    { setError('Phone number is required'); return }
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      phone: phone.trim(),
      onboarding_step: 2,
    }).eq('id', userId)

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/onboarding/step-2')
    router.refresh()
  }

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tell us about yourself</h2>
        <p className="text-gray-500 mt-1">This is how your customers will know you</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Full name <span className="text-red-500">*</span>
          </label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Ali bin Ahmad" autoComplete="name"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-gray-900" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone number <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-4 border border-r-0 border-gray-300 rounded-l-xl bg-gray-50 text-gray-600 text-sm">
              🇲🇾 +60
            </span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="12-345 6789" autoComplete="tel"
              className="flex-1 border border-gray-300 rounded-r-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-gray-900" />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Used for order notifications and customer contact</p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-200">
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
