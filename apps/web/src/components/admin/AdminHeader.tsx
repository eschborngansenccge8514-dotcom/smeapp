import { Bell } from 'lucide-react'

export function AdminHeader({ admin }: { admin: any }) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-gray-50">
          <Bell size={20} className="text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {admin?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">{admin?.full_name}</span>
        </div>
      </div>
    </header>
  )
}
