'use client'
import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

export function AnnouncementForm() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetRole, setTargetRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Save to announcements table
    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: body.trim(),
      target_role: targetRole,
      sent_by: user?.id,
      sent_at: new Date().toISOString(),
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // 2. Fire Edge Function to send push notifications
    await supabase.functions.invoke('send-broadcast', {
      body: { title, body, target_role: targetRole },
    })

    toast.success('Announcement sent!')
    setTitle('')
    setBody('')
    setTargetRole(null)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-bold text-base mb-4">Send Announcement</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. Platform Maintenance Tonight"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Write your announcement..."
          />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Send To</label>
            <select
              value={targetRole ?? ''}
              onChange={(e) => setTargetRole(e.target.value || null)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Users</option>
              <option value="customer">Customers Only</option>
              <option value="merchant">Merchants Only</option>
            </select>
          </div>
          <button
            onClick={send}
            disabled={loading}
            className="mt-5 flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send size={15} />
            {loading ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  )
}
