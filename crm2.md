<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# continue

Continuing from `CrmSegmentBuilder` where it left off:

```tsx
  function updateCondition(i: number, updates: Partial<Condition>) {
    setConditions((p) => p.map((c, idx) => idx === i ? { ...c, ...updates } : c))
  }

  async function preview() {
    // Build a count query based on conditions
    let query = supabase
      .from('crm_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    conditions.forEach((cond) => {
      const val = cond.value
      if (val === '' || val === null) return
      switch (cond.operator) {
        case 'gt':  query = query.gt(cond.field, val); break
        case 'gte': query = query.gte(cond.field, val); break
        case 'lt':  query = query.lt(cond.field, val); break
        case 'lte': query = query.lte(cond.field, val); break
        case 'eq':  query = query.eq(cond.field, val); break
        case 'contains': query = query.ilike(cond.field, `%${val}%`); break
      }
    })

    const { count } = await query
    setPreviewCount(count ?? 0)
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('crm_segments').insert({
      store_id: storeId,
      name: name.trim(),
      conditions,
      contact_count: previewCount ?? 0,
      is_dynamic: true,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-5">
      {/* Segment name */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
          Segment Name *
        </label>
        <input
          type="text"
          placeholder="e.g. High-Value Customers, 90-Day Inactive"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400"
          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        />
      </div>

      {/* Logic operator */}
      <div className="flex items-center gap-3">
        <p className="text-xs font-bold text-gray-600">Match</p>
        {(['AND', 'OR'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLogic(l)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
              logic === l ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
            style={logic === l ? { backgroundColor: primaryColor } : {}}
          >
            {l}
          </button>
        ))}
        <p className="text-xs text-gray-400">of the following conditions</p>
      </div>

      {/* Conditions */}
      <div className="space-y-2.5">
        {conditions.map((cond, i) => {
          const fieldDef = FIELDS.find((f) => f.value === cond.field)!
          const ops = OPERATORS[fieldDef.type] ?? []

          return (
            <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-2xl px-3 py-3 border border-gray-100">
              {/* Field */}
              <select
                value={cond.field}
                onChange={(e) => updateCondition(i, {
                  field: e.target.value,
                  operator: OPERATORS[FIELDS.find((f) => f.value === e.target.value)?.type ?? 'number'][^0].value,
                  value: '',
                })}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white text-gray-800"
              >
                {FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value as Operator })}
                className="w-20 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none bg-white text-gray-800"
              >
                {ops.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Value */}
              {fieldDef.type === 'boolean' ? (
                <select
                  value={String(cond.value)}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="w-24 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none bg-white text-gray-800"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : fieldDef.type === 'select' ? (
                <select
                  value={String(cond.value)}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="w-28 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:outline-none bg-white text-gray-800"
                >
                  {fieldDef.options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={fieldDef.type === 'number' ? 'number' : 'text'}
                  value={String(cond.value)}
                  onChange={(e) => updateCondition(i, { value: fieldDef.type === 'number' ? +e.target.value : e.target.value })}
                  placeholder="Value"
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white text-gray-900 placeholder-gray-400"
                />
              )}

              {/* Remove */}
              <button
                onClick={() => removeCondition(i)}
                disabled={conditions.length === 1}
                className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30 font-bold"
              >
                ✕
              </button>
            </div>
          )
        })}

        <button
          onClick={addCondition}
          className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
        >
          + Add Condition
        </button>
      </div>

      {/* Preview count */}
      {previewCount !== null && (
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}25` }}
        >
          <span className="text-xl">👥</span>
          <div>
            <p className="text-sm font-bold" style={{ color: primaryColor }}>
              {previewCount} contact{previewCount !== 1 ? 's' : ''} match this segment
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              This segment will update dynamically as customer data changes.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={preview}
          className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-700 hover:border-gray-300 transition-all"
        >
          👁️ Preview Audience
        </button>
        <button
          onClick={save}
          disabled={!name.trim() || saving}
          className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 shadow-md"
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? 'Saving…' : '💾 Save Segment'}
        </button>
      </div>
    </div>
  )
}
```


***

## 14. CRM Dashboard Page

**`apps/web/src/app/dashboard/crm/page.tsx`**:

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CrmContactTable } from '@/components/dashboard/crm/CrmContactTable'
import { CrmContactDrawer } from '@/components/dashboard/crm/CrmContactDrawer'
import { CrmSegmentBuilder } from '@/components/dashboard/crm/CrmSegmentBuilder'
import { useDashboardStore } from '@/hooks/useDashboardStore'

export interface CrmContact {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  tags: string[]
  segment: string | null
  total_orders: number
  total_spent: number
  avg_order_value: number
  last_order_at: string | null
  first_order_at: string | null
  is_subscribed: boolean
  is_blocked: boolean
  notes: string | null
}

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

export default function CrmPage() {
  const { store, primaryColor } = useDashboardStore()
  const [contacts, setContacts]     = useState<CrmContact[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<CrmContact | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [view, setView]             = useState<'contacts' | 'segments'>('contacts')
  const supabase = createClient()

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('store_id', store.id)
      .order('last_order_at', { ascending: false })
    setContacts(data ?? [])
    setLoading(false)
  }, [store.id])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const stats = CRM_STATS(contacts)

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
              /* Navigate to email composer with pre-filled recipients */
              window.location.href = `/dashboard/email?contacts=${ids.join(',')}`
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
          window.location.href = `/dashboard/email?contact=${c.id}`
        }}
      />
    </div>
  )
}
```


