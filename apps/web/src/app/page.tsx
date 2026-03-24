import { createClient } from '@/lib/supabase/server'
import { StoreCard } from '@/components/StoreCard'

export const revalidate = 60

export default async function HomePage() {
  // Guard for environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-red-500 font-bold">Configuration Error</h1>
        <p>NEXT_PUBLIC_SUPABASE_URL is missing in Vercel settings.</p>
      </div>
    )
  }

  try {
    const supabase = await createClient()
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, description, category, address, logo_url')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return (
      <main className="min-h-screen">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-16 px-4 text-center">
          <h1 className="text-4xl font-bold mb-3">Find What You Need</h1>
          <p className="text-indigo-100 text-lg">Shop from local stores near you</p>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Stores</h2>
          {stores && stores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stores.map((store) => <StoreCard key={store.id} store={store} />)}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🏪</p>
              <p className="text-gray-500 text-lg">No stores available yet</p>
            </div>
          )}
        </div>
      </main>
    )
  } catch (e: any) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-red-500 font-bold">Error Loading Data</h1>
        <p className="text-gray-600 mb-4">{e.message || 'Unknown render error'}</p>
        <p className="text-xs text-gray-400">Check Vercel Runtime Logs for full details.</p>
      </div>
    )
  }
}
