import { createSupabaseServer } from '@/lib/supabase/server'
import { AnnouncementForm } from '@/components/admin/announcements/AnnouncementForm'
import { formatDate } from '@/lib/date'

export default async function AnnouncementsPage() {
  const supabase = await createSupabaseServer()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>

      <AnnouncementForm />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Target</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Sent By</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {announcements?.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.body}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    a.target_role === null ? 'bg-indigo-100 text-indigo-700' :
                    a.target_role === 'merchant' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {a.target_role === null ? 'All Users' : a.target_role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{a.profiles?.full_name}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
