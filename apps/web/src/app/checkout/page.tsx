import { Suspense } from 'react'
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'

export default function CheckoutPage() {
  // In a real app, you might fetch store-specific fee config if the cart belongs to a store
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}>
      <CheckoutFlow feeConfig={DEFAULT_FEE_CONFIG} />
    </Suspense>
  )
}
