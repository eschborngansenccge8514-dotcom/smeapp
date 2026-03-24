'use client'
import { useState } from 'react'
import { Ticket, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface PromoStepProps {
  storeId: string
  subtotal: number
  promoCode: string
  discountAmount: number
  notes: string
  onPromo: (code: string, amount: number, id: string | null) => void
  onNotes: (notes: string) => void
  onNext: () => void
  onBack: () => void
}

export function PromoStep({ storeId, subtotal, promoCode, discountAmount, notes, onPromo, onNotes, onNext, onBack }: PromoStepProps) {
  const [code, setCode] = useState(promoCode)
  const [checking, setChecking] = useState(false)
  const supabase = createSupabaseBrowser()

  async function applyPromo() {
    if (!code.trim()) return
    setChecking(true)
    
    try {
      // Find valid promotion for this store
      const { data: promo, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('status', 'active')
        .eq('store_id', storeId)
        .gte('end_date', new Date().toISOString())
        .single()

      if (error || !promo) {
        toast.error('Invalid or expired promo code')
        onPromo('', 0, null)
      } else {
        if (subtotal < (promo.min_order_amount ?? 0)) {
          toast.error(`Minimum order of RM ${promo.min_order_amount} required`)
          setChecking(false)
          return
        }

        let discount = 0
        if (promo.type === 'percentage') {
          discount = (subtotal * promo.value) / 100
          if (promo.max_discount_amount) {
            discount = Math.min(discount, promo.max_discount_amount)
          }
        } else {
          discount = promo.value
        }
        
        onPromo(promo.code, discount, promo.id)
        toast.success(`Promo applied: RM ${discount.toFixed(2)} off!`)
      }
    } catch (err: any) {
      toast.error('Error applying promo code')
    }
    setChecking(false)
  }

  function removePromo() {
    setCode('')
    onPromo('', 0, null)
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
      <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
        <Ticket size={20} className="text-indigo-500" /> Promo & Notes
      </h2>

      {/* Promo Code section */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Promotion</label>
        {discountAmount > 0 ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-green-800">{promoCode}</p>
                <p className="text-xs text-green-600">Applied discount: RM {discountAmount.toFixed(2)}</p>
              </div>
            </div>
            <button onClick={removePromo} className="text-xs font-bold text-green-700 hover:text-red-500 underline uppercase pr-2">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter promo code"
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-100 placeholder:text-gray-300"
              />
            </div>
            <button
              onClick={applyPromo}
              disabled={checking || !code.trim()}
              className="bg-indigo-600 text-white px-6 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {checking ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
            </button>
          </div>
        )}
      </div>

      {/* Notes section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Notes</label>
          <span className="text-[10px] text-gray-300 font-medium">(Optional)</span>
        </div>
        <div className="relative">
          <div className="absolute top-3.5 left-4 text-gray-300">
            <FileText size={18} />
          </div>
          <textarea
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            rows={3}
            placeholder="Special instructions for the store or driver..."
            className="w-full border-2 border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-100 resize-none h-24"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-50">
        <button onClick={onBack}
          className="px-6 bg-gray-50 text-gray-700 py-3.5 rounded-2xl font-bold hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100">
          ← Back
        </button>
        <button onClick={onNext}
          className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition-all">
          Continue to Payment →
        </button>
      </div>
    </div>
  )
}
