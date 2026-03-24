'use client'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'

export function CartNavIcon() {
  const count = useCartStore((s) => s.getItemCount())
  return (
    <Link href="/cart" className="relative">
      <ShoppingBag size={22} className="text-gray-600" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  )
}
