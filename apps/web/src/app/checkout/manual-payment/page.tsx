'use client'

import { useEffect, useState, use } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { Landmark, Receipt, CheckCircle, Loader2, ArrowRight, Home } from 'lucide-react'
import { ImageUpload } from '@/components/merchant/ui/ImageUpload'
import { formatPrice } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props {
  searchParams: Promise<{ order_id: string }>
}

export default function ManualPaymentPage({ searchParams }: Props) {
  const params = use(searchParams)
  const orderId = params.order_id
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      router.push('/')
      return
    }

    async function fetchOrder() {
      const { data, error } = await supabase
        .from('orders')
        .select('*, stores(*)')
        .eq('id', orderId)
        .single()

      if (error || !data) {
        toast.error('Order not found')
        router.push('/')
        return
      }

      setOrder(data)
      setLoading(false)
    }

    fetchOrder()
  }, [orderId, router, supabase])

  async function handleSubmit() {
    if (!paymentProofUrl) {
      toast.error('Please upload your proof of payment')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout/update-payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentProofUrl }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update payment proof')
      }

      toast.success('Proof of payment submitted!')
      router.push(`/checkout/complete?order_id=${orderId}&manual=1`)
    } catch (err: any) {
      toast.error(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <p className="text-gray-500 animate-pulse">Loading order details...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Landmark size={32} className="text-indigo-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manual Payment</h1>
        <p className="text-gray-500 font-medium">Order #{orderId.slice(0, 8).toUpperCase()}</p>
        <div className="inline-block px-4 py-2 bg-indigo-50 rounded-full text-indigo-700 font-bold text-lg mt-2">
          Total to Pay: {formatPrice(order.total_amount)}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-indigo-500/5 space-y-8">
        {/* Bank Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Landmark size={20} className="text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">Bank Account Details</h2>
          </div>
          
          {(order.stores?.bank_name || order.stores?.bank_account_number) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name</p>
                <p className="font-bold text-gray-800 text-sm">{order.stores.bank_name || '-'}</p>
              </div>
              <div className="space-y-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</p>
                <p className="font-bold text-gray-800 text-sm font-mono tracking-wider">{order.stores.bank_account_number || '-'}</p>
              </div>
              <div className="sm:col-span-2 space-y-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Holder Name</p>
                <p className="font-bold text-gray-800 text-sm uppercase">{order.stores.bank_account_holder_name || '-'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No bank details provided by the store.</p>
          )}

          {order.stores?.manual_payment_instructions && (
            <div className="p-5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-2">Instructions</p>
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap italic">
                {order.stores.manual_payment_instructions}
              </p>
            </div>
          )}
        </section>

        {/* Proof Upload */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Receipt size={20} className="text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">Upload Transfer Receipt</h2>
          </div>
          
          <div className="p-6 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 flex flex-col items-center justify-center transition-all hover:bg-gray-50 hover:border-indigo-200 group">
            <ImageUpload
              bucket="payment-proofs"
              currentUrl={paymentProofUrl}
              onUpload={setPaymentProofUrl}
              onRemove={() => setPaymentProofUrl(null)}
              label=""
            />
            {!paymentProofUrl && (
              <div className="text-center mt-4">
                <p className="text-sm font-semibold text-gray-600">Click to upload receipt</p>
                <p className="text-[11px] text-gray-400 mt-1">JPEG, PNG or WebP (max 5MB)</p>
              </div>
            )}
            {paymentProofUrl && (
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <CheckCircle size={16} />
                <span className="text-sm font-bold uppercase tracking-wider">Receipt Uploaded</span>
              </div>
            )}
          </div>
        </section>

        <div className="pt-4 flex flex-col gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || !paymentProofUrl}
            className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
          >
            {submitting ? (
              <><Loader2 size={24} className="animate-spin" /> Submitting...</>
            ) : (
              <><CheckCircle size={24} /> I&apos;ve Paid & Submit Proof</>
            )}
          </button>
          
          <div className="flex items-center justify-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-sm font-semibold">
              <Home size={16} /> Home
            </Link>
            <Link href={`/orders/${orderId}`} className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-sm font-semibold group">
              View Order <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 px-8 leading-relaxed">
        Your order will remain in <span className="font-bold text-gray-500 uppercase tracking-tight">pending</span> status until the merchant verifies your payment proof.
      </p>
    </div>
  )
}
