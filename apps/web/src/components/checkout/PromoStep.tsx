'use client'
import { useState } from 'react'
import { Ticket, FileText, CheckCircle2, XCircle, Loader2, Coins, Minus, Plus } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

interface PromoStepProps {
  storeId: string
  userId: string
  subtotal: number
  promoCode: string
  discountAmount: number
  loyaltyPoints: number
  loyaltyDiscount: number
  notes: string
  onPromo: (code: string, amount: number, id: string | null) => void
  onLoyalty: (points: number, discount: number) => void
  onNotes: (notes: string) => void
  onNext: () => void
  onBack: () => void
}

export function PromoStep({ 
  storeId, userId, subtotal, promoCode, discountAmount, 
  loyaltyPoints, loyaltyDiscount, notes, 
  onPromo, onLoyalty, onNotes, onNext, onBack 
}: PromoStepProps) {
  const [code, setCode] = useState(promoCode)
  const [checking, setChecking] = useState(false)
  const [balance, setBalance] = useState<{ current_points: number } | null>(null)
  const [program, setProgram] = useState<any>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    async function loadLoyalty() {
      const [{ data: bal }, { data: prog }] = await Promise.all([
        supabase.from('store_customers').select('current_points:loyalty_points').eq('user_id', userId).eq('store_id', storeId).maybeSingle(),
        supabase.from('loyalty_programs').select('*').eq('store_id', storeId).eq('is_enabled', true).maybeSingle()
      ])
      setBalance(bal)
      setProgram(prog)
    }
    loadLoyalty()
  }, [storeId, userId])

  const maxPointsByPct = program ? Math.floor((program.max_redeem_pct / 100) * subtotal * program.points_per_myr_redeem) : 0
  const maxRedeemable = Math.min(balance?.current_points ?? 0, maxPointsByPct)

  function handleLoyaltyChange(pts: number) {
    const finalPts = Math.max(0, Math.min(pts, maxRedeemable))
    const discount = program ? finalPts / program.points_per_myr_redeem : 0
    onLoyalty(finalPts, discount)
  }

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

      {/* Loyalty Points Section */}
      {program && balance && balance.current_points > 0 && (
        <div className="space-y-4 border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
              <Coins size={16} className="text-amber-500" /> Pay with Points
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
              Balance: {balance.current_points} pts
            </span>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 mb-2">Points to redeem</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleLoyaltyChange(loyaltyPoints - 10)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold text-center text-gray-900 shadow-sm relative group">
                     {loyaltyPoints}
                     {loyaltyPoints >= maxRedeemable && maxRedeemable > 0 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-lg">Max redeemable reached</div>
                     )}
                  </div>
                  <button 
                    onClick={() => handleLoyaltyChange(loyaltyPoints + 10)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 mb-2">Discount</p>
                <p className="text-lg font-bold text-indigo-600">-RM {loyaltyDiscount.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input 
                type="range" 
                min="0" 
                max={maxRedeemable} 
                step="1"
                value={loyaltyPoints} 
                onChange={(e) => handleLoyaltyChange(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
              />
            </div>
          </div>
        </div>
      )}

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
