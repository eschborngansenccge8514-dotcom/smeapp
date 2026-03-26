'use client'
import { useEffect, useState } from 'react'
import { Loader2, Zap, Package, Store, Gift } from 'lucide-react'
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

export function DeliveryStep({
  address, storeId, deliveryType, quote,
  cartSubtotal = 0,
  onUpdate, onNext, onBack,
}: DeliveryStepProps) {
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<QuoteResult>({})
  const [selected, setSelected] = useState(deliveryType)
  const [selectedCourier, setSelectedCourier] = useState<any>(null)

  useEffect(() => { fetchQuotes() }, [address, storeId])

  /** Resolve lat/lng for an address if they are missing. Saves result back to DB. */
  async function geocodeIfMissing(addr: any): Promise<any> {
    if (addr?.lat && addr?.lng) return addr           // already has coordinates
    if (!addr?.address_line) return addr              // nothing to geocode

    try {
      const fullAddress = [
        addr.address_line,
        addr.postcode,
        addr.city,
        addr.state,
        'Malaysia',
      ].filter(Boolean).join(', ')

      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress }),
      })
      if (res.ok) {
        const geo = await res.json()
        const enriched = { ...addr, lat: geo.lat, lng: geo.lon }

        // Persist back to Supabase so future checkouts skip re-geocoding
        if (addr.id) {
          try {
            const { createSupabaseBrowser } = await import('@/lib/supabase/client')
            const supabase = createSupabaseBrowser()
            await supabase
              .from('addresses')
              .update({ lat: geo.lat, lng: geo.lon })
              .eq('id', addr.id)
          } catch { /* non-fatal */ }
        }

        return enriched
      }
    } catch { /* non-fatal — proceed with missing coords */ }
    return addr
  }

  async function fetchQuotes() {
    if (!address) return
    setLoading(true)
    try {
      const enrichedAddress = await geocodeIfMissing(address)
      const res = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, address: enrichedAddress }),
      })
      const data: QuoteResult = await res.json()
      setQuotes(data)
    } catch {
      toast.error('Could not fetch delivery options')
    }
    setLoading(false)
  }

  function selectOption(type: string, fee: number, q: any) {
    const effectiveFee =
      quotes.freeThreshold != null && cartSubtotal >= quotes.freeThreshold ? 0 : fee
    setSelected(type)
    onUpdate(type, effectiveFee, q)
  }

  const providers = quotes.enabledProviders ?? { lalamove: true, easyparcel: true, self_pickup: true }
  const isFreeDelivery = quotes.freeThreshold != null && cartSubtotal >= quotes.freeThreshold

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
      <h2 className="font-bold text-lg text-gray-900">Delivery Method</h2>

      {/* Free delivery banner */}
      {isFreeDelivery && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <Gift size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">
            🎉 Your order qualifies for free delivery!
          </p>
        </div>
      )}
      {quotes.freeThreshold != null && !isFreeDelivery && (
        <p className="text-xs text-gray-400">
          Add {formatPrice(quotes.freeThreshold - cartSubtotal)} more to get free delivery.
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Fetching delivery options…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Lalamove */}
          {providers.lalamove && quotes.lalamove && (
            quotes.lalamove.error ? (
              <div className="w-full text-left p-4 rounded-2xl border-2 border-red-100 bg-red-50 opacity-75">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <Zap size={20} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Lalamove Unavailable</p>
                    <p className="text-sm text-red-600">{quotes.lalamove.error}</p>
                  </div>
                </div>
              </div>
            ) : (
            <button
              onClick={() => selectOption('lalamove', quotes.lalamove!.fee!, quotes.lalamove)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-colors
                ${selected === 'lalamove' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Zap size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Lalamove</p>
                    <p className="text-sm text-gray-500">Usually for short distance delivery</p>
                    <p className="text-sm text-indigo-600 font-medium">ETA: {quotes.lalamove.eta}</p>
                  </div>
                </div>
                <span className="font-bold text-indigo-700">
                  {isFreeDelivery ? <span className="text-green-600">FREE</span> : formatPrice(quotes.lalamove.fee!)}
                </span>
              </div>
            </button>
            )
          )}

          {/* EasyParcel */}
          {providers.easyparcel && quotes.easyparcel && (
            quotes.easyparcel.error || !quotes.easyparcel.options?.length ? (
              <div className="w-full text-left p-4 rounded-2xl border-2 border-red-100 bg-red-50 opacity-75">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <Package size={20} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Easyparcel Unavailable</p>
                    <p className="text-sm text-red-600">{quotes.easyparcel.error || 'No delivery options available for this address.'}</p>
                  </div>
                </div>
              </div>
            ) : (
            <div className={`border-2 rounded-2xl transition-colors
              ${selected === 'easyparcel' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setSelected('easyparcel')
                  const first = quotes.easyparcel!.options![0]
                  setSelectedCourier(first)
                  selectOption('easyparcel', first.price, first)
                }}
                className="w-full text-left p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Package size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Easyparcel</p>
                    <p className="text-sm text-gray-500">Usually for long distance delivery</p>
                  </div>
                </div>
              </button>
              {selected === 'easyparcel' && (
                <div className="px-4 pb-4 space-y-2">
                  {quotes.easyparcel.options!.map((opt: any) => (
                    <button key={opt.service_id}
                      onClick={() => { setSelectedCourier(opt); selectOption('easyparcel', opt.price, opt) }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors
                        ${selectedCourier?.service_id === opt.service_id ? 'border-indigo-400 bg-white' : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{opt.courier_name}</p>
                        <p className="text-xs text-gray-400">{opt.delivery_time}</p>
                      </div>
                      <span className="font-bold text-sm text-indigo-600">
                        {isFreeDelivery ? <span className="text-green-600">FREE</span> : formatPrice(opt.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            )
          )}

          {/* Self Pickup */}
          {providers.self_pickup && (
            <button
              onClick={() => selectOption('self_pickup', 0, null)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-colors
                ${selected === 'self_pickup' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Store size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Self Pickup</p>
                    <p className="text-sm text-gray-500">Collect from store — Free</p>
                  </div>
                </div>
                <span className="font-bold text-green-600">FREE</span>
              </div>
            </button>
          )}

          {!providers.lalamove && !providers.easyparcel && !providers.self_pickup && (
            <p className="text-sm text-gray-400 text-center py-8">
              This store has not configured any delivery options yet.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack}
          className="px-5 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
          ← Back
        </button>
        <button onClick={onNext} disabled={!selected || loading}
          className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50">
          Continue →
        </button>
      </div>
    </div>
  )
}

