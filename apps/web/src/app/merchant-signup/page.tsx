import { AuthPanel } from '@/components/auth/AuthPanel'
import { MerchantSignUpForm } from '@/components/merchant-signup/MerchantSignUpForm'

export const metadata = { title: 'Open Your Store' }

export default function MerchantSignUpPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Custom left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-800 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] bg-white/5 rounded-full" />

        <a href="/" className="relative z-10 flex items-center gap-2 text-white/90 hover:text-white w-fit">
          <span className="text-2xl">🛒</span>
          <span className="font-bold text-xl">My Marketplace</span>
        </a>

        <div className="relative z-10 space-y-6">
          <div className="text-5xl">🏪</div>
          <h2 className="text-4xl font-bold leading-tight">Grow your<br />business online</h2>
          <p className="text-indigo-200 text-lg max-w-xs leading-relaxed">
            List your products, manage orders, and reach customers across Malaysia.
          </p>
          <ul className="space-y-3 pt-2">
            {[
              '✅ Free to join — no monthly fees',
              '🚀 Go live in under 10 minutes',
              '📦 Integrated Lalamove & EasyParcel',
              '💳 Razorpay payment processing',
              '📊 Real-time sales dashboard',
            ].map((f) => (
              <li key={f} className="text-indigo-100 text-sm">{f}</li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 bg-white/10 rounded-2xl p-5 border border-white/20">
          <p className="text-white/90 text-sm italic">
            "I went from selling at pasar malam to 200+ online orders a month within 3 weeks!"
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center font-bold text-sm">N</div>
            <div>
              <p className="text-white text-xs font-semibold">Nurul Ain</p>
              <p className="text-indigo-300 text-xs">Kuih & Cookies Seller, Selangor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <MerchantSignUpForm />
      </div>
    </div>
  )
}
