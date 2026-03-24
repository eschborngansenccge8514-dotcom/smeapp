import { createSupabaseServer } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/admin/settings/SettingsForm'

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServer()
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('*')
    .order('key')

  const settingsMap = Object.fromEntries(
    (settings ?? []).map(({ key, value, description }) => [key, { value, description }])
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Changes take effect immediately</p>
      </div>
      <SettingsForm settings={settingsMap} />
    </div>
  )
}
