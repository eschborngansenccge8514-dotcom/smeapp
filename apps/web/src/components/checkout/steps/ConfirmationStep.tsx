'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fadeUp, buttonTap, scaleIn } from '@/components/ui/animations'

export function ConfirmationStep() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="text-center space-y-8 py-10"
    >
      <motion.div
        variants={scaleIn}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl mx-auto shadow-sm"
      >
        🎉
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Thank you!
        </h1>
        <p className="text-gray-500 max-w-sm mx-auto">
          Your order has been placed successfully and the merchant is being notified.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
          Order ID
        </p>
        <p className="text-lg font-mono font-bold text-indigo-600">
          #SME-893021
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <motion.div {...buttonTap}>
          <Link
            href="/orders/SME-893021"
            className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
          >
            Track Order Status →
          </Link>
        </motion.div>
        <Link
          href="/"
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
        >
          Return to Marketplace
        </Link>
      </div>
    </motion.div>
  )
}
