'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  storeId: string
  primaryColor: string
}

export function NotificationSettings({ storeId, primaryColor }: Props) {
  const [prefs, setPrefs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPrefs() {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('store_id', storeId)
        .single()
      if (data) setPrefs(data)
      setLoading(false)
    }
    fetchPrefs()
  }, [storeId, supabase])

  async function updatePref(field: string, val: any) {
    setPrefs((p: any) => ({ ...p, [field]: val }))
    setSaving(true)
    await supabase
      .from('notification_preferences')
      .upsert({ store_id: storeId, [field]: val })
    setSaving(false)
  }

  if (loading) return <div className="h-40 bg-gray-50 animate-pulse rounded-2xl" />

  const Toggle = ({ field, label }: { field: string; label: string }) => (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0 group hover:px-2 transition-all">
      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-0.5">{label}</h4>
        <p className="text-xs text-gray-500 font-medium">Receive alerts for this event type</p>
      </div>
      <button
        onClick={() => updatePref(field, !prefs?.[field])}
        className={`w-11 h-6 rounded-full relative transition-all shadow-sm ${
          prefs?.[field] ? 'bg-opacity-100' : 'bg-gray-200'
        }`}
        style={prefs?.[field] ? { backgroundColor: primaryColor } : {}}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all shadow-md transform ${
            prefs?.[field] ? 'translate-x-5 scale-105' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100/50 shadow-sm overflow-hidden overflow-hidden overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm">Alert Preferences</h3>
        {saving && <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 animate-pulse">Auto-saving...</span>}
      </div>
      
      <div className="p-1.5 flex flex-col">
        <div className="p-3.5 space-y-1">
          <Toggle field="new_order_push"  label="🛒 New Orders" />
          <Toggle field="low_stock_push"  label="⚠️ Low Stock" />
          <Toggle field="payment_push"    label="💰 Payment Success" />
          <Toggle field="new_review_push" label="⭐ New Reviews" />
        </div>

        <div className="mt-4 px-5 py-4 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quiet Hours</h4>
          <div className="flex items-center gap-4">
             <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-gray-700">Enable Quiet Mode</p>
                <p className="text-[11px] text-gray-500 font-medium leading-normal">Mute push notifications during your non-working hours</p>
             </div>
             <button
                onClick={() => updatePref('quiet_hours_enabled', !prefs?.quiet_hours_enabled)}
                className={`w-9 h-5 rounded-full relative transition-all ${
                  prefs?.quiet_hours_enabled ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all ${prefs?.quiet_hours_enabled ? 'translate-x-4' : ''}`} />
              </button>
          </div>
        </div>
      </div>
    </div>
  )
}
