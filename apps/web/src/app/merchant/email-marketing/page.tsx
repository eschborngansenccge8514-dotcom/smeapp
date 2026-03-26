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

export default function EmailMarketingPage() {
  const { store, primaryColor } = useDashboardStore()
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<'list' | 'compose'>('list')
  const supabase = createClient()

  const fetchCampaigns = useCallback(async () => {
    if (!store?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
    setCampaigns((data as any) ?? [])
    setLoading(false)
  }, [store?.id, supabase])

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

  if (!store) return <div className="p-8 animate-pulse bg-gray-50 rounded-[40px] h-[600px]" />

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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
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
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">{s.label}</p>
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
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-widest opacity-60">All Campaigns</h2>
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
              <div className="text-center py-20 bg-white">
                <p className="text-5xl mb-4">✉️</p>
                <p className="font-bold text-gray-900 text-lg">No campaigns yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">Create your first email campaign to reach customers and boost sales.</p>
                <button
                  onClick={() => setView('compose')}
                  className="mt-6 px-8 py-3 rounded-2xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {campaigns.map((c) => {
                  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft
                  const openRate  = c.sent_count ? Math.round((c.open_count / c.sent_count) * 100) : 0
                  const clickRate = c.sent_count ? Math.round((c.click_count / c.sent_count) * 100) : 0
                  const bounceRate = c.sent_count ? Math.round((c.bounce_count / c.sent_count) * 100) : 0

                  return (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                      {/* Icon */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-white"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        {cfg.icon}
                      </div>

                      {/* Name + subject */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">{c.subject}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-white shadow-sm"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
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
                        <div className="hidden sm:flex gap-8 text-right shrink-0 pr-4">
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Recipients</p>
                            <p className="text-sm font-black text-gray-900">{(c.sent_count || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Open Rate</p>
                            <p
                              className="text-sm font-black"
                              style={{ color: openRate >= 20 ? '#10B981' : openRate >= 10 ? '#F59E0B' : '#EF4444' }}
                            >
                              {openRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Click Rate</p>
                            <p
                              className="text-sm font-black"
                              style={{ color: clickRate >= 3 ? '#10B981' : clickRate >= 1 ? '#F59E0B' : '#6B7280' }}
                            >
                              {clickRate}%
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Sending progress bar */}
                      {c.status === 'sending' && (
                        <div className="hidden sm:block w-32 pr-4">
                          <div className="flex justify-between text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">
                            <span>{c.sent_count} / {c.total_recipients}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
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
                          className="shrink-0 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border-2 border-gray-100 text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
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
