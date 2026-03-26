'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Package,
  BarChart2, Users, Tag, Star, Wallet,
  Store, Palette, ChevronRight, Truck, Landmark,
  Mail, Bell, Globe, Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/merchant/dashboard',      icon: LayoutDashboard },
  { label: 'Orders',         href: '/merchant/orders',         icon: ShoppingBag },
  { label: 'Products',       href: '/merchant/products',       icon: Package },
  { label: 'Analytics',      href: '/merchant/analytics',      icon: BarChart2 },
  { label: 'Customers',      href: '/merchant/customers',      icon: Users },
  { label: 'Email Marketing', href: '/merchant/email-marketing', icon: Mail },
  { label: 'Promotions',     href: '/merchant/promotions',     icon: Tag },
  { label: 'Loyalty Program', href: '/merchant/settings/loyalty', icon: Trophy },
  { label: 'Reviews',        href: '/merchant/reviews',        icon: Star },
  { label: 'Notifications',  href: '/merchant/notifications',  icon: Bell },
  { label: 'Payouts',          href: '/merchant/payouts',           icon: Wallet },
  { label: 'Payment Config',   href: '/merchant/settings/payment',  icon: Landmark },
  { label: 'Store Settings',   href: '/merchant/store-settings',    icon: Store },
  { label: 'Brand Settings',   href: '/merchant/brand-settings',    icon: Palette },
  { label: 'Delivery',         href: '/merchant/settings/delivery', icon: Truck },
  { label: 'GMC Settings',     href: '/merchant/settings/gmc',      icon: Globe },
]

export function MerchantSidebar({ store }: { store: any }) {
  const pathname = usePathname()
  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0 shadow-sm">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100">
        {store.logo_url
          ? <img src={store.logo_url} className="w-8 h-8 rounded-lg object-cover" />
          : <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">🏪</div>
        }
        <span className="font-bold text-gray-900 text-sm truncate">{store.name}</span>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-indigo-400" />}
            </Link>
          )
        })}
      </nav>
      <div className={cn(
        'mx-4 mb-4 px-3 py-2 rounded-xl text-xs font-medium text-center',
        store.is_active ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
      )}>
        {store.is_active ? '🟢 Store is Live' : '🟡 Pending Approval'}
      </div>
    </aside>
  )
}
