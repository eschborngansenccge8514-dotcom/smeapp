'use client'
import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useUrlState } from '@/lib/url-state'
import { calcOrderTotals } from '@/lib/fees'
import { CartStep }     from './steps/CartStep'
import { DeliveryStep } from './steps/DeliveryStep'
import { PaymentStep }  from './steps/PaymentStep'
import { ReviewStep }   from './steps/ReviewStep'
import { ConfirmationStep } from './steps/ConfirmationStep'
import { slideInRight } from '@/components/ui/animations'
import type { CheckoutStep, CheckoutState, FeeConfig } from '@/types/customer'

const STEPS: { key: CheckoutStep; label: string; icon: string }[] = [
  { key: 'cart',         label: 'Cart',     icon: '🛒' },
  { key: 'delivery',     label: 'Delivery', icon: '📦' },
  { key: 'payment',      label: 'Payment',  icon: '💳' },
  { key: 'review',       label: 'Review',   icon: '✅' },
  { key: 'confirmation', label: 'Done',     icon: '🎉' },
]

interface Props {
  feeConfig: FeeConfig
}

export function CheckoutFlow({ feeConfig }: Props) {
  const router = useRouter()
  const { getParam, setParam } = useUrlState()

  const currentStep = (getParam('step', 'cart') as CheckoutStep)
  const currentIdx  = STEPS.findIndex((s) => s.key === currentStep)

  // Demo values — in a real app, these come from a cart store (Zustand)
  const subtotal = 45.00
  const deliveryFee = 5.00
  const discount = 0.00

  const totals = useMemo(
    () => calcOrderTotals(subtotal, deliveryFee, discount, feeConfig),
    [subtotal, deliveryFee, discount, feeConfig]
  )

  function goToStep(step: CheckoutStep) {
    setParam('step', step, { scroll: true })
  }

  function goNext() {
    const next = STEPS[currentIdx + 1]
    if (next) goToStep(next.key)
  }

  function goPrev() {
    if (currentIdx > 0) router.back()
  }

  const progressPct = ((currentIdx) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            {currentStep !== 'confirmation' && (
              <button
                onClick={goPrev}
                disabled={currentIdx === 0}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
            )}
            <p className="text-sm font-bold text-gray-900 mx-auto">Checkout</p>
            {currentStep !== 'confirmation' && (
              <p className="text-xs text-gray-400">
                {currentIdx + 1} / {STEPS.length - 1}
              </p>
            )}
          </div>

          <div className="flex justify-between mb-2">
            {STEPS.filter((s) => s.key !== 'confirmation').map((s, i) => (
              <button
                key={s.key}
                onClick={() => i < currentIdx && goToStep(s.key)}
                disabled={i >= currentIdx}
                className={`flex flex-col items-center gap-1 transition-all ${
                  i <= currentIdx ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    s.key === currentStep
                      ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md'
                      : i < currentIdx
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {i < currentIdx ? '✓' : s.icon}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${
                  s.key === currentStep ? 'text-indigo-600' : i < currentIdx ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
          >
            {currentStep === 'cart'         && <CartStep onNext={goNext} totals={totals} feeConfig={feeConfig} />}
            {currentStep === 'delivery'     && <DeliveryStep onNext={goNext} totals={totals} feeConfig={feeConfig} />}
            {currentStep === 'payment'      && <PaymentStep onNext={goNext} totals={totals} />}
            {currentStep === 'review'       && <ReviewStep onNext={goNext} totals={totals} feeConfig={feeConfig} />}
            {currentStep === 'confirmation' && <ConfirmationStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
