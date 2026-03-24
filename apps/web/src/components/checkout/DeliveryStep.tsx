'use client'
import { useEffect, useState } from 'react'
import { Loader2, Zap, Package, Store } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface DeliveryStepProps {
  address: any; storeId: string
  deliveryType: string; quote: any
  onUpdate: (type: string, fee: number, quote: any) => void
  onNext: () => void; onBack: () => void
}

export function DeliveryStep({ address, storeId, deliveryType, quote, onUpdate, onNext, onBack }: DeliveryStepProps) {
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<{
    lalamove?: { fee: number; eta: string };
    easyparcel?: { options: any[] };
  }>({})
  const [selected, setSelected] = useState(deliveryType)
  const [selectedCourier, setSelectedCourier] = useState<any>(null)

  useEffect(() => {
    fetchQuotes()
  }, [address, storeId])

  async function fetchQuotes() {
    if (!address) return
    setLoading(true)
    try {
      const res = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, address }),
      })
      const data = await res.json()
      setQuotes(data)
    } catch {
      toast.error('Could not fetch delivery options')
    }
    setLoading(false)
  }

  function selectOption(type: string, fee: number, q: any) {
    setSelected(type)
    onUpdate(type, fee, q)
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
      <h2 className="font-bold text-lg text-gray-900">Delivery Method</h2>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Fetching delivery options...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Lalamove */}
          {quotes.lalamove && (
            <button
              onClick={() => selectOption('lalamove', quotes.lalamove!.fee, quotes.lalamove)}
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
                    <p className="text-sm text-gray-500">Same-day · ETA {quotes.lalamove.eta}</p>
                  </div>
                </div>
                <span className="font-bold text-indigo-700">{formatPrice(quotes.lalamove.fee)}</span>
              </div>
            </button>
          )}

          {/* EasyParcel */}
          {quotes.easyparcel?.options && quotes.easyparcel.options.length > 0 && (
            <div className={`border-2 rounded-2xl transition-colors
              ${selected === 'easyparcel' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setSelected('easyparcel')
                  const first = quotes.easyparcel!.options[0]
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
                    <p className="font-bold text-gray-900">Standard Shipping</p>
                    <p className="text-sm text-gray-500">via EasyParcel · 1–5 business days</p>
                  </div>
                </div>
              </button>
              {selected === 'easyparcel' && (
                <div className="px-4 pb-4 space-y-2">
                  {quotes.easyparcel.options.map((opt: any) => (
                    <button key={opt.service_id}
                      onClick={() => { setSelectedCourier(opt); selectOption('easyparcel', opt.price, opt) }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors
                        ${selectedCourier?.service_id === opt.service_id ? 'border-indigo-400 bg-white' : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{opt.courier_name}</p>
                        <p className="text-xs text-gray-400">{opt.delivery_time}</p>
                      </div>
                      <span className="font-bold text-sm text-indigo-600">{formatPrice(opt.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Self Pickup */}
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
