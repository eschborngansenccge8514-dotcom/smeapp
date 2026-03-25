'use client'

import { useState } from 'react'
import { SEED_DATA } from './data'
import { seedProducts } from './actions'
import { toast } from 'sonner'
import { Loader2, Plus, CheckCircle2, Info } from 'lucide-react'

export default function SeedPage() {
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, number>>({})

  const handleSeed = async (category: string) => {
    setLoadingCategory(category)
    try {
      const result = await seedProducts(category)
      if (result.error) {
        toast.error(`Error: ${result.error}`)
      } else {
        toast.success(`Successfully seeded ${result.count} products into a ${category} store.`)
        setResults(prev => ({ ...prev, [category]: (prev[category] || 0) + (result.count || 0) }))
      }
    } catch (err) {
      toast.error('An unexpected error occurred.')
    } finally {
      setLoadingCategory(null)
    }
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-10 px-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
          <span className="bg-indigo-600 text-white p-2 rounded-xl">🛠️</span>
          Seed Utility
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Instantly populate the marketplace with premium, hand-picked products for any industry to test themes and UI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Object.entries(SEED_DATA).map(([category, products]) => (
          <div 
            key={category} 
            className="group relative flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden"
          >
            <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-gray-50 p-3 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                  <span className="text-3xl">{category.split(' ')[0]}</span>
                </div>
                {results[category] && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100 animate-in fade-in zoom-in">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    SEEDED: {results[category]} items
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {category.split(' ').slice(1).join(' ')}
              </h2>
              
              <ul className="flex-1 space-y-3 mb-8">
                {products.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span className="truncate">{p.name}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSeed(category)}
                disabled={loadingCategory !== null}
                className={`
                  w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all
                  ${results[category] 
                    ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {loadingCategory === category ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                {results[category] ? 'Seed More' : 'Generate Products'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-900 text-white rounded-[2rem] p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md border border-white/30">
            <Info className="h-10 w-10 text-indigo-100" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-3">Intelligent Auto-Seeding</h3>
            <p className="text-indigo-100 leading-relaxed text-lg opacity-90">
              The utility automatically handles store orchestration. If a store matching the category exists, products are injected directly. Otherwise, it generates a fresh demo store with configured brand colors and active inventory settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
