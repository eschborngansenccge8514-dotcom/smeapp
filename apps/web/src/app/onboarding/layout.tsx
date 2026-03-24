import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <header className="border-b border-white/80 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold">
            🛒 My Marketplace
          </Link>
          <span className="text-xs text-gray-400 bg-white/80 border border-gray-200 px-3 py-1 rounded-full">
            Merchant Onboarding
          </span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">{children}</main>
    </div>
  )
}
