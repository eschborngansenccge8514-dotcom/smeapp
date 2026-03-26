'use client'
import { motion } from 'framer-motion'
import { fadeUp, buttonTap, scaleIn } from '@/components/ui/animations'

interface Props {
  onNext: () => void
  totals: { subtotal: number; total: number; service_fee: number; delivery: number }
}

const METHODS = [
  { id: 'card',    label: 'Credit / Debit Card', icon: '💳' },
  { id: 'fpx',     label: 'Online Banking (FPX)', icon: '🏛️' },
  { id: 'ewallet', label: 'E-Wallet (GrabPay, TNG)', icon: '📱' },
]

export function PaymentStep({ onNext, totals }: Props) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
      <div className="space-y-3">
        {METHODS.map((method) => (
          <motion.div
            key={method.id}
            variants={scaleIn}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-indigo-600 transition-colors flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">
              {method.icon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{method.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm">
        <div className="flex justify-between items-center font-bold text-gray-900 border-t border-gray-50 pt-2">
          <span>Amount to Pay</span>
          <span className="text-indigo-600 text-lg">RM {totals.total.toFixed(2)}</span>
        </div>
      </div>

      <motion.button
        {...buttonTap}
        onClick={onNext}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
      >
        Review Order →
      </motion.button>
    </motion.div>
  )
}
