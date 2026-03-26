'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { 
  Trophy, Settings, Coins, Calendar, Percent, 
  Plus, Trash2, GripVertical, Save, Info,
  Search, ShieldCheck, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoyaltyProgram {
  id: string
  store_id: string
  is_enabled: boolean
  base_points_per_myr: number
  min_order_amount_myr: number
  point_expiry_months: number | null
  max_redeem_pct: number
  currency_code: string
  points_per_myr_redeem: number
}

interface Tier {
  id: string
  store_id: string
  sort_order: number
  name: string
  description: string | null
  color: string | null
  icon: string | null
  qualifier_type: 'points' | 'lifetime_spend'
  threshold_value: number
  multiplier: number
  benefits: any
}

export function LoyaltySettingsForm({ 
  storeId, 
  initialProgram, 
  initialTiers 
}: { 
  storeId: string, 
  initialProgram: LoyaltyProgram, 
  initialTiers: Tier[] 
}) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'settings' | 'tiers'>('settings')
  const [program, setProgram] = useState<LoyaltyProgram>(initialProgram)
  const [tiers, setTiers] = useState<Tier[]>(initialTiers)
  const [loading, setLoading] = useState(false)

  // Handlers for Program
  function updateProgram(key: keyof LoyaltyProgram, value: any) {
    setProgram(prev => ({ ...prev, [key]: value }))
  }

  async function saveProgram() {
    setLoading(true)
    const { error } = await supabase
      .from('loyalty_programs')
      .update({
        is_enabled: program.is_enabled,
        base_points_per_myr: program.base_points_per_myr,
        min_order_amount_myr: program.min_order_amount_myr,
        point_expiry_months: program.point_expiry_months || null,
        max_redeem_pct: program.max_redeem_pct,
        points_per_myr_redeem: program.points_per_myr_redeem
      })
      .eq('id', program.id)

    if (error) {
      toast.error('Failed to save program settings')
      console.error(error)
    } else {
      toast.success('Program settings saved')
      router.refresh()
    }
    setLoading(false)
  }

  // Handlers for Tiers
  async function addTier() {
    const newTier: Partial<Tier> = {
      store_id: storeId,
      name: 'New Tier',
      sort_order: tiers.length,
      qualifier_type: 'points',
      threshold_value: 0,
      multiplier: 1.0,
      color: '#6366F1'
    }

    const { data, error } = await supabase
      .from('loyalty_tiers')
      .insert(newTier)
      .select()
      .single()

    if (error) {
      toast.error('Failed to add tier')
    } else {
      setTiers([...tiers, data])
      toast.success('Tier added')
    }
  }

  async function deleteTier(id: string) {
    if (!confirm('Are you sure you want to delete this tier? Customers assigned to this tier will lose their status.')) return
    
    const { error } = await supabase
      .from('loyalty_tiers')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete tier')
    } else {
      setTiers(tiers.filter(t => t.id !== id))
      toast.success('Tier deleted')
    }
  }

  function handleTierChange(id: string, updates: Partial<Tier>) {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function updateTier(id: string, updates: Partial<Tier>) {
    const { error } = await supabase
      .from('loyalty_tiers')
      .update(updates)
      .eq('id', id)

    if (error) {
      toast.error('Failed to update tier')
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 max-w-sm">
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === 'settings' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          General Settings
        </button>
        <button 
          onClick={() => setActiveTab('tiers')}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === 'tiers' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          Membership Tiers
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Program Status</h3>
                  <p className="text-sm text-gray-500">Enable or disable your loyalty program globally</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={program.is_enabled} 
                  onChange={(e) => updateProgram('is_enabled', e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", !program.is_enabled && "opacity-50 pointer-events-none")}>
              {/* Earn Rates */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Coins size={18} className="text-amber-500" />
                  Earning Points
                </h4>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Base Earn Rate (Points per RM 1)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={program.base_points_per_myr} 
                      onChange={(e) => updateProgram('base_points_per_myr', parseFloat(e.target.value))} 
                      className="w-full border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-indigo-300 transition-shadow outline-none"
                    />
                    <div className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">PTS/RM</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Min Order Amount (RM)</label>
                  <input 
                    type="number" 
                    value={program.min_order_amount_myr} 
                    onChange={(e) => updateProgram('min_order_amount_myr', parseFloat(e.target.value))} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Points Expiry (Months)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={program.point_expiry_months || ''} 
                      onChange={(e) => updateProgram('point_expiry_months', e.target.value ? parseInt(e.target.value) : null)} 
                      className="w-full border border-gray-200 rounded-lg pl-3 pr-16 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                      placeholder="Never expires"
                    />
                    <div className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold uppercase">Months</div>
                  </div>
                </div>
              </div>

              {/* Redemption Rates */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Zap size={18} className="text-indigo-500" />
                  Redeeming Points
                </h4>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Redemption Conversion (Points per RM 1)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={program.points_per_myr_redeem} 
                      onChange={(e) => updateProgram('points_per_myr_redeem', parseInt(e.target.value))} 
                      className="w-full border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                    />
                    <div className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">PTS/RM</div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 italic">Example: 100 points = RM 1 discount</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Max Discount per Order (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={program.max_redeem_pct} 
                      onChange={(e) => updateProgram('max_redeem_pct', parseFloat(e.target.value))} 
                      className="w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                    />
                    <div className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">%</div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 italic">Limits how much of the order subtotal can be covered by points.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button 
                onClick={saveProgram} 
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Membership Tiers</h3>
            <button 
              onClick={addTier}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
            >
              <Plus size={18} />
              Add Tier
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tiers.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Trophy size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No tiers created yet.</p>
                <p className="text-xs text-gray-400">Add tiers like Bronze, Silver, Gold to reward loyal customers.</p>
              </div>
            )}
            
            {tiers.map((tier, idx) => (
              <div key={tier.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 group">
                <div className="flex items-start gap-4">
                  <div className="mt-2 text-gray-300 group-hover:text-gray-400 transition-colors cursor-move">
                    <GripVertical size={20} />
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Tier Name</label>
                      <input 
                        type="text" 
                        value={tier.name}
                        onChange={(e) => handleTierChange(tier.id, { name: e.target.value })}
                        onBlur={(e) => updateTier(tier.id, { name: e.target.value })}
                        className="w-full border-b border-gray-100 focus:border-indigo-500 py-1 font-bold text-gray-900 outline-none transition-colors"
                        placeholder="e.g. Gold VIP"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Threshold Type</label>
                      <select 
                         value={tier.qualifier_type}
                         onChange={(e) => updateTier(tier.id, { qualifier_type: e.target.value as any })}
                         className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                      >
                         <option value="points">Total Points</option>
                         <option value="lifetime_spend">Lifetime Spend (RM)</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Threshold Value</label>
                      <input 
                        type="number" 
                        value={tier.threshold_value}
                        onChange={(e) => handleTierChange(tier.id, { threshold_value: parseFloat(e.target.value) })}
                        onBlur={(e) => updateTier(tier.id, { threshold_value: parseFloat(e.target.value) })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                        placeholder="0"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Points Multiplier</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.1"
                          value={tier.multiplier}
                          onChange={(e) => handleTierChange(tier.id, { multiplier: parseFloat(e.target.value) })}
                          onBlur={(e) => updateTier(tier.id, { multiplier: parseFloat(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg pl-2 pr-6 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <div className="absolute right-2 top-1.5 text-[10px] font-bold text-gray-400">X</div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => deleteTier(tier.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
