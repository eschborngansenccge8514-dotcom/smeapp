'use client'
import { motion } from 'framer-motion'
import { fadeUp, buttonTap } from '@/components/ui/animations'
import type { FeeConfig } from '@/types/customer'

interface Props {
  onNext: () => void
  totals: { subtotal: number; total: number; service_fee: number; delivery: number }
  feeConfig: FeeConfig
}

export function ReviewStep({ onNext, totals, feeConfig }: Props) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold text-gray-900">RM {totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery Fee</span>
            <span className="font-semibold text-gray-900">RM {totals.delivery.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{feeConfig.service_fee_label}</span>
            <span className="font-semibold text-gray-900">RM {totals.service_fee.toFixed(2)}</span>
          </div>
          <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-base font-bold">
            <span className="text-gray-900">Final Total</span>
            <span className="text-indigo-600">RM {totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Delivery Details</h2>
        <div className="text-sm space-y-1">
          <p className="font-semibold text-gray-900">John Doe</p>
          <p className="text-gray-500">+60 12-345 6789</p>
          <p className="text-gray-500">123, Jalan Ampang, Kuala Lumpur</p>
        </div>
      </div>

      <motion.button
        {...buttonTap}
        onClick={onNext}
        className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-colors"
      >
        Place Order Now
      </motion.button>
    </motion.div>
  )
}
