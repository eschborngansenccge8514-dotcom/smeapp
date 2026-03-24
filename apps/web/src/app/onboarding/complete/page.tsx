import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Application Submitted!' }

export default async function OnboardingComplete() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/merchant-signup')

  const { data: store } = await supabase
    .from('stores').select('name, brand_subdomain, approval_status').eq('owner_id', user.id).single()

  return (
    <div className="text-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
        {/* Success animation */}
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-green-200">
          🎉
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">You're all set!</h1>
        <p className="text-gray-500 text-lg mb-6">
          <strong className="text-gray-800">{store?.name}</strong> has been submitted for review
        </p>

        {/* Status card */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-bold text-amber-800">Pending Approval</p>
              <p className="text-amber-600 text-sm">Usually within 1–2 business days</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-amber-700">
            <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Our team will review your store details</li>
            <li className="flex items-center gap-2"><span className="text-amber-500">•</span> You'll receive an email once approved</li>
            <li className="flex items-center gap-2"><span className="text-amber-500">•</span> You can update your store while waiting</li>
          </ul>
        </div>

        {/* What's next */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
          {[
            { icon: '🛍️', title: 'Add Products', desc: 'Start building your product catalogue', href: '/merchant/products/new' },
            { icon: '⚙️', title: 'Store Settings', desc: 'Fine-tune your store profile', href: '/merchant/store-settings' },
            { icon: '📊', title: 'Dashboard', desc: 'View your store overview', href: '/merchant/dashboard' },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="block p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl transition-all group">
              <p className="text-2xl mb-2">{item.icon}</p>
              <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700">{item.title}</p>
              <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>

        {store?.brand_subdomain && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6 text-sm text-indigo-700">
            🌐 Your storefront will be live at{' '}
            <strong>{store.brand_subdomain}.mymarketplace.com</strong>{' '}
            once approved
          </div>
        )}

        <Link href="/merchant/dashboard"
          className="inline-block bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
          Go to Dashboard →
        </Link>
      </div>
    </div>
  )
}
