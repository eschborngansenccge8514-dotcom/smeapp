'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Store, Users, ShoppingBag,
  AlertTriangle, CreditCard, Wallet, Palette,
  Tag, Megaphone, Settings, LogOut, ChevronRight,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/admin/dashboard',      icon: LayoutDashboard },
  { label: 'Stores',        href: '/admin/stores',         icon: Store },
  { label: 'Users',         href: '/admin/users',          icon: Users },
  { label: 'Orders',        href: '/admin/orders',         icon: ShoppingBag },
  { label: 'Disputes',      href: '/admin/disputes',       icon: AlertTriangle },
  { label: 'Payments',      href: '/admin/payments',       icon: CreditCard },
  { label: 'Payouts',       href: '/admin/payouts',        icon: Wallet },
  { label: 'Brands',        href: '/admin/brands',         icon: Palette },
  { label: 'Categories',    href: '/admin/categories',     icon: Tag },
  { label: 'Announcements', href: '/admin/announcements',  icon: Megaphone },
  { label: 'Seed Data',     href: '/admin/seed',           icon: Database },
  { label: 'Settings',      href: '/admin/settings',       icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-gray-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-800">
        <span className="text-white font-bold text-lg">🛍️ Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-red-400 text-sm rounded-lg transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </Link>
      </div>
    </aside>
  )
}
