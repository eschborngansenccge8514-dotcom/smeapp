'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import type { User } from '@supabase/supabase-js'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const itemCount = useCartStore((s) => s.getItemCount())

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setRole(data?.role ?? null))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setRole(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    router.push('/')
    router.refresh()
  }

  // Hide navbar inside dashboard routes — they have their own sidebar
  if (pathname.startsWith('/merchant') || pathname.startsWith('/admin')) return null

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-indigo-600 shrink-0">
          🛒 My Marketplace
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            Home
          </Link>

          {/* Cart */}
          <Link href="/cart" className="relative text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            🛒 Cart
            {mounted && itemCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>

          {/* Role-based links */}
          {role === 'merchant' && (
            <Link href="/merchant/dashboard" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
          )}
          {role === 'admin' && (
            <Link href="/admin/stores" className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium">
              Admin
            </Link>
          )}

          {/* Merchant CTA */}
          {role !== 'merchant' && role !== 'admin' && (
            <Link
              href="/merchant-signup"
              className="text-sm font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Open a Store
            </Link>
          )}

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/account/orders" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                Orders
              </Link>
              <button
                onClick={signOut}
                className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile: Cart + Hamburger */}
        <div className="flex md:hidden items-center gap-4">
          <Link href="/cart" className="relative text-gray-600">
            🛒
            {mounted && itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen((o) => !o)} className="text-gray-600 text-xl">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-3">
          <Link href="/" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2">Home</Link>
          <Link href="/cart" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2">Cart {mounted && itemCount > 0 && `(${itemCount})`}</Link>
          {role === 'merchant' && (
            <Link href="/merchant/dashboard" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2">Dashboard</Link>
          )}
          {role === 'admin' && (
            <Link href="/admin/stores" onClick={() => setMenuOpen(false)} className="block text-sm text-red-500 py-2">Admin Panel</Link>
          )}
          {role !== 'merchant' && role !== 'admin' && (
            <Link href="/merchant-signup" onClick={() => setMenuOpen(false)} className="block text-sm text-indigo-600 font-medium py-2">Open a Store</Link>
          )}
          {user ? (
            <>
              <Link href="/account/orders" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2">My Orders</Link>
              <button onClick={() => { signOut(); setMenuOpen(false) }} className="block text-sm text-red-500 py-2 w-full text-left">Sign Out</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-indigo-600 font-medium py-2">Sign In</Link>
          )}
        </div>
      )}
    </nav>
  )
}
