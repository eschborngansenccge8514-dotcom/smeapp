export function AuthPanel({ mode }: { mode: 'signin' | 'signup' }) {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-12 relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
      <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] bg-white/5 rounded-full" />
      <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-white/5 rounded-full" />

      {/* Logo */}
      <div className="relative z-10">
        <a href="/" className="flex items-center gap-2 text-white/90 hover:text-white transition-colors w-fit">
          <span className="text-2xl">🛒</span>
          <span className="font-bold text-xl">My Marketplace</span>
        </a>
      </div>

      {/* Center Content */}
      <div className="relative z-10 space-y-6">
        {mode === 'signin' ? (
          <>
            <div className="text-5xl">👋</div>
            <h2 className="text-4xl font-bold leading-tight">
              Welcome<br />back!
            </h2>
            <p className="text-indigo-200 text-lg leading-relaxed max-w-xs">
              Sign in to track your orders, browse nearby stores, and enjoy seamless shopping.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl">🚀</div>
            <h2 className="text-4xl font-bold leading-tight">
              Start your<br />journey today
            </h2>
            <p className="text-indigo-200 text-lg leading-relaxed max-w-xs">
              Join thousands of customers shopping from local stores near them.
            </p>
          </>
        )}

        {/* Feature bullets */}
        <ul className="space-y-3 pt-2">
          {[
            '📍 Discover stores near you',
            '🛵 Same-day Lalamove delivery',
            '📦 Nationwide EasyParcel shipping',
            '🔔 Live order tracking',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-indigo-100 text-sm">
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom testimonial */}
      <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
        <p className="text-white/90 text-sm italic">
          "Found my favourite nasi lemak stall on My Marketplace. Delivery was under 30 mins!"
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center font-bold text-sm">A</div>
          <div>
            <p className="text-white text-xs font-semibold">Ahmad Faris</p>
            <p className="text-indigo-300 text-xs">Kuala Lumpur</p>
          </div>
        </div>
      </div>
    </div>
  )
}
