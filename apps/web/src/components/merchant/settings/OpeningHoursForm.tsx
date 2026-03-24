'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export function OpeningHoursForm({ storeId, hours }: { storeId: string; hours: any[] }) {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [schedule, setSchedule] = useState(
    DAYS.map((_, i) => {
      const h = hours.find((hh) => hh.day_of_week === i)
      return {
        day_of_week: i,
        is_closed: h?.is_closed ?? i === 0,
        open_time: h?.open_time ?? '09:00',
        close_time: h?.close_time ?? '22:00',
      }
    })
  )
  const [loading, setLoading] = useState(false)

  function update(dayIndex: number, key: string, value: any) {
    setSchedule((s) => s.map((d, i) => i === dayIndex ? { ...d, [key]: value } : d))
  }

  async function save() {
    setLoading(true)
    await supabase.from('store_hours').delete().eq('store_id', storeId)
    const { error } = await supabase.from('store_hours').insert(
      schedule.map((d) => ({ ...d, store_id: storeId }))
    )
    if (error) toast.error(error.message)
    else { toast.success('Opening hours saved'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="font-bold text-base mb-4">Opening Hours</h3>
      <div className="space-y-3">
        {schedule.map((day, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 w-24">{DAYS[i]}</span>
            <button
              onClick={() => update(i, 'is_closed', !day.is_closed)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors
                ${!day.is_closed ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5
                ${!day.is_closed ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            {!day.is_closed ? (
              <div className="flex items-center gap-2">
                <input type="time" value={day.open_time}
                  onChange={(e) => update(i, 'open_time', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <span className="text-gray-400 text-sm">–</span>
                <input type="time" value={day.close_time}
                  onChange={(e) => update(i, 'close_time', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Closed</span>
            )}
          </div>
        ))}
      </div>
      <button onClick={save} disabled={loading}
        className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
        {loading ? 'Saving...' : 'Save Hours'}
      </button>
    </div>
  )
}