***

## 15. Email Dashboard Page

**`apps/web/src/app/dashboard/email/page.tsx`**:

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmailComposer } from '@/components/dashboard/email/EmailComposer'
import { useDashboardStore } from '@/hooks/useDashboardStore'
import { formatDistanceToNow } from 'date-fns'

interface Campaign {
  id: string
  name: string
  subject: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  total_recipients: number
  sent_count: number
  open_count: number
  click_count: number
  bounce_count: number
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: '#6B7280', bg: '#F3F4F6', icon: '📝' },
  scheduled: { label: 'Scheduled', color: '#3B82F6', bg: '#EFF6FF', icon: '⏰' },
  sending:   { label: 'Sending',   color: '#F59E0B', bg: '#FFFBEB', icon: '📤' },
  sent:      { label: 'Sent',      color: '#10B981', bg: '#ECFDF5', icon: '✅' },
  failed:    { label: 'Failed',    color: '#EF4444', bg: '#FEF2F2', icon: '❌' },
}

export default function EmailPage() {
  const { store, primaryColor } = useDashboardStore()
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<'list' | 'compose'>('list')
  const supabase = createClient()

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
    setCampaigns(data ?? [])
    setLoading(false)
  }, [store.id])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const sentCampaigns = campaigns.filter((c) => c.status === 'sent')
  const totalSent     = sentCampaigns.reduce((sum, c) => sum + (c.sent_count ?? 0), 0)
  const avgOpenRate   = sentCampaigns.length
    ? Math.round(
        sentCampaigns.reduce((sum, c) => sum + (c.sent_count ? c.open_count / c.sent_count : 0), 0) /
        sentCampaigns.length * 100
      )
    : 0
  const avgClickRate  = sentCampaigns.length
    ? Math.round(
        sentCampaigns.reduce((sum, c) => sum + (c.sent_count ? c.click_count / c.sent_count : 0), 0) /
        sentCampaigns.length * 100
      )
    : 0

  const emailStats = [
    { label: 'Total Sent',  value: totalSent.toLocaleString(), icon: '📤', color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Avg Open Rate',  value: `${avgOpenRate}%`, icon: '👁️', color: '#10B981', bg: '#ECFDF5' },
    { label: 'Avg Click Rate', value: `${avgClickRate}%`, icon: '🖱️', color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Campaigns',   value: campaigns.length, icon: '📋', color: '#F59E0B', bg: '#FFFBEB' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              ✉️ Email Campaigns
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create and send targeted emails to your customers
            </p>
          </div>
          <button
            onClick={() => setView(view === 'compose' ? 'list' : 'compose')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            {view === 'compose' ? '← Back to Campaigns' : '✏️ New Campaign'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {emailStats.map((s) => (
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
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Compose view */}
        {view === 'compose' && (
          <EmailComposer
            storeId={store.id}
            primaryColor={primaryColor}
            storeName={store.name}
            storeEmail={store.contact_email ?? `noreply@${store.slug}.myapp.com`}
            onSaved={() => { setView('list'); fetchCampaigns() }}
          />
        )}

        {/* Campaign list */}
        {view === 'list' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">All Campaigns</h2>
            </div>
            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-5 py-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                    <div className="flex gap-6">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="space-y-1 text-right">
                          <div className="h-3 bg-gray-200 rounded w-10 ml-auto" />
                          <div className="h-2.5 bg-gray-100 rounded w-8 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✉️</p>
                <p className="font-bold text-gray-900">No campaigns yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first email campaign to reach customers.</p>
                <button
                  onClick={() => setView('compose')}
                  className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {campaigns.map((c) => {
                  const cfg = STATUS_CONFIG[c.status]
                  const openRate  = c.sent_count ? Math.round((c.open_count / c.sent_count) * 100) : 0
                  const clickRate = c.sent_count ? Math.round((c.click_count / c.sent_count) * 100) : 0
                  const bounceRate = c.sent_count ? Math.round((c.bounce_count / c.sent_count) * 100) : 0

                  return (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        {cfg.icon}
                      </div>

                      {/* Name + subject */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{c.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {c.sent_at
                              ? formatDistanceToNow(new Date(c.sent_at), { addSuffix: true })
                              : c.scheduled_at
                              ? `Scheduled ${formatDistanceToNow(new Date(c.scheduled_at), { addSuffix: true })}`
                              : formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Stats (only for sent) */}
                      {c.status === 'sent' && (
                        <div className="hidden sm:flex gap-6 text-right shrink-0">
                          <div>
                            <p className="text-xs text-gray-400">Recipients</p>
                            <p className="text-sm font-bold text-gray-900">{c.sent_count.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Open Rate</p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: openRate >= 20 ? '#10B981' : openRate >= 10 ? '#F59E0B' : '#EF4444' }}
                            >
                              {openRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Click Rate</p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: clickRate >= 3 ? '#10B981' : clickRate >= 1 ? '#F59E0B' : '#6B7280' }}
                            >
                              {clickRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Bounce</p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: bounceRate <= 2 ? '#10B981' : '#EF4444' }}
                            >
                              {bounceRate}%
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Sending progress bar */}
                      {c.status === 'sending' && (
                        <div className="hidden sm:block w-32">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{c.sent_count}</span>
                            <span>{c.total_recipients}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                backgroundColor: primaryColor,
                                width: `${c.total_recipients ? (c.sent_count / c.total_recipients) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Draft actions */}
                      {c.status === 'draft' && (
                        <button
                          onClick={() => setView('compose')}
                          className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition-all opacity-0 group-hover:opacity-100"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```


***

## 16. Notification Dashboard Page

**`apps/web/src/app/dashboard/notifications/page.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/dashboard/notifications/NotificationItem'
import { NotificationSettings } from '@/components/dashboard/notifications/NotificationSettings'
import { useDashboardStore } from '@/hooks/useDashboardStore'

const TABS = [
  { value: 'all',      label: 'All',      icon: '🔔' },
  { value: 'new_order',label: 'Orders',   icon: '🛒' },
  { value: 'low_stock',label: 'Stock',    icon: '⚠️' },
  { value: 'payment',  label: 'Payments', icon: '💰' },
  { value: 'review',   label: 'Reviews',  icon: '⭐' },
  { value: 'system',   label: 'System',   icon: '🔧' },
  { value: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function NotificationsPage() {
  const { store, primaryColor } = useDashboardStore()
  const [tab, setTab] = useState('all')
  const {
    notifications, loading, unreadCount,
    markAsRead, markAllAsRead, archiveNotification,
  } = useNotifications(store.id)

  const filtered = tab === 'all' || tab === 'settings'
    ? notifications
    : notifications.filter((n) => n.type === tab)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🔔 Notifications
              {unreadCount > 0 && (
                <span
                  className="text-sm font-bold px-2.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Stay on top of orders, stock, and customer activity
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-bold hover:underline"
              style={{ color: primaryColor }}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none mb-6 pb-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                tab === t.value ? 'text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={tab === t.value ? { backgroundColor: primaryColor } : {}}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.value !== 'settings' && t.value !== 'all' && (
                <span className={`rounded-full px-1.5 text-xs font-bold ${
                  tab === t.value ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {notifications.filter((n) => n.type === t.value && !n.is_read).length || ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'settings' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              ⚙️ Notification Preferences
            </h2>
            <NotificationSettings storeId={store.id} primaryColor={primaryColor} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3 px-5 py-4 animate-pulse">
                    <div className="w-9 h-9 bg-gray-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                      <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-3">🔔</p>
                <p className="font-bold text-gray-900">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No notifications in this category.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    primaryColor={primaryColor}
                    onClick={() => markAsRead(n.id)}
                    onArchive={() => archiveNotification(n.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```


***

## 17. Auto-trigger Notifications (Server-Side)

**`apps/web/src/lib/notifications.ts`** — call this from your order/stock webhooks:

```typescript
import { createServiceClient } from '@/lib/supabase/server'

type NotifType = 'new_order' | 'low_stock' | 'review' | 'payment' | 'system' | 'promo'

export async function createNotification({
  storeId, type, title, body, link, metadata = {},
}: {
  storeId: string
  type: NotifType
  title: string
  body?: string
  link?: string
  metadata?: Record<string, any>
}) {
  const supabase = createServiceClient()
  return supabase.from('merchant_notifications').insert({
    store_id: storeId, type, title, body, link, metadata,
  })
}

// ── Convenience helpers ──────────────────────────────────────────────────────

export async function notifyNewOrder(storeId: string, orderId: string, customerName: string, total: number) {
  return createNotification({
    storeId,
    type: 'new_order',
    title: `New order from ${customerName}`,
    body: `RM ${total.toFixed(2)} · Order #${orderId.slice(-6).toUpperCase()}`,
    link: `/dashboard/orders/${orderId}`,
    metadata: { order_id: orderId, total, customer_name: customerName },
  })
}

export async function notifyLowStock(storeId: string, productId: string, productName: string, qty: number) {
  return createNotification({
    storeId,
    type: 'low_stock',
    title: `Low stock: ${productName}`,
    body: `Only ${qty} unit${qty !== 1 ? 's' : ''} remaining. Restock soon to avoid lost sales.`,
    link: `/dashboard/products/${productId}`,
    metadata: { product_id: productId, qty },
  })
}

export async function notifyNewReview(storeId: string, productName: string, rating: number, reviewer: string) {
  return createNotification({
    storeId,
    type: 'review',
    title: `New ${rating}★ review on ${productName}`,
    body: `${reviewer} left a review.`,
    link: `/dashboard/reviews`,
    metadata: { rating, reviewer, product_name: productName },
  })
}

export async function notifyPayment(storeId: string, amount: number, paymentType: 'payout' | 'refund' | 'failed') {
  const labels = {
    payout:  { title: `Payout of RM ${amount.toFixed(2)} processed`, body: 'Funds will arrive in 1–3 business days.' },
    refund:  { title: `Refund of RM ${amount.toFixed(2)} issued`,    body: 'Customer has been refunded.' },
    failed:  { title: `Payment of RM ${amount.toFixed(2)} failed`,   body: 'Check your payment settings.' },
  }
  return createNotification({
    storeId,
    type: 'payment',
    ...labels[paymentType],
    link: `/dashboard/payments`,
    metadata: { amount, payment_type: paymentType },
  })
}
```


***

## 18. Wire Notification Bell into Dashboard Layout

**`apps/web/src/app/dashboard/layout.tsx`** — add the bell:

```tsx
import { NotificationBell } from '@/components/dashboard/notifications/NotificationBell'

// Inside your top bar JSX:
<div className="flex items-center gap-3">
  <NotificationBell storeId={store.id} primaryColor={primaryColor} />
  {/* ... other top bar items */}
</div>
```


***

## 19. Dashboard Sidebar Nav Entries

Add these three entries to your existing sidebar config:

```typescript
// apps/web/src/lib/dashboard/sidebar.ts — append to your nav items:

{ label: 'Notifications', href: '/dashboard/notifications', icon: '🔔', badge: 'unread_count' },
{ label: 'Email Campaigns', href: '/dashboard/email',         icon: '✉️' },
{ label: 'Customer CRM',    href: '/dashboard/crm',           icon: '👥' },
```


***

## 20. Required Environment Variables

Add these to your `.env.local`:

```bash
# Resend (email sending)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # needed for server-side notification triggers
```

Install the Resend package:[^1]

```bash
pnpm add resend date-fns
```


***

## Feature Summary

| Module | Features |
| :-- | :-- |
| **Notifications** | Supabase Realtime push, browser push API, per-type on/off toggles, quiet hours, archive, mark all read, bell badge |
| **Email** | Resend-powered sending, 5 HTML templates with live iframe preview, personalisation tags, schedule send, open/click/bounce tracking, draft saving |
| **CRM** | Auto-sync from orders trigger, 6 customer segments, sortable contact table, bulk email selection, activity timeline, note taking, tag management, dynamic segment builder |

<div align="center">⁂</div>

[^1]: https://resend.com/nextjs

