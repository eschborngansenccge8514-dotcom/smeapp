'use client'
import { useEffect, useState } from 'react'
import { Loader2, Zap, Package, Store, Gift, ChevronRight, CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface DeliveryStepProps {
  address: any; storeId: string
  deliveryType: string; quote: any
  cartSubtotal?: number
  onUpdate: (type: string, fee: number, quote: any) => void
  onNext: () => void; onBack: () => void
}

interface QuoteResult {
  enabledProviders?: { lalamove: boolean; easyparcel: boolean; self_pickup: boolean }
  freeThreshold?: number | null
  lalamove?: { fee?: number; eta?: string; error?: string }
  easyparcel?: { options?: any[]; error?: string }
}

type MethodKey = 'lalamove' | 'easyparcel' | 'self_pickup'

const METHOD_META: Record<MethodKey, { label: string; description: string; icon: React.ReactNode; color: string; iconBg: string }> = {
  lalamove: {
    label: 'Lalamove',
    description: 'Fast same-day delivery for short distances',
    icon: <Zap size={20} className="text-orange-500" />,
    color: 'orange',
    iconBg: 'bg-orange-100',
  },
  easyparcel: {
    label: 'EasyParcel',
    description: 'Courier shipping for longer distances',
    icon: <Package size={20} className="text-blue-500" />,
    color: 'blue',
    iconBg: 'bg-blue-100',
  },
  self_pickup: {
    label: 'Self Pickup',
    description: 'Collect from store — Free',
    icon: <Store size={20} className="text-green-600" />,
    color: 'green',
    iconBg: 'bg-green-100',
  },
}

export function DeliveryStep({
  address, storeId, deliveryType, quote,
  cartSubtotal = 0,
  onUpdate, onNext, onBack,
}: DeliveryStepProps) {
  // Phase 1: which providers are enabled (fetched once on mount)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [enabledProviders, setEnabledProviders] = useState<{ lalamove: boolean; easyparcel: boolean; self_pickup: boolean }>({ lalamove: true, easyparcel: true, self_pickup: true })
  const [freeThreshold, setFreeThreshold] = useState<number | null>(null)

  // Phase 2: after user picks a method, fetch the cost
  const [chosenMethod, setChosenMethod] = useState<MethodKey | null>((deliveryType as MethodKey) ?? null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [methodQuote, setMethodQuote] = useState<any>(quote ?? null)

  // EasyParcel sub-selection
  const [selectedCourier, setSelectedCourier] = useState<any>(null)

  const isFreeDelivery = freeThreshold != null && cartSubtotal >= freeThreshold

  // ── Step 1: fetch just the provider config (cheap) ──────────────────────────
  useEffect(() => {
    fetchProviders()
  }, [storeId])

  async function fetchProviders() {
    setLoadingProviders(true)
    try {
      const res = await fetch(`/api/delivery/providers?storeId=${storeId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.enabledProviders) setEnabledProviders(data.enabledProviders)
        if (data.freeThreshold !== undefined) setFreeThreshold(data.freeThreshold)
      } else {
        // fallback: just show all providers, quote fetch will sort it out
      }
    } catch {
      // non-fatal: show all providers
    }
    setLoadingProviders(false)
  }

  // ── Step 2: calculation logic (triggered by Next button) ────────────────────
  function selectMethod(method: MethodKey) {
    setChosenMethod(method)
    setMethodQuote(null)
    setSelectedCourier(null)

    if (method === 'self_pickup') {
      onUpdate('self_pickup', 0, null)
    }
  }

  async function handleContinue() {
    if (!chosenMethod) return

    if (chosenMethod === 'self_pickup') {
      onNext()
      return
    }

    // If we don't have a quote yet, fetch it now
    if (!methodQuote) {
      setLoadingQuote(true)
      try {
        const enrichedAddress = await geocodeIfMissing(address)
        const res = await fetch('/api/delivery/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId, address: enrichedAddress, provider: chosenMethod }),
        })
        const data: QuoteResult = await res.json()

        if (data.freeThreshold !== undefined) setFreeThreshold(data.freeThreshold)

        if (chosenMethod === 'lalamove') {
          const q = data.lalamove
          setMethodQuote(q)
          if (q && !q.error) {
            const fee = isFreeDelivery ? 0 : (q.fee ?? 0)
            onUpdate('lalamove', fee, q)
            onNext() // Auto-advance for Lalamove if price is found
          }
        } else if (chosenMethod === 'easyparcel') {
          const q = data.easyparcel
          setMethodQuote(q)
          if (q && !q.error && q.options?.length) {
            const first = q.options[0]
            setSelectedCourier(first)
            const fee = isFreeDelivery ? 0 : first.price
            onUpdate('easyparcel', fee, first)
            // DON'T auto-advance for EasyParcel, user needs to see/pick courier
          }
        }
      } catch {
        toast.error('Could not fetch delivery cost')
      } finally {
        setLoadingQuote(false)
      }
      return
    }

    // If we already have a quote, check if we can proceed
    if (chosenMethod === 'lalamove' && !methodQuote.error) {
      onNext()
    } else if (chosenMethod === 'easyparcel' && selectedCourier) {
      onNext()
    }
  }

  function selectCourier(opt: any) {
    setSelectedCourier(opt)
    const fee = isFreeDelivery ? 0 : opt.price
    onUpdate('easyparcel', fee, opt)
  }

  async function geocodeIfMissing(addr: any): Promise<any> {
    if (addr?.lat && addr?.lng) return addr
    if (!addr?.address_line) return addr
    try {
      const fullAddress = [addr.address_line, addr.postcode, addr.city, addr.state, 'Malaysia'].filter(Boolean).join(', ')
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress }),
      })
      if (res.ok) {
        const geo = await res.json()
        const enriched = { ...addr, lat: geo.lat, lng: geo.lon }
        if (addr.id) {
          try {
            const { createSupabaseBrowser } = await import('@/lib/supabase/client')
            const supabase = createSupabaseBrowser()
            await supabase.from('addresses').update({ lat: geo.lat, lng: geo.lon }).eq('id', addr.id)
          } catch { /* non-fatal */ }
        }
        return enriched
      }
    } catch { /* non-fatal */ }
    return addr
  }

  // ── Determine if Continue is allowed ────────────────────────────────────────
  const canContinue = !!chosenMethod && !loadingQuote

  const availableMethods = (Object.keys(METHOD_META) as MethodKey[]).filter(k => enabledProviders[k])

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
      <h2 className="font-bold text-lg text-gray-900">Delivery Method</h2>

      {/* Free delivery banner */}
      {isFreeDelivery && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <Gift size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">🎉 Your order qualifies for free delivery!</p>
        </div>
      )}
      {freeThreshold != null && !isFreeDelivery && (
        <p className="text-xs text-gray-400">
          Add {formatPrice(freeThreshold - cartSubtotal)} more to get free delivery.
        </p>
      )}

      {loadingProviders ? (
        <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading delivery options…</span>
        </div>
      ) : availableMethods.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          This store has not configured any delivery options yet.
        </p>
      ) : (
        <div className="space-y-3">
          {/* ── Method selector cards ─────────────────────────────── */}
          {availableMethods.map((method) => {
            const meta = METHOD_META[method]
            const isChosen = chosenMethod === method

            return (
              <div key={method} className={`rounded-2xl border-2 transition-all overflow-hidden
                ${isChosen ? 'border-indigo-500' : 'border-gray-200 hover:border-indigo-300'}`}>

                {/* Method header row */}
                <button
                  onClick={() => selectMethod(method)}
                  className={`w-full text-left p-4 transition-colors
                    ${isChosen ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{meta.label}</p>
                        <p className="text-sm text-gray-500">{meta.description}</p>
                      </div>
                    </div>

                    {/* Right side: indicator */}
                    {isChosen ? (
                      <CheckCircle2 size={20} className="text-indigo-500 shrink-0" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded cost details (only when this method is chosen) */}
                {isChosen && method !== 'self_pickup' && (
                  <div className="border-t border-indigo-100 bg-indigo-50 px-4 pb-4 pt-3">
                    {loadingQuote ? (
                      <div className="flex items-center gap-2 text-indigo-500 text-sm py-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Calculating cost…</span>
                      </div>
                    ) : methodQuote?.error ? (
                      <p className="text-sm text-red-600">{methodQuote.error}</p>
                    ) : method === 'lalamove' && methodQuote ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Estimated arrival: <span className="font-medium text-gray-900">{methodQuote.eta}</span></p>
                        </div>
                        <span className="font-bold text-indigo-700">
                          {isFreeDelivery
                            ? <span className="text-green-600">FREE</span>
                            : formatPrice(methodQuote.fee)}
                        </span>
                      </div>
                    ) : method === 'easyparcel' && methodQuote?.options?.length ? (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium mb-2">Choose a courier:</p>
                        {methodQuote.options.map((opt: any) => (
                          <button
                            key={opt.service_id}
                            onClick={() => selectCourier(opt)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors
                              ${selectedCourier?.service_id === opt.service_id
                                ? 'border-indigo-400 bg-white ring-1 ring-indigo-300'
                                : 'border-gray-200 bg-white hover:border-indigo-200'}`}
                          >
                            <div className="flex items-center gap-2">
                              {selectedCourier?.service_id === opt.service_id && (
                                <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />
                              )}
                              <div>
                                <p className="font-medium text-sm text-gray-900">{opt.courier_name}</p>
                                <p className="text-xs text-gray-400">{opt.delivery_time}</p>
                              </div>
                            </div>
                            <span className="font-bold text-sm text-indigo-600">
                              {isFreeDelivery
                                ? <span className="text-green-600">FREE</span>
                                : formatPrice(opt.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Self pickup — just show FREE badge */}
                {isChosen && method === 'self_pickup' && (
                  <div className="border-t border-indigo-100 bg-indigo-50 px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-gray-600">No delivery charge applies.</p>
                    <span className="font-bold text-green-600">FREE</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack}
          className="px-5 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
          ← Back
        </button>
        <button onClick={handleContinue} disabled={!canContinue}
          className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 min-h-[56px]">
          {loadingQuote ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span>Calculating cost...</span>
            </div>
          ) : (
            'Continue →'
          )}
        </button>
      </div>
    </div>
  )
}
