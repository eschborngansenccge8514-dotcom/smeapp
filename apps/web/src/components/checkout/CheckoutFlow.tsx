'use client'
import { useState } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { AddressStep } from './AddressStep'
import { DeliveryStep } from './DeliveryStep'
import { PromoStep } from './PromoStep'
import { PaymentStep } from './PaymentStep'
import { OrderSummary } from './OrderSummary'

export type CheckoutState = {
  address: any | null
  deliveryType: 'lalamove' | 'easyparcel' | 'self_pickup'
  deliveryFee: number
  deliveryQuote: any | null
  promoCode: string
  discountAmount: number
  promotionId: string | null
  notes: string
}

const STEPS = ['Address', 'Delivery', 'Promo & Notes', 'Payment']

export function CheckoutFlow({ addresses, profile, userId }: any) {
  const { items, storeId, storeName, getTotal } = useCartStore()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<CheckoutState>({
    address: addresses.find((a: any) => a.is_default) ?? addresses[0] ?? null,
    deliveryType: 'lalamove',
    deliveryFee: 0,
    deliveryQuote: null,
    promoCode: '',
    discountAmount: 0,
    promotionId: null,
    notes: '',
  })

  function update(key: keyof CheckoutState, value: any) {
    setState((s) => ({ ...s, [key]: value }))
  }

  const subtotal     = getTotal()
  const serviceFee   = Math.round(subtotal * 0.02 * 100) / 100
  const total        = subtotal + state.deliveryFee + serviceFee - state.discountAmount

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Steps */}
      <div className="lg:col-span-2 space-y-1">
        {/* Stepper */}
        <div className="flex items-center mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 text-sm font-medium
                  ${i === step ? 'text-indigo-700' : i < step ? 'text-green-600 cursor-pointer' : 'text-gray-400 cursor-default'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === step ? 'bg-indigo-600 text-white'
                    : i < step ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400'}`}>
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="hidden md:block">{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <AddressStep
            addresses={addresses} selected={state.address}
            onSelect={(a: any) => update('address', a)}
            onNext={() => setStep(1)}
            userId={userId}
          />
        )}
        {step === 1 && (
          <DeliveryStep
            address={state.address} storeId={storeId!}
            deliveryType={state.deliveryType} quote={state.deliveryQuote}
            onUpdate={(type: any, fee: any, quote: any) => {
              update('deliveryType', type)
              update('deliveryFee', fee)
              update('deliveryQuote', quote)
            }}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <PromoStep
            storeId={storeId!} subtotal={subtotal}
            promoCode={state.promoCode} discountAmount={state.discountAmount}
            notes={state.notes}
            onPromo={(code: any, amount: any, id: any) => {
              update('promoCode', code)
              update('discountAmount', amount)
              update('promotionId', id)
            }}
            onNotes={(n: any) => update('notes', n)}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <PaymentStep
            userId={userId} storeId={storeId!} state={state}
            subtotal={subtotal} serviceFee={serviceFee} total={total}
            items={items}
            onBack={() => setStep(2)}
          />
        )}
      </div>

      {/* Right: Order Summary */}
      <div className="hidden lg:block">
        <OrderSummary
          items={items} storeName={storeName}
          subtotal={subtotal} deliveryFee={state.deliveryFee}
          serviceFee={serviceFee} discount={state.discountAmount}
          total={total}
        />
      </div>
    </div>
  )
}
