'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  store: {
    id: string
    name: string
    slug: string | null
    is_active: boolean
  }
}

export function EditStoreForm({ store }: Props) {
  const router = useRouter()
  const [slug, setSlug] = useState(store.slug || '')
  const [name, setName] = useState(store.name)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('stores')
      .update({ 
        name,
        slug: slug.trim() || null 
      })
      .eq('id', store.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Store updated successfully' })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-bold mb-4">Edit Store Details</h2>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain (Slug)</label>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={slug} 
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. coffee-shop"
            />
            <span className="text-sm text-gray-400">.smeapp.com</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Admins can change this at any time. This will update the store's primary URL.
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
