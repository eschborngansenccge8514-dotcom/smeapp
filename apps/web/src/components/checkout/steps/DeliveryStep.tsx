'use client'
import { motion } from 'framer-motion'
import { fadeUp, buttonTap, scaleIn } from '@/components/ui/animations'
import type { FeeConfig } from '@/types/customer'

interface Props {
  onNext: () => void
  totals: { subtotal: number; total: number; service_fee: number; delivery: number }
  feeConfig: FeeConfig
}

const OPTIONS = [
  { id: 'delivery', label: 'Doorstep Delivery', icon: '🚚', fee: 5.00, time: '20-40 mins' },
  { id: 'pickup',   label: 'Self Pickup',      icon: '🏪', fee: 0.00, time: '10-15 mins' },
]

export function DeliveryStep({ onNext, totals, feeConfig }: Props) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <motion.div
            key={opt.id}
            variants={scaleIn}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-indigo-600 transition-colors flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">
              {opt.icon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{opt.label}</p>
              <p className="text-xs text-gray-400">{opt.time}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">
                {opt.fee === 0 ? 'FREE' : `RM ${opt.fee.toFixed(2)}`}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <p className="text-xs text-indigo-700 leading-relaxed">
          📍 Please ensure your contact number is correct for delivery updates.
        </p>
      </div>

      <motion.button
        {...buttonTap}
        onClick={onNext}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
      >
        Proceed to Payment →
      </motion.button>
    </motion.div>
  )
}
