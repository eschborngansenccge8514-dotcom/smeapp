'use client'
import { useState } from 'react'
import { FASHION_SIZE_GUIDE } from '@/lib/industry/themes/fashion'

interface Props {
  isOpen: boolean
  onClose: () => void
  category: string | null
  primaryColor: string
}

export function FashionSizeGuide({ isOpen, onClose, category, primaryColor }: Props) {
  const guideKey = category?.toLowerCase().includes('bottom') ? 'bottoms'
    : category?.toLowerCase().includes('footwear') || category?.toLowerCase().includes('shoe') ? 'footwear'
    : 'tops'

  const guide = FASHION_SIZE_GUIDE[guideKey]
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm')

  if (!isOpen) return null

  function toInch(val: string) {
    // Convert "80–84" format
    return val.replace(/(\d+(\.\d+)?)/g, (m) => (parseFloat(m) / 2.54).toFixed(1))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="font-bold text-gray-900">📏 Size Guide</h2>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{guideKey}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Unit toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
                {(['cm', 'inch'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      unit === u ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <button onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                ✕
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: `${primaryColor}15` }}>
                    {guide.columns.map((col) => (
                      <th key={col}
                        className="text-left px-4 py-3 text-xs font-bold text-gray-700 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((row, idx) => (
                    <tr key={row.size}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-bold text-gray-900">{row.size}</td>
                      {row.measurements.map((m, i) => (
                        <td key={i} className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {unit === 'inch' && guideKey !== 'footwear' ? toInch(m) : m}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {guide.note && (
              <div className="flex gap-2 mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <span className="text-blue-400 shrink-0">ℹ️</span>
                <p className="text-blue-700 text-xs leading-relaxed">{guide.note}</p>
              </div>
            )}

            <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-gray-700">📌 How to measure yourself</p>
              <ul className="text-xs text-gray-500 space-y-1 list-none">
                <li>• <strong>Chest:</strong> Measure around the fullest part of your chest</li>
                <li>• <strong>Waist:</strong> Measure around your natural waistline</li>
                <li>• <strong>Hip:</strong> Measure around the fullest part of your hips</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
