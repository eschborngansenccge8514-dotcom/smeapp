'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

const SETTING_LABELS: Record<string, string> = {
  service_fee_percent:    'Service Fee (%)',
  delivery_threshold_km:  'Lalamove/EasyParcel Threshold (km)',
  min_order_amount:       'Minimum Order Amount (RM)',
  commission_rate:        'Merchant Commission Rate (%)',
  maintenance_mode:       'Maintenance Mode',
}

export function SettingsForm({ settings }: { settings: Record<string, { value: string; description: string }> }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, v.value]))
  )
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const updates = Object.entries(values).map(([key, value]) =>
      supabase
        .from('platform_settings')
        .update({ value, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('key', key)
    )

    const results = await Promise.all(updates)
    const hasError = results.some(({ error }) => error)

    if (hasError) {
      toast.error('Some settings failed to save')
    } else {
      toast.success('Settings saved')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {SETTING_LABELS[key] ?? key}
          </label>
          {key === 'maintenance_mode' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setValues((v) => ({ ...v, [key]: v[key] === 'true' ? 'false' : 'true' }))}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors
                  ${value === 'true' ? 'bg-red-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5
                  ${value === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
              <span className={`text-sm font-medium ${value === 'true' ? 'text-red-600' : 'text-gray-500'}`}>
                {value === 'true' ? 'ON — App is in maintenance' : 'OFF — App is live'}
              </span>
            </div>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          )}
          <p className="text-xs text-gray-400 mt-1">
            {settings[key]?.description}
          </p>
        </div>
      ))}
      <button
        onClick={save}
        disabled={loading}
        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        <Save size={15} />
        {loading ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}
