'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow, format } from 'date-fns'
import type { CrmContact } from './types'

interface Activity {
  id: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, any>
  created_at: string
}

interface Props {
  contact: CrmContact | null
  primaryColor: string
  onClose: () => void
  onEmailContact: (contact: CrmContact) => void
  storeId: string
}

const ACTIVITY_ICONS: Record<string, string> = {
  order: '🛒', email_sent: '✉️', email_opened: '👁️',
  note: '📝', refund: '↩️', review: '⭐', call: '📞',
}

export function CrmContactDrawer({ contact, primaryColor, onClose, onEmailContact, storeId }: Props) {
  const [activities, setActivities]   = useState<Activity[]>([])
  const [loading, setLoading]         = useState(false)
  const [note, setNote]               = useState('')
  const [addingNote, setAddingNote]   = useState(false)
  const [tag, setTag]                 = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (!contact) return
    setLoading(true)
    supabase
      .from('crm_activities')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setActivities((data as any) ?? []); setLoading(false) })
  }, [contact?.id, supabase])

  if (!contact) return null

  async function addNote() {
    if (!note.trim()) return
    setAddingNote(true)
    const { data: act } = await supabase
      .from('crm_activities')
      .insert({
        store_id: storeId,
        contact_id: contact!.id,
        type: 'note',
        title: 'Note added',
        body: note.trim(),
      })
      .select().single()
    if (act) setActivities((prev) => [act as any, ...prev])
    setNote('')
    setAddingNote(false)
  }

  async function addTag() {
    if (!tag.trim()) return
    const newTags = [...(contact!.tags ?? []), tag.trim()]
    await supabase.from('crm_contacts').update({ tags: newTags }).eq('id', contact!.id)
    setTag('')
    // Note: In a real app, you'd probably want to refresh the contact data in the parent or use a subscription
  }

  async function toggleSubscribed() {
    await supabase
      .from('crm_contacts')
      .update({ is_subscribed: !contact!.is_subscribed })
      .eq('id', contact!.id)
  }

  const statsCards = [
    { label: 'Total Orders', value: contact.total_orders, icon: '🛒' },
    { label: 'Total Spent', value: `RM ${(contact.total_spent ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: '💰' },
    { label: 'Avg Order', value: `RM ${(contact.avg_order_value ?? 0).toFixed(2)}`, icon: '📊' },
    {
      label: 'Customer Since',
      value: contact.first_order_at ? format(new Date(contact.first_order_at), 'MMM yyyy') : '—',
      icon: '📅',
    },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div
          className="px-5 py-4 shrink-0"
          style={{ background: `linear-gradient(135deg, #0f172a, ${primaryColor})` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                {contact.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white text-base">{contact.full_name}</p>
                <p className="text-xs text-white/60 mt-0.5">{contact.email ?? contact.phone ?? '—'}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20">
              ✕
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onEmailContact(contact)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
            >
              ✉️ Send Email
            </button>
            <button
              onClick={toggleSubscribed}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                contact.is_subscribed
                  ? 'bg-white/15 text-white hover:bg-white/25'
                  : 'bg-red-500/30 text-red-200 hover:bg-red-500/40'
              }`}
            >
              {contact.is_subscribed ? '📬 Subscribed' : '🚫 Unsubscribed'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {statsCards.map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                <p className="text-xs text-gray-400">{s.icon} {s.label}</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(contact.tags ?? []).map((tag) => (
                <span key={tag}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: primaryColor }}>
                  {tag}
                </span>
              ))}
              {(contact.tags ?? []).length === 0 && (
                <span className="text-xs text-gray-400">No tags yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tag…"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400"
                style={{ '--tw-ring-color': primaryColor } as any}
              />
              <button
                onClick={addTag}
                className="text-xs font-bold px-3 py-2 rounded-xl text-white outline-none active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Add note */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Add Note</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a private note about this customer…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 resize-none font-medium"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
            <button
              onClick={addNote}
              disabled={addingNote || !note.trim()}
              className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-all font-bold"
            >
              {addingNote ? 'Saving…' : 'Save Note'}
            </button>
          </div>

          {/* Activity timeline */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">History</p>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-100 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-2.5 bg-gray-50 rounded w-full" />
                    </div>
                  </div>
                ))
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-1">📋</p>
                  <p className="text-xs text-gray-400">No activities found</p>
                </div>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-xs shrink-0 border border-gray-100 shadow-sm">
                      {ACTIVITY_ICONS[a.type] ?? '❓'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900">{a.title}</p>
                      {a.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-3">{a.body}</p>}
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">
                         {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
