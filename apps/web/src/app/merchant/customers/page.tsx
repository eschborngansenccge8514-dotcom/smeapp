'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CrmContactTable } from '@/components/dashboard/crm/CrmContactTable'
import { CrmContactDrawer } from '@/components/dashboard/crm/CrmContactDrawer'
import { CrmSegmentBuilder } from '@/components/dashboard/crm/CrmSegmentBuilder'
import { useDashboardStore } from '@/hooks/useDashboardStore'
import type { CrmContact } from '@/components/dashboard/crm/types'

const CRM_STATS = (contacts: CrmContact[]) => [
  {
    label: 'Total Customers',
    value: contacts.length,
    icon: '👥',
    color: '#3B82F6',
    bg: '#EFF6FF',
    sub: `${contacts.filter((c) => c.segment === 'new').length} new this month`,
  },
  {
    label: 'VIP Customers',
    value: contacts.filter((c) => c.segment === 'vip').length,
    icon: '👑',
    color: '#F59E0B',
    bg: '#FFFBEB',
    sub: 'Highest lifetime value',
  },
  {
    label: 'At Risk',
    value: contacts.filter((c) => c.segment === 'at_risk').length,
    icon: '⚠️',
    color: '#EF4444',
    bg: '#FEF2F2',
    sub: 'Need re-engagement',
  },
  {
    label: 'Subscribed',
    value: contacts.filter((c) => c.is_subscribed).length,
    icon: '📬',
    color: '#10B981',
    bg: '#ECFDF5',
    sub: `${Math.round((contacts.filter((c) => c.is_subscribed).length / Math.max(contacts.length, 1)) * 100)}% opt-in rate`,
  },
]

export default function MerchantCustomersPage() {
  const { store, primaryColor } = useDashboardStore()
  const [contacts, setContacts]     = useState<CrmContact[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<CrmContact | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [view, setView]             = useState<'contacts' | 'segments'>('contacts')
  const supabase = createClient()

  const fetchContacts = useCallback(async () => {
    if (!store?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('store_id', store.id)
      .order('last_order_at', { ascending: false })
    setContacts((data as any) ?? [])
    setLoading(false)
  }, [store?.id, supabase])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const stats = CRM_STATS(contacts)

  if (!store) return <div className="p-8 animate-pulse bg-gray-50 rounded-[40px] h-[600px]" />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              👥 Customer CRM
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage relationships, segments, and customer history
            </p>
          </div>
          <div className="flex gap-2">
            {(['contacts', 'segments'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all capitalize ${
                  view === v ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={view === v ? { backgroundColor: primaryColor } : {}}
              >
                {v === 'contacts' ? '👥 Contacts' : '🎯 Segments'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ backgroundColor: s.bg }}
                >
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
        {view === 'contacts' ? (
          <CrmContactTable
            contacts={contacts}
            loading={loading}
            primaryColor={primaryColor}
            onSelectContact={setSelected}
            selectedIds={selectedIds}
            onToggleSelect={toggleId}
            onBulkEmail={(ids) => {
              /* Navigate to email marketing with pre-filled recipients */
              window.location.href = `/merchant/email-marketing?contacts=${ids.join(',')}`
            }}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              🎯 Build a New Segment
            </h2>
            <CrmSegmentBuilder
              storeId={store.id}
              primaryColor={primaryColor}
              onSaved={fetchContacts}
            />
          </div>
        )}
      </div>

      {/* Contact detail drawer */}
      <CrmContactDrawer
        contact={selected}
        primaryColor={primaryColor}
        storeId={store.id}
        onClose={() => setSelected(null)}
        onEmailContact={(c) => {
          window.location.href = `/merchant/email-marketing?contact=${c.id}`
        }}
      />
    </div>
  )
}
