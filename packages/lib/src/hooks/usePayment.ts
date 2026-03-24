import { useState } from 'react'
import { supabase } from '../supabase'

export interface PaymentResult {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface UsePaymentOptions {
  onSuccess: (orderId: string) => void
  onFailure: (error: string) => void
}

export function useCreatePaymentOrder() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createPaymentOrder(orderId: string) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment', {
        body: { orderId },
      })
      if (fnError) throw fnError
      if (data.error) throw new Error(data.error)
      return data as {
        razorpay_order_id: string
        key_id: string
        amount: number
        currency: string
        order_id: string
      }
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function verifyPayment(
    result: PaymentResult & { order_id: string }
  ): Promise<boolean> {
    const { data, error: fnError } = await supabase.functions.invoke('verify-payment', {
      body: result,
    })
    if (fnError || !data?.success) return false
    return true
  }

  return { createPaymentOrder, verifyPayment, loading, error }
}
