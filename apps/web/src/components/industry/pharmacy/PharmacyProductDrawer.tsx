'use client'
import { useState } from 'react'
import Image from 'next/image'
import { RX_CONFIG, DOSAGE_FORM_ICONS } from '@/lib/industry/themes/pharmacy'
import type { PharmacyProduct } from '@/lib/industry/types'
import { PharmacyPrescription } from './PharmacyPrescription'

interface Props {
  product: PharmacyProduct | null
  primaryColor: string
  cartQty: number
  onClose: () => void
  onAdd: (product: PharmacyProduct, delta: number) => void
}

export function PharmacyProductDrawer({ product, primaryColor, cartQty, onClose, onAdd }: Props) {
  const [qty, setQty]           = useState(1)
  const [tab, setTab]           = useState<'overview' | 'dosage' | 'warnings'>('overview')
  const [rxOpen, setRxOpen]     = useState(false)
  const [rxUrl, setRxUrl]       = useState<string | null>(null)

  if (!product) return null

  const rx = RX_CONFIG[product.rx_status]
  const isRx = product.rx_status === 'prescription'
  const hasPromo = product.is_on_promotion && product.promotion_price != null
  const displayPrice = hasPromo ? product.promotion_price! : product.price
  const dosageIcon = DOSAGE_FORM_ICONS[product.dosage_form?.toLowerCase() ?? 'default'] ?? '💊'
  const maxQty = product.max_order_qty ?? 10

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'dosage',   label: 'Dosage & Use' },
    { key: 'warnings', label: '⚠ Warnings' },
  ] as const

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden md:inset-0 md:m-auto md:max-w-xl md:max-h-[90vh] md:rounded-3xl">

        {/* Close handle */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
          <button onClick={onClose}
            className="absolute right-4 top-4 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold hover:bg-gray-200">
            ✕
          </button>
        </div>

        {/* Product header */}
        <div className="px-5 pt-4 pb-3 flex gap-4 shrink-0">
          {/* Image */}
          <div className="relative w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center">
            {product.image_url ? (
              <Image src={product.image_url} alt={product.name} fill className="object-contain p-2" />
            ) : (
              <span className="text-4xl opacity-30">{dosageIcon}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {product.brand && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{product.brand}</p>
            )}
            <h2 className="font-bold text-gray-900 text-lg leading-snug">{product.name}</h2>
            {product.generic_name && product.generic_name !== product.name && (
              <p className="text-xs text-gray-400 italic">{product.generic_name}</p>
            )}

            {/* Rx badge */}
            <div
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: rx.bg, color: rx.color, border: `1px solid ${rx.border}` }}
            >
              {rx.icon} {rx.label}
            </div>
          </div>
        </div>

        {/* Meta chips */}
        <div className="px-5 pb-3 flex flex-wrap gap-2 shrink-0">
          {product.dosage_strength && (
            <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
              {dosageIcon} {product.dosage_strength}
            </span>
          )}
          {product.dosage_form && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg">{product.dosage_form}</span>
          )}
          {product.pack_size && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg">📦 {product.pack_size}</span>
          )}
          {product.active_ingredient && (
            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-100">
              🔬 {product.active_ingredient}
            </span>
          )}
          {product.country_of_origin && (
            <span className="bg-gray-50 text-gray-500 text-xs px-2.5 py-1 rounded-lg border border-gray-100">
              🌍 {product.country_of_origin}
            </span>
          )}
          {product.registration_no && (
            <span className="bg-gray-50 text-gray-500 text-xs px-2.5 py-1 rounded-lg border border-gray-100">
              KKM {product.registration_no}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="px-5 shrink-0 flex gap-1 border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                tab === t.key
                  ? 'border-current'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
              style={tab === t.key ? { color: primaryColor, borderColor: primaryColor } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'overview' && (
            <>
              {product.description && (
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
              )}
              {product.indications && product.indications.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Indications</p>
                  <div className="flex flex-wrap gap-2">
                    {product.indications.map((ind) => (
                      <span key={ind} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-100">
                        ✓ {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isRx && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                  <p className="font-bold text-red-700 text-sm flex items-center gap-2">
                    📋 Prescription Required
                  </p>
                  <p className="text-red-600 text-xs leading-relaxed">
                    This medicine requires a valid prescription from a registered medical practitioner in Malaysia.
                  </p>
                  {rxUrl ? (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <span className="text-green-500">✅</span>
                      <p className="text-green-700 text-xs font-semibold">Prescription uploaded successfully</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRxOpen(true)}
                      className="text-xs font-bold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90"
                      style={{ backgroundColor: '#991B1B' }}
                    >
                      📋 Upload Prescription
                    </button>
                  )}
                </div>
              )}
              {product.requires_consultation && !isRx && (
                <div
                  className="rounded-2xl p-4 space-y-1"
                  style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}25` }}
                >
                  <p className="font-bold text-sm" style={{ color: primaryColor }}>
                    💬 Pharmacist Consultation Recommended
                  </p>
                  <p className="text-xs text-gray-500">
                    Our pharmacist can provide guidance on dosage and usage for this product.
                  </p>
                </div>
              )}
            </>
          )}

          {tab === 'dosage' && (
            <div className="space-y-4">
              {product.dosage_strength && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Strength</p>
                  <p className="font-bold text-gray-900">{product.dosage_strength}</p>
                </div>
              )}
              {product.dosage_form && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Dosage Form</p>
                  <p className="font-bold text-gray-900">{dosageIcon} {product.dosage_form}</p>
                </div>
              )}
              {product.active_ingredient && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Active Ingredient</p>
                  <p className="font-bold text-gray-900">{product.active_ingredient}</p>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="font-semibold text-blue-800 text-sm">📖 Always read the label</p>
                <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                  Use only as directed. If symptoms persist, consult your pharmacist or doctor.
                </p>
              </div>
            </div>
          )}

          {tab === 'warnings' && (
            <div className="space-y-3">
              {product.warnings && product.warnings.length > 0 ? (
                product.warnings.map((w, i) => (
                  <div key={i} className="flex gap-3 bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <span className="text-orange-400 shrink-0 mt-0.5">⚠</span>
                    <p className="text-orange-800 text-sm">{w}</p>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 rounded-2xl p-5 text-center">
                  <p className="text-gray-400 text-sm">No specific warnings listed.</p>
                  <p className="text-gray-400 text-xs mt-1">Always consult the product leaflet.</p>
                </div>
              )}
              {product.age_restriction && (
                <div className="flex gap-3 bg-red-50 border border-red-100 rounded-xl p-3">
                  <span className="text-red-400 shrink-0 mt-0.5">🚫</span>
                  <p className="text-red-700 text-sm font-semibold">{product.age_restriction}</p>
                </div>
              )}
              <div className="flex gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                <span className="text-gray-400 shrink-0 mt-0.5">ℹ️</span>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Keep out of reach of children. Store below 30°C in a dry place away from direct sunlight.
                </p>
              </div>
            </div>
          )}
          <div className="h-2" />
        </div>

        {/* CTA Footer */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {hasPromo ? (
                <div>
                  <span className="text-2xl font-bold text-red-600">RM {displayPrice.toFixed(2)}</span>
                  <span className="text-sm text-gray-400 line-through ml-2">RM {product.price.toFixed(2)}</span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-gray-900">RM {product.price.toFixed(2)}</span>
              )}
              {product.pack_size && (
                <p className="text-xs text-gray-400">{product.pack_size}</p>
              )}
            </div>

            {!isRx && (
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-2 py-1">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center"
                  style={{ color: primaryColor }}>−</button>
                <span className="text-base font-bold text-gray-900 w-5 text-center">{qty}</span>
                <button onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  disabled={qty >= maxQty}
                  className="w-8 h-8 rounded-lg font-bold text-base text-white flex items-center justify-center disabled:opacity-30"
                  style={{ backgroundColor: primaryColor }}>+</button>
              </div>
            )}
          </div>

          {!isRx ? (
            <button
              onClick={() => { onAdd(product, qty); onClose() }}
              className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-between px-5 transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <span>{cartQty > 0 ? `Add ${qty} More` : 'Add to Cart'}</span>
              <span>RM {(displayPrice * qty).toFixed(2)}</span>
            </button>
          ) : (
            <button
              onClick={() => setRxOpen(true)}
              disabled={!!rxUrl}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all border-2 disabled:opacity-60"
              style={rxUrl
                ? { backgroundColor: '#D1FAE5', color: '#065F46', borderColor: '#6EE7B7' }
                : { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' }}
            >
              {rxUrl ? '✅ Prescription Submitted' : '📋 Upload Prescription to Order'}
            </button>
          )}
        </div>
      </div>

      <PharmacyPrescription
        isOpen={rxOpen}
        onClose={() => setRxOpen(false)}
        onUploaded={(url) => setRxUrl(url)}
        primaryColor={primaryColor}
      />
    </>
  )
}
