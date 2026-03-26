'use client'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'

export function OrderDetails({ order }: { order: any }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
        <div className="w-12 h-12 relative bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
          {order.stores?.logo_url ? (
            <Image src={order.stores.logo_url} alt={order.stores.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>
          )}
        </div>
        <div>
          <h2 className="font-bold text-gray-900 leading-tight">{order.stores?.name}</h2>
          <p className="text-xs text-gray-400">Merchant Store</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Items</h3>
        <div className="space-y-3">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex gap-3">
              <div className="w-14 h-14 relative bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                {item.products?.image_urls?.[0] ? (
                  <Image src={item.products.image_urls[0]} alt={item.products.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                )}
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.products?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.unit_price)} each</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-50 space-y-2.5">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery fee ({order.delivery_type})</span>
          <span>{formatPrice(order.delivery_fee)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Service fee (2%)</span>
          <span>{formatPrice(order.service_fee)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-sm text-green-600 font-medium font-bold">
            <span>Discount Applied</span>
            <span>−{formatPrice(order.discount_amount)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-3 flex justify-between">
          <span className="font-bold text-gray-900">Total {order.payment_method === 'manual' ? 'Amount' : 'Paid'}</span>
          <span className="font-extrabold text-indigo-600 text-lg">{formatPrice(order.total_amount)}</span>
        </div>
        
        {order.payment_method === 'manual' && order.stores?.manual_payment_instructions && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>💰</span> Manual Payment Instructions
            </h4>
            <p className="text-sm text-orange-900 leading-relaxed whitespace-pre-wrap italic">
              {order.stores.manual_payment_instructions}
            </p>
          </div>
        )}
      </div>

      {order.notes && (
        <div className="pt-4 border-t border-gray-50">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instructions</h3>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl italic">
            "{order.notes}"
          </p>
        </div>
      )}
      
      <div className="pt-4 border-t border-gray-50">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Details</h3>
        <p className="text-sm font-bold text-gray-800">{order.recipient_name}</p>
        <p className="text-sm text-gray-600">{order.recipient_phone}</p>
        <p className="text-sm text-gray-600 mt-1">
          {order.delivery_address}, {order.delivery_city}, {order.delivery_state} {order.delivery_postcode}
        </p>
      </div>
    </div>
  )
}
