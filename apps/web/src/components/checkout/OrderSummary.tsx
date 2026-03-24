'use client'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'

interface OrderSummaryProps {
  items: any[]
  storeName: string | null
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  total: number
}

export function OrderSummary({ items, storeName, subtotal, deliveryFee, serviceFee, discount, total }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm sticky top-20">
      <h3 className="font-bold text-gray-900 mb-4 text-lg">Order Summary</h3>
      
      {/* Items list */}
      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={`${item.id}_${item.variant_id ?? 'base'}`} className="flex gap-3">
            <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100">
              {item.image_urls?.[0]
                ? <Image src={item.image_urls[0]} alt={item.name} fill className="object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
              }
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{item.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatPrice(item.price)} each</p>
            </div>
            <p className="text-xs font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-2.5 pt-4 border-t border-gray-50">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery fee</span>
          <span className={deliveryFee > 0 ? '' : 'text-gray-400 italic'}>
            {deliveryFee > 0 ? formatPrice(deliveryFee) : 'Free/Quoted'}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Service fee (2%)</span>
          <span>{formatPrice(serviceFee)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600 font-medium">
            <span>Discount</span>
            <span>−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-3 flex justify-between">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-extrabold text-indigo-600 text-lg">{formatPrice(total)}</span>
        </div>
      </div>
      
      {storeName && (
        <p className="mt-4 text-[10px] text-gray-400 text-center uppercase tracking-wider font-semibold">
          Ordering from {storeName}
        </p>
      )}
    </div>
  )
}
