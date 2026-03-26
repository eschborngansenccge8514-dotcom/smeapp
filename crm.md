<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Add notification, email and simple crm tools in merchant dashboard.

Here is the complete Notifications, Email, and Simple CRM implementation for the merchant dashboard — fully wired to Supabase Realtime and Resend.[^1][^2][^3]

***

# Merchant Dashboard — Notifications, Email \& CRM

## File Structure

```
apps/web/src/
├── lib/
│   ├── notifications.ts            ← Notification helpers
│   └── resend.ts                   ← Resend email client
├── hooks/
│   ├── useNotifications.ts         ← Realtime notification hook
│   └── useCrmContacts.ts           ← CRM data hook
├── components/
│   └── dashboard/
│       ├── notifications/
│       │   ├── NotificationBell.tsx       ← Top bar bell with badge
│       │   ├── NotificationPanel.tsx      ← Slide-in panel
│       │   ├── NotificationItem.tsx       ← Single notification row
│       │   └── NotificationSettings.tsx   ← Per-type preferences
│       ├── email/
│       │   ├── EmailDashboard.tsx         ← Email campaign hub
│       │   ├── EmailComposer.tsx          ← Rich composer + template picker
│       │   ├── EmailTemplateLibrary.tsx   ← Pre-built templates
│       │   ├── EmailCampaignList.tsx      ← Sent + scheduled campaigns
│       │   └── EmailStats.tsx             ← Open/click/bounce stats
│       └── crm/
│           ├── CrmDashboard.tsx           ← CRM overview
│           ├── CrmContactTable.tsx        ← Filterable contact list
│           ├── CrmContactDrawer.tsx       ← Contact detail + history
│           ├── CrmSegmentBuilder.tsx      ← Tag-based audience builder
│           └── CrmActivityFeed.tsx        ← Timeline of customer actions
└── app/
    └── dashboard/
        ├── notifications/page.tsx
        ├── email/page.tsx
        └── crm/page.tsx
```


***

## 1. Supabase Migration

```sql
-- supabase/migrations/20260326_notifications_email_crm.sql

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,   -- 'new_order'|'low_stock'|'review'|'payment'|'system'|'promo'
  title         TEXT NOT NULL,
  body          TEXT,
  link          TEXT,            -- relative URL to navigate to
  metadata      JSONB DEFAULT '{}',
  is_read       BOOLEAN DEFAULT FALSE,
  is_archived   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX notifications_store_unread_idx ON merchant_notifications(store_id, is_read, created_at DESC);

ALTER TABLE merchant_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchant reads own notifications"
  ON merchant_notifications FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- ─────────────────────────────────────────
-- NOTIFICATION PREFERENCES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  new_order_push      BOOLEAN DEFAULT TRUE,
  new_order_email     BOOLEAN DEFAULT TRUE,
  low_stock_push      BOOLEAN DEFAULT TRUE,
  low_stock_email     BOOLEAN DEFAULT TRUE,
  low_stock_threshold INTEGER DEFAULT 5,
  new_review_push     BOOLEAN DEFAULT TRUE,
  new_review_email    BOOLEAN DEFAULT FALSE,
  payment_push        BOOLEAN DEFAULT TRUE,
  payment_email       BOOLEAN DEFAULT TRUE,
  system_push         BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_start         TIME DEFAULT '22:00',
  quiet_end           TIME DEFAULT '08:00',
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- EMAIL CAMPAIGNS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  subject         TEXT NOT NULL,
  preview_text    TEXT,
  body_html       TEXT NOT NULL,
  body_text       TEXT,
  from_name       TEXT NOT NULL,
  from_email      TEXT NOT NULL,
  reply_to        TEXT,
  segment_id      UUID,           -- NULL = all customers
  status          TEXT DEFAULT 'draft', -- 'draft'|'scheduled'|'sending'|'sent'|'failed'
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count      INTEGER DEFAULT 0,
  open_count      INTEGER DEFAULT 0,
  click_count     INTEGER DEFAULT 0,
  bounce_count    INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  template_id     TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX email_campaigns_store_idx ON email_campaigns(store_id, status, created_at DESC);

-- ─────────────────────────────────────────
-- CRM CONTACTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),  -- link to buyer account if exists
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  tags            TEXT[] DEFAULT '{}',
  segment         TEXT,           -- 'vip'|'at_risk'|'new'|'loyal'|'inactive'
  total_orders    INTEGER DEFAULT 0,
  total_spent     NUMERIC(12,2) DEFAULT 0,
  avg_order_value NUMERIC(12,2) DEFAULT 0,
  last_order_at   TIMESTAMPTZ,
  first_order_at  TIMESTAMPTZ,
  notes           TEXT,
  is_subscribed   BOOLEAN DEFAULT TRUE,  -- email marketing opt-in
  is_blocked      BOOLEAN DEFAULT FALSE,
  custom_fields   JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX crm_contacts_store_idx ON crm_contacts(store_id, segment, last_order_at DESC);
CREATE INDEX crm_contacts_email_idx ON crm_contacts(store_id, email);
CREATE INDEX crm_contacts_tags_gin  ON crm_contacts USING gin(tags);

-- ─────────────────────────────────────────
-- CRM ACTIVITIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'order'|'email_sent'|'email_opened'|'note'|'call'|'refund'|'review'
  title       TEXT NOT NULL,
  body        TEXT,
  metadata    JSONB DEFAULT '{}',  -- { order_id, amount, email_id }
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX crm_activities_contact_idx ON crm_activities(contact_id, created_at DESC);

-- ─────────────────────────────────────────
-- CRM SEGMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  conditions  JSONB NOT NULL DEFAULT '[]',  -- [{ field, operator, value }]
  contact_count INTEGER DEFAULT 0,
  is_dynamic  BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- AUTO-SYNC: keep crm_contacts in sync with orders
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_crm_on_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO crm_contacts (store_id, user_id, full_name, email, total_orders, total_spent, first_order_at, last_order_at)
  SELECT
    NEW.store_id,
    NEW.user_id,
    NEW.customer_name,
    NEW.customer_email,
    1,
    NEW.total,
    NEW.created_at,
    NEW.created_at
  ON CONFLICT (store_id, email) WHERE email IS NOT NULL
  DO UPDATE SET
    total_orders    = crm_contacts.total_orders + 1,
    total_spent     = crm_contacts.total_spent + NEW.total,
    avg_order_value = (crm_contacts.total_spent + NEW.total) / (crm_contacts.total_orders + 1),
    last_order_at   = NEW.created_at,
    updated_at      = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_sync_crm
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_crm_on_order();
```


***

## 2. Notification Hook (Supabase Realtime)

**`apps/web/src/hooks/useNotifications.ts`**:[^2][^4]

```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface MerchantNotification {
  id: string
  store_id: string
  type: 'new_order' | 'low_stock' | 'review' | 'payment' | 'system' | 'promo'
  title: string
  body: string | null
  link: string | null
  metadata: Record<string, any>
  is_read: boolean
  is_archived: boolean
  created_at: string
}

const PAGE_SIZE = 20

export function useNotifications(storeId: string) {
  const [notifications, setNotifications] = useState<MerchantNotification[]>([])
  const [loading, setLoading]             = useState(true)
  const [unreadCount, setUnreadCount]     = useState(0)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('merchant_notifications')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    }
    setLoading(false)
  }, [storeId])

  useEffect(() => {
    fetchNotifications()

    // Supabase Realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`notifications:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'merchant_notifications',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const n = payload.new as MerchantNotification
          setNotifications((prev) => [n, ...prev])
          setUnreadCount((c) => c + 1)
          // Browser push notification
          if (Notification.permission === 'granted') {
            new Notification(n.title, { body: n.body ?? '', icon: '/favicon.ico' })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'merchant_notifications',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const updated = payload.new as MerchantNotification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          )
          setUnreadCount((prev) =>
            prev - (payload.old.is_read === false && updated.is_read === true ? 1 : 0)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [storeId, fetchNotifications])

  async function markAsRead(id: string) {
    await supabase
      .from('merchant_notifications')
      .update({ is_read: true })
      .eq('id', id)
  }

  async function markAllAsRead() {
    await supabase
      .from('merchant_notifications')
      .update({ is_read: true })
      .eq('store_id', storeId)
      .eq('is_read', false)
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  async function archiveNotification(id: string) {
    await supabase
      .from('merchant_notifications')
      .update({ is_archived: true })
      .eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  async function requestPushPermission() {
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
  }

  return {
    notifications, loading, unreadCount,
    markAsRead, markAllAsRead, archiveNotification,
    requestPushPermission, refresh: fetchNotifications,
  }
}
```


***

## 3. Notification Bell

**`apps/web/src/components/dashboard/notifications/NotificationBell.tsx`**:

```tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'

interface Props {
  storeId: string
  primaryColor: string
}

export function NotificationBell({ storeId, primaryColor }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const {
    notifications, loading, unreadCount,
    markAsRead, markAllAsRead, archiveNotification,
  } = useNotifications(storeId)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          open ? 'bg-gray-100' : 'hover:bg-gray-100'
        }`}
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-xs font-bold flex items-center justify-center px-1 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          unreadCount={unreadCount}
          primaryColor={primaryColor}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onArchive={archiveNotification}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
```


***

## 4. Notification Panel

**`apps/web/src/components/dashboard/notifications/NotificationPanel.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NotificationItem } from './NotificationItem'
import type { MerchantNotification } from '@/hooks/useNotifications'

const TYPE_FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'new_order', label: '🛒 Orders' },
  { value: 'low_stock', label: '⚠️ Stock' },
  { value: 'payment',   label: '💰 Payments' },
  { value: 'review',    label: '⭐ Reviews' },
  { value: 'system',    label: '🔧 System' },
]

interface Props {
  notifications: MerchantNotification[]
  loading: boolean
  unreadCount: number
  primaryColor: string
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onArchive: (id: string) => void
  onClose: () => void
}

export function NotificationPanel({
  notifications, loading, unreadCount, primaryColor,
  onMarkRead, onMarkAllRead, onArchive, onClose,
}: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filtered = notifications.filter((n) => {
    if (filter !== 'all' && n.type !== filter) return false
    if (showUnreadOnly && n.is_read) return false
    return true
  })

  function handleClick(n: MerchantNotification) {
    if (!n.is_read) onMarkRead(n.id)
    if (n.link) { router.push(n.link); onClose() }
  }

  return (
    <div className="absolute right-0 top-11 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden max-h-[80vh]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => { router.push('/dashboard/notifications'); onClose() }}
            className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
          >
            See all →
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-none">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filter === f.value
                ? 'text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={filter === f.value ? { backgroundColor: primaryColor } : {}}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setShowUnreadOnly((s) => !s)}
          className={`shrink-0 ml-auto px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            showUnreadOnly
              ? 'text-white border-transparent'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
          style={showUnreadOnly ? { backgroundColor: primaryColor } : {}}
        >
          Unread only
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-full" />
                <div className="h-2 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm text-gray-500 font-medium">No notifications</p>
            <p className="text-xs text-gray-400 mt-0.5">You're all caught up!</p>
          </div>
        ) : (
          filtered.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              primaryColor={primaryColor}
              onClick={() => handleClick(n)}
              onArchive={() => onArchive(n.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
```


***

## 5. Notification Item

**`apps/web/src/components/dashboard/notifications/NotificationItem.tsx`**:

```tsx
import { formatDistanceToNow } from 'date-fns'
import type { MerchantNotification } from '@/hooks/useNotifications'

const TYPE_CONFIG = {
  new_order: { icon: '🛒', color: '#3B82F6', bg: '#EFF6FF' },
  low_stock: { icon: '⚠️', color: '#F59E0B', bg: '#FFFBEB' },
  review:    { icon: '⭐', color: '#8B5CF6', bg: '#F5F3FF' },
  payment:   { icon: '💰', color: '#10B981', bg: '#ECFDF5' },
  system:    { icon: '🔧', color: '#6B7280', bg: '#F9FAFB' },
  promo:     { icon: '🎁', color: '#EC4899', bg: '#FDF2F8' },
}

interface Props {
  notification: MerchantNotification
  primaryColor: string
  onClick: () => void
  onArchive: () => void
}

export function NotificationItem({ notification: n, primaryColor, onClick, onArchive }: Props) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system

  return (
    <div
      className={`flex gap-3 px-4 py-3.5 cursor-pointer group transition-colors hover:bg-gray-50 ${
        !n.is_read ? 'bg-blue-50/40' : ''
      }`}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.bg }}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        {!n.is_read && (
          <div
            className="w-2 h-2 rounded-full mt-1.5"
            style={{ backgroundColor: primaryColor }}
          />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onArchive() }}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 text-xs transition-all"
          title="Archive"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
```


***

## 6. Notification Settings

**`apps/web/src/components/dashboard/notifications/NotificationSettings.tsx`**:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Prefs {
  new_order_push: boolean; new_order_email: boolean
  low_stock_push: boolean; low_stock_email: boolean
  low_stock_threshold: number
  new_review_push: boolean; new_review_email: boolean
  payment_push: boolean; payment_email: boolean
  system_push: boolean
  quiet_hours_enabled: boolean
  quiet_start: string; quiet_end: string
}

const DEFAULTS: Prefs = {
  new_order_push: true, new_order_email: true,
  low_stock_push: true, low_stock_email: true, low_stock_threshold: 5,
  new_review_push: true, new_review_email: false,
  payment_push: true, payment_email: true,
  system_push: true,
  quiet_hours_enabled: false, quiet_start: '22:00', quiet_end: '08:00',
}

interface Props { storeId: string; primaryColor: string }

export function NotificationSettings({ storeId, primaryColor }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('notification_preferences').select('*').eq('store_id', storeId).single()
      .then(({ data }) => { if (data) setPrefs({ ...DEFAULTS, ...data }) })
  }, [storeId])

  async function save() {
    setSaving(true)
    await supabase.from('notification_preferences')
      .upsert({ store_id: storeId, ...prefs, updated_at: new Date().toISOString() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggle(key: keyof Prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  const NOTIFICATION_TYPES = [
    {
      key: 'new_order',
      icon: '🛒', label: 'New Orders',
      description: 'When a customer places an order',
    },
    {
      key: 'low_stock',
      icon: '⚠️', label: 'Low Stock Alerts',
      description: `When stock falls below threshold`,
      extra: (
        <div className="flex items-center gap-2 mt-2 ml-7">
          <span className="text-xs text-gray-500">Threshold:</span>
          <input
            type="number" min="1" max="100"
            value={prefs.low_stock_threshold}
            onChange={(e) => setPrefs((p) => ({ ...p, low_stock_threshold: +e.target.value }))}
            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 text-gray-900"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
          <span className="text-xs text-gray-400">units</span>
        </div>
      ),
    },
    {
      key: 'new_review',
      icon: '⭐', label: 'New Reviews',
      description: 'When a customer leaves a review',
    },
    {
      key: 'payment',
      icon: '💰', label: 'Payments',
      description: 'Payouts, refunds, and failed transactions',
    },
    {
      key: 'system',
      icon: '🔧', label: 'System Alerts',
      description: 'Platform updates and important notices',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Browser push permission */}
      {'Notification' in window && Notification.permission !== 'granted' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
          <span className="text-amber-400 text-lg shrink-0">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Enable browser notifications</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Get instant alerts directly in your browser even when the dashboard isn't in focus.
            </p>
          </div>
          <button
            onClick={() => Notification.requestPermission()}
            className="shrink-0 text-xs font-bold px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Enable
          </button>
        </div>
      )}

      {/* Notification types */}
      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 mb-2">
          <div />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Push</p>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Email</p>
        </div>
        {NOTIFICATION_TYPES.map((nt) => (
          <div key={nt.key}
            className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-start bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">{nt.icon}</span>
                <p className="text-sm font-semibold text-gray-800">{nt.label}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-7">{nt.description}</p>
              {nt.extra}
            </div>
            {/* Push toggle */}
            {nt.key !== 'system' ? (
              <>
                <label className="flex items-center justify-center mt-0.5 cursor-pointer">
                  <div
                    className={`relative w-9 h-5 rounded-full transition-all ${
                      prefs[`${nt.key}_push` as keyof Prefs] ? '' : 'bg-gray-200'
                    }`}
                    style={prefs[`${nt.key}_push` as keyof Prefs] ? { backgroundColor: primaryColor } : {}}
                    onClick={() => toggle(`${nt.key}_push` as keyof Prefs)}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      prefs[`${nt.key}_push` as keyof Prefs] ? 'left-4.5' : 'left-0.5'
                    }`} style={{ left: prefs[`${nt.key}_push` as keyof Prefs] ? '18px' : '2px' }} />
                  </div>
                </label>
                <label className="flex items-center justify-center mt-0.5 cursor-pointer">
                  <div
                    className={`relative w-9 h-5 rounded-full transition-all ${
                      prefs[`${nt.key}_email` as keyof Prefs] ? '' : 'bg-gray-200'
                    }`}
                    style={prefs[`${nt.key}_email` as keyof Prefs] ? { backgroundColor: primaryColor } : {}}
                    onClick={() => toggle(`${nt.key}_email` as keyof Prefs)}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all`}
                      style={{ left: prefs[`${nt.key}_email` as keyof Prefs] ? '18px' : '2px' }} />
                  </div>
                </label>
              </>
            ) : (
              <>
                <label className="flex items-center justify-center mt-0.5 cursor-pointer">
                  <div
                    className="relative w-9 h-5 rounded-full transition-all"
                    style={{ backgroundColor: prefs.system_push ? primaryColor : '#E5E7EB' }}
                    onClick={() => toggle('system_push')}
                  >
                    <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                      style={{ left: prefs.system_push ? '18px' : '2px' }} />
                  </div>
                </label>
                <div className="flex items-center justify-center">
                  <span className="text-xs text-gray-400">—</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <div className="bg-gray-50 rounded-2xl px-4 py-4 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🌙</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Quiet Hours</p>
              <p className="text-xs text-gray-500">Pause push notifications during set hours</p>
            </div>
          </div>
          <div
            className="relative w-9 h-5 rounded-full transition-all cursor-pointer"
            style={{ backgroundColor: prefs.quiet_hours_enabled ? primaryColor : '#E5E7EB' }}
            onClick={() => toggle('quiet_hours_enabled')}
          >
            <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
              style={{ left: prefs.quiet_hours_enabled ? '18px' : '2px' }} />
          </div>
        </div>
        {prefs.quiet_hours_enabled && (
          <div className="flex items-center gap-3 ml-7">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">From</span>
              <input type="time" value={prefs.quiet_start}
                onChange={(e) => setPrefs((p) => ({ ...p, quiet_start: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none text-gray-900" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">To</span>
              <input type="time" value={prefs.quiet_end}
                onChange={(e) => setPrefs((p) => ({ ...p, quiet_end: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none text-gray-900" />
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: saved ? '#10B981' : primaryColor }}
      >
        {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Preferences'}
      </button>
    </div>
  )
}
```


***

## 7. Resend Email Client + Templates

**`apps/web/src/lib/resend.ts`**:[^3][^5]

```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendCampaignOptions {
  fromName: string
  fromEmail: string
  replyTo?: string
  subject: string
  bodyHtml: string
  bodyText?: string
  recipients: { email: string; name: string; [key: string]: string }[]
  campaignId: string
}

export async function sendEmailCampaign({
  fromName, fromEmail, replyTo, subject, bodyHtml,
  bodyText, recipients, campaignId,
}: SendCampaignOptions) {
  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      // Personalise placeholders: {{name}}, {{email}}, etc.
      const personalised = Object.entries(r).reduce(
        (html, [key, val]) => html.replaceAll(`{{${key}}}`, val),
        bodyHtml
      )
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [r.email],
        reply_to: replyTo,
        subject,
        html: personalised,
        text: bodyText,
        headers: {
          'X-Campaign-ID': campaignId,
          'List-Unsubscribe': `<mailto:unsubscribe@yourapp.com?subject=unsubscribe-${campaignId}>`,
        },
      })
      if (error) throw error
      return data
    })
  )
  const sent     = results.filter((r) => r.status === 'fulfilled').length
  const failed   = results.filter((r) => r.status === 'rejected').length
  return { sent, failed }
}
```


***

## 8. Email API Route

**`apps/web/src/app/api/email/send-campaign/route.ts`**:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmailCampaign } from '@/lib/resend'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaignId, storeId } = await request.json()

  // Fetch campaign
  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('store_id', storeId)
    .single()
  if (campErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Fetch recipients
  let query = supabase
    .from('crm_contacts')
    .select('email, full_name')
    .eq('store_id', storeId)
    .eq('is_subscribed', true)
    .eq('is_blocked', false)
    .not('email', 'is', null)

  if (campaign.segment_id) {
    // TODO: apply segment filter dynamically
  }

  const { data: contacts } = await query
  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  // Update campaign status
  await supabase.from('email_campaigns')
    .update({ status: 'sending', total_recipients: contacts.length })
    .eq('id', campaignId)

  // Send via Resend
  const recipients = contacts.map((c) => ({
    email: c.email!,
    name: c.full_name,
    store_name: campaign.from_name,
  }))

  const { sent, failed } = await sendEmailCampaign({
    fromName:  campaign.from_name,
    fromEmail: campaign.from_email,
    replyTo:   campaign.reply_to,
    subject:   campaign.subject,
    bodyHtml:  campaign.body_html,
    bodyText:  campaign.body_text,
    recipients,
    campaignId,
  })

  // Update stats
  await supabase.from('email_campaigns').update({
    status: failed === contacts.length ? 'failed' : 'sent',
    sent_count: sent,
    sent_at: new Date().toISOString(),
  }).eq('id', campaignId)

  // Create notification
  await supabase.from('merchant_notifications').insert({
    store_id: storeId,
    type: 'system',
    title: `Campaign "${campaign.name}" sent`,
    body: `${sent} emails delivered${failed > 0 ? `, ${failed} failed` : ''}.`,
    link: `/dashboard/email`,
  })

  return NextResponse.json({ sent, failed })
}
```


***

## 9. Email Composer

**`apps/web/src/components/dashboard/email/EmailComposer.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmailTemplateLibrary } from './EmailTemplateLibrary'

interface Props {
  storeId: string
  primaryColor: string
  storeName: string
  storeEmail: string
  onSaved: () => void
}

const PERSONALIZATION_TAGS = [
  { tag: '{{name}}',        label: 'Customer Name' },
  { tag: '{{email}}',       label: 'Customer Email' },
  { tag: '{{store_name}}',  label: 'Store Name' },
  { tag: '{{unsubscribe}}', label: 'Unsubscribe Link' },
]

export function EmailComposer({ storeId, primaryColor, storeName, storeEmail, onSaved }: Props) {
  const [name, setName]           = useState('')
  const [subject, setSubject]     = useState('')
  const [previewText, setPreview] = useState('')
  const [fromName, setFromName]   = useState(storeName)
  const [fromEmail, setFromEmail] = useState(storeEmail)
  const [bodyHtml, setBodyHtml]   = useState('')
  const [scheduledAt, setSchedule]= useState('')
  const [templateOpen, setTplOpen]= useState(false)
  const [saving, setSaving]       = useState(false)
  const [sending, setSending]     = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [previewMode, setPreview2]= useState(false)

  const supabase = createClient()

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())      e.name    = 'Campaign name required'
    if (!subject.trim())   e.subject = 'Subject line required'
    if (!fromEmail.trim()) e.from    = 'From email required'
    if (!bodyHtml.trim())  e.body    = 'Email body required'
    return e
  }

  async function saveDraft() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    const { data } = await supabase.from('email_campaigns').insert({
      store_id: storeId, name, subject, preview_text: previewText,
      from_name: fromName, from_email: fromEmail,
      body_html: bodyHtml, status: 'draft',
      scheduled_at: scheduledAt || null,
    }).select().single()
    setSaving(false)
    if (data) onSaved()
  }

  async function sendNow() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSending(true)

    // Save first
    const { data: campaign } = await supabase.from('email_campaigns').insert({
      store_id: storeId, name, subject, preview_text: previewText,
      from_name: fromName, from_email: fromEmail,
      body_html: bodyHtml, status: 'scheduled',
    }).select().single()

    if (!campaign) { setSending(false); return }

    // Send via API
    await fetch('/api/email/send-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, storeId }),
    })

    setSending(false)
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Settings */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span>⚙️</span> Campaign Settings
          </h3>

          {[
            { label: 'Campaign Name *', key: 'name', val: name, set: setName, ph: 'e.g. February Promo' },
            { label: 'Subject Line *', key: 'subject', val: subject, set: setSubject, ph: 'What\'s the email about?' },
            { label: 'Preview Text', key: 'preview', val: previewText, set: setPreview, ph: 'Short teaser shown in inbox...' },
            { label: 'From Name', key: 'from', val: fromName, set: setFromName, ph: 'Your store name' },
            { label: 'From Email *', key: 'fromEmail', val: fromEmail, set: setFromEmail, ph: 'noreply@yourstore.com' },
          ].map(({ label, key, val, set, ph }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">{label}</label>
              <input
                type={key === 'fromEmail' ? 'email' : 'text'}
                value={val} onChange={(e) => { set(e.target.value); setErrors((p) => ({ ...p, [key]: '' })) }}
                placeholder={ph}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 ${
                  errors[key] ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                }`}
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
            </div>
          ))}

          {/* Schedule */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Schedule Send <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setSchedule(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 text-gray-900 bg-white"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Recipients</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 text-gray-700 bg-white"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}>
              <option value="">All Subscribed Contacts</option>
              <option value="vip">VIP Customers</option>
              <option value="at_risk">At-Risk Customers</option>
              <option value="new">New Customers</option>
              <option value="inactive">Inactive (90+ days)</option>
            </select>
          </div>
        </div>

        {/* Personalization */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-2.5">💡 Personalisation Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {PERSONALIZATION_TAGS.map((t) => (
              <button
                key={t.tag}
                onClick={() => setBodyHtml((b) => b + t.tag)}
                className="text-xs font-mono bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg text-gray-700 transition-colors"
                title={t.label}
              >
                {t.tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Body editor */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span>✉️</span> Email Body
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTplOpen(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
              >
                📄 Templates
              </button>
              <button
                onClick={() => setPreview2((p) => !p)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                  previewMode ? 'text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={previewMode ? { backgroundColor: primaryColor } : {}}
              >
                {previewMode ? '✏️ Edit' : '👁️ Preview'}
              </button>
            </div>
          </div>

          {errors.body && (
            <p className="text-red-500 text-xs flex items-center gap-1">⚠ {errors.body}</p>
          )}

          {previewMode ? (
            <div
              className="border border-gray-200 rounded-xl p-6 min-h-[400px] overflow-auto bg-gray-50"
              dangerouslySetInnerHTML={{ __html: bodyHtml || '<p class="text-gray-400 text-sm">Nothing to preview yet.</p>' }}
            />
          ) : (
            <textarea
              value={bodyHtml}
              onChange={(e) => { setBodyHtml(e.target.value); setErrors((p) => ({ ...p, body: '' })) }}
              placeholder="Write your HTML email here, or pick a template →"
              rows={20}
              className={`w-full border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 resize-none ${
                errors.body ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-700 hover:border-gray-300 transition-all disabled:opacity-60"
          >
            {saving ? 'Saving…' : '💾 Save Draft'}
          </button>
          <button
            onClick={sendNow}
            disabled={sending}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
            style={{ backgroundColor: sending ? '#9CA3AF' : primaryColor }}
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : scheduledAt ? '⏰ Schedule Send' : '🚀 Send Now'}
          </button>
        </div>
      </div>

      {/* Template library */}
      <EmailTemplateLibrary
        isOpen={templateOpen}
        onClose={() => setTplOpen(false)}
        onSelect={(html) => { setBodyHtml(html); setTplOpen(false) }}
        primaryColor={primaryColor}
        storeName={storeName}
      />
    </div>
  )
}
```


***

## 10. Email Template Library

**`apps/web/src/components/dashboard/email/EmailTemplateLibrary.tsx`**:

```tsx
'use client'

const TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome New Customer',
    icon: '👋',
    preview: 'Thanks for joining us — here\'s a special offer.',
    tags: ['Onboarding', 'Automated'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#f9fafb;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:24px}
  .header p{color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px}
  .body{padding:32px}
  .cta{display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0}
  .footer{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <h1>Welcome to ${storeName}! 🎉</h1>
    <p>We're so happy you're here, {{name}}</p>
  </div>
  <div class="body">
    <p style="color:#374151;font-size:15px;line-height:1.6">
      Hi <strong>{{name}}</strong>,<br><br>
      Thank you for creating an account with us. We're excited to have you as part of our community.
      Here's a little something to get you started:
    </p>
    <div style="background:#f5f3ff;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px">Your welcome discount</p>
      <p style="font-size:32px;font-weight:900;color:#6366f1;margin:0">10% OFF</p>
      <p style="font-size:12px;color:#9ca3af;margin:8px 0 0">Use code: WELCOME10</p>
    </div>
    <a href="#" class="cta">Start Shopping →</a>
    <p style="font-size:12px;color:#9ca3af;margin-top:24px">
      If you have any questions, just reply to this email — we're always happy to help.
    </p>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div></body></html>`,
  },
  {
    id: 'order_confirmed',
    name: 'Order Confirmation',
    icon: '🛒',
    preview: 'Your order has been placed successfully.',
    tags: ['Transactional'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#f9fafb;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:#10b981;padding:32px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px}
  .body{padding:32px}
  .badge{display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#059669;padding:8px 16px;border-radius:24px;font-size:13px;font-weight:700}
  .footer{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <div style="font-size:36px">✅</div>
    <h1>Order Confirmed!</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0">We've received your order</p>
  </div>
  <div class="body">
    <p style="color:#374151;font-size:15px;line-height:1.6">Hi <strong>{{name}}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6">
      Great news! Your order from <strong>${storeName}</strong> has been confirmed and is being prepared.
    </p>
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e5e7eb">
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px">Order Number</p>
      <p style="font-size:18px;font-weight:700;color:#1f2937;margin:0">{{order_id}}</p>
    </div>
    <p style="font-size:13px;color:#6b7280">We'll send you another email when your order ships. Thank you for shopping with us!</p>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div></body></html>`,
  },
  {
    id: 'promo',
    name: 'Promotional Blast',
    icon: '🎁',
    preview: 'Exclusive offer just for you — limited time only!',
    tags: ['Marketing', 'Sales'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#f9fafb;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,#f59e0b,#ef4444);padding:40px 32px;text-align:center}
  .tag{display:inline-block;background:rgba(255,255,255,0.2);color:#fff;padding:4px 12px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:12px}
  .body{padding:32px}
  .cta{display:block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;margin:24px 0}
  .footer{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <div class="tag">LIMITED TIME</div>
    <div style="font-size:40px;margin:8px 0">🔥</div>
    <h1 style="color:#fff;margin:0;font-size:28px">Flash Sale!</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px">Up to 50% off selected items</p>
  </div>
  <div class="body">
    <p style="color:#374151;font-size:15px;line-height:1.6">Hi <strong>{{name}}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6">
      Don't miss out — our biggest sale of the month is <strong>live right now</strong>. 
      Grab your favourites before they run out!
    </p>
    <div style="text-align:center;margin:24px 0">
      <div style="display:inline-block;background:#fef3c7;border-radius:12px;padding:16px 32px;border:2px dashed #f59e0b">
        <p style="font-size:12px;color:#92400e;margin:0 0 4px;font-weight:700;text-transform:uppercase">Use Code</p>
        <p style="font-size:28px;font-weight:900;color:#b45309;margin:0;letter-spacing:2px">SALE50</p>
      </div>
    </div>
    <a href="#" class="cta">Shop the Sale →</a>
    <p style="font-size:12px;color:#9ca3af;text-align:center">Offer ends midnight tonight. T&Cs apply.</p>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div></body></html>`,
  },
  {
    id: 'winback',
    name: 'Win-Back Campaign',
    icon: '💔',
    preview: 'We miss you! Come back for an exclusive offer.',
    tags: ['Retention', 'CRM'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#f9fafb;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,#1f2937,#374151);padding:40px 32px;text-align:center}
  .body{padding:32px}
  .cta{display:block;background:#1f2937;color:#fff;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;margin:24px 0}
  .footer{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <div style="font-size:40px;margin-bottom:12px">😢</div>
    <h1 style="color:#fff;margin:0;font-size:22px">We Miss You, {{name}}</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:8px 0 0">It's been a while — come back!</p>
  </div>
  <div class="body">
    <p style="color:#374151;font-size:14px;line-height:1.6">
      Hi {{name}},<br><br>
      We noticed it's been a while since your last visit to <strong>${storeName}</strong>.
      We've missed you! Here's a special offer just to say — please come back 💙
    </p>
    <div style="background:#f9fafb;border-radius:12px;padding:20px;text-align:center;border:1px solid #e5e7eb;margin:20px 0">
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px">Your personal discount</p>
      <p style="font-size:32px;font-weight:900;color:#1f2937;margin:0">15% OFF</p>
      <p style="font-size:11px;color:#9ca3af;margin:6px 0 0">Valid for 7 days · Code: COMEBACK15</p>
    </div>
    <a href="#" class="cta">Return to ${storeName} →</a>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div></body></html>`,
  },
  {
    id: 'review_request',
    name: 'Review Request',
    icon: '⭐',
    preview: 'Loved your purchase? Share your experience!',
    tags: ['Post-Purchase'],
    html: (storeName: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:sans-serif;background:#f9fafb;margin:0;padding:0}
  .wrapper{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
  .header{background:#fef3c7;padding:32px;text-align:center}
  .stars{font-size:32px;letter-spacing:4px;display:block;margin:12px 0}
  .body{padding:32px}
  .cta{display:block;background:#f59e0b;color:#fff;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;text-align:center;margin:24px 0}
  .footer{background:#f9fafb;padding:20px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <span class="stars">⭐⭐⭐⭐⭐</span>
    <h1 style="color:#92400e;margin:0;font-size:20px">How was your experience?</h1>
  </div>
  <div class="body">
    <p style="color:#374151;font-size:14px;line-height:1.6">Hi <strong>{{name}}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6">
      We hope you're loving your recent purchase from <strong>${storeName}</strong>!
      Your feedback means the world to us — and it helps other shoppers make better decisions.
    </p>
    <p style="font-size:13px;color:#6b7280">It only takes 30 seconds 🙏</p>
    <a href="#" class="cta">⭐ Leave a Review</a>
  </div>
  <div class="footer">
    © ${storeName} · <a href="{{unsubscribe}}" style="color:#9ca3af">Unsubscribe</a>
  </div>
</div></body></html>`,
  },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (html: string) => void
  primaryColor: string
  storeName: string
}

export function EmailTemplateLibrary({ isOpen, onClose, onSelect, primaryColor, storeName }: Props) {
  const [preview, setPreview] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">📄 Email Templates</h2>
              <p className="text-xs text-gray-400 mt-0.5">Select a template to get started</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((tpl) => (
                <div key={tpl.id}
                  className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setPreview(preview === tpl.id ? null : tpl.id)}
                >
                  {/* Preview iframe */}
                  <div className="relative h-40 bg-gray-50 overflow-hidden">
                    <iframe
                      srcDoc={tpl.html(storeName)}
                      className="w-full h-full scale-[0.5] origin-top-left pointer-events-none"
                      style={{ width: '200%', height: '200%' }}
                      title={tpl.name}
                    />
                    <div className={`absolute inset-0 transition-all flex items-center justify-center gap-2 ${
                      preview === tpl.id ? 'bg-black/40' : 'bg-transparent group-hover:bg-black/20'
                    }`}>
                      {preview === tpl.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelect(tpl.html(storeName)) }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Use Template
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{tpl.icon}</span>
                      <p className="text-sm font-bold text-gray-900">{tpl.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{tpl.preview}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```


***

## 11. CRM Contact Table

**`apps/web/src/components/dashboard/crm/CrmContactTable.tsx`**:

```tsx
'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import type { CrmContact } from './types'

const SEGMENTS = [
  { value: 'all',      label: 'All Contacts',  icon: '👥', color: '#6B7280' },
  { value: 'vip',      label: 'VIP',           icon: '👑', color: '#F59E0B' },
  { value: 'loyal',    label: 'Loyal',         icon: '💚', color: '#10B981' },
  { value: 'new',      label: 'New',           icon: '🌟', color: '#3B82F6' },
  { value: 'at_risk',  label: 'At Risk',       icon: '⚠️', color: '#EF4444' },
  { value: 'inactive', label: 'Inactive',      icon: '😴', color: '#9CA3AF' },
]

interface Props {
  contacts: CrmContact[]
  loading: boolean
  primaryColor: string
  onSelectContact: (c: CrmContact) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onBulkEmail: (ids: string[]) => void
}

export function CrmContactTable({
  contacts, loading, primaryColor,
  onSelectContact, selectedIds, onToggleSelect, onBulkEmail,
}: Props) {
  const [segment, setSegment]     = useState('all')
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState<'last_order_at' | 'total_spent' | 'total_orders'>('last_order_at')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc')
  const [page, setPage]           = useState(1)
  const PAGE_SIZE = 20

  const filtered = useMemo(() => {
    let result = [...contacts]
    if (segment !== 'all') result = result.filter((c) => c.segment === segment)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }
    result.sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      return sortDir === 'desc'
        ? (bv > av ? 1 : -1)
        : (av > bv ? 1 : -1)
    })
    return result
  }, [contacts, segment, search, sortBy, sortDir])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className={`ml-1 text-xs ${sortBy === col ? 'text-white' : 'text-white/40'}`}>
      {sortBy === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  )

  return (
    <div className="space-y-4">
      {/* Segment tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {SEGMENTS.map((s) => {
          const count = s.value === 'all'
            ? contacts.length
            : contacts.filter((c) => c.segment === s.value).length
          const isActive = segment === s.value
          return (
            <button
              key={s.value}
              onClick={() => { setSegment(s.value); setPage(1) }}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                isActive ? 'text-white border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              <span className={`rounded-full px-1.5 font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search + bulk actions */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search name, email, phone, tag…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:bg-white text-gray-900 placeholder-gray-400"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => onBulkEmail([...selectedIds])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            ✉️ Email {selectedIds.size} Selected
          </button>
        )}
        <p className="text-xs text-gray-400 shrink-0">
          {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ backgroundColor: primaryColor }}>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    className="rounded accent-white"
                    checked={selectedIds.size === paginated.length && paginated.length > 0}
                    onChange={() => {
                      if (selectedIds.size === paginated.length) {
                        paginated.forEach((c) => onToggleSelect(c.id))
                      } else {
                        paginated.filter((c) => !selectedIds.has(c.id)).forEach((c) => onToggleSelect(c.id))
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Segment</th>
                <th
                  className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide cursor-pointer hover:text-white/80 select-none"
                  onClick={() => toggleSort('total_orders')}
                >
                  Orders <SortIcon col="total_orders" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide cursor-pointer hover:text-white/80 select-none"
                  onClick={() => toggleSort('total_spent')}
                >
                  Total Spent <SortIcon col="total_spent" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide cursor-pointer hover:text-white/80 select-none"
                  onClick={() => toggleSort('last_order_at')}
                >
                  Last Order <SortIcon col="last_order_at" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Tags</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-xl" />
                          <div className="space-y-1.5">
                            <div className="h-3 bg-gray-200 rounded w-28" />
                            <div className="h-2.5 bg-gray-100 rounded w-36" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                      ))}
                      <td />
                    </tr>
                  ))
                : paginated.map((c) => {
                    const segInfo = SEGMENTS.find((s) => s.value === c.segment)
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(c.id) ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => onToggleSelect(c.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded"
                            style={{ accentColor: primaryColor }}
                          />
                        </td>
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() => onSelectContact(c)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0"
                              style={{ backgroundColor: `${primaryColor}CC` }}
                            >
                              {c.avatar_url
                                ? <Image src={c.avatar_url} alt={c.full_name} width={36} height={36} className="rounded-xl object-cover" />
                                : c.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{c.full_name}</p>
                              <p className="text-xs text-gray-400">{c.email ?? c.phone ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {segInfo && segInfo.value !== 'all' ? (
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                              style={{ backgroundColor: `${segInfo.color}15`, color: segInfo.color }}
                            >
                              {segInfo.icon} {segInfo.label}
                            </span>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {c.total_orders}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          RM {(c.total_spent ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {c.last_order_at
                            ? formatDistanceToNow(new Date(c.last_order_at), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags ?? []).slice(0, 2).map((tag) => (
                              <span key={tag}
                                className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                                {tag}
                              </span>
                            ))}
                            {(c.tags?.length ?? 0) > 2 && (
                              <span className="text-xs text-gray-400">+{c.tags!.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onSelectContact(c)}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-gray-300 text-sm flex items-center justify-center"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === p ? 'text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    style={page === p ? { backgroundColor: primaryColor } : {}}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-gray-300 text-sm flex items-center justify-center"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```


***

## 12. CRM Contact Drawer

**`apps/web/src/components/dashboard/crm/CrmContactDrawer.tsx`**:

```tsx
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
      .then(({ data }) => { setActivities(data ?? []); setLoading(false) })
  }, [contact?.id])

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
    if (act) setActivities((prev) => [act, ...prev])
    setNote('')
    setAddingNote(false)
  }

  async function addTag() {
    if (!tag.trim()) return
    const newTags = [...(contact!.tags ?? []), tag.trim()]
    await supabase.from('crm_contacts').update({ tags: newTags }).eq('id', contact!.id)
    setTag('')
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
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              <button
                onClick={addTag}
                className="text-xs font-bold px-3 py-2 rounded-xl text-white"
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
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 resize-none"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
            <button
              onClick={addNote}
              disabled={!note.trim() || addingNote}
              className="mt-2 text-xs font-bold px-4 py-2 rounded-xl text-white disabled:opacity-50 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              {addingNote ? 'Saving…' : '📝 Save Note'}
            </button>
          </div>

          {/* Activity timeline */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Activity Timeline</p>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-1">📋</p>
                <p className="text-xs">No activity recorded yet</p>
              </div>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
                {activities.map((act, i) => (
                  <div key={act.id} className="flex gap-3 pb-4 relative">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 z-10 bg-white border-2 border-gray-100"
                      style={{ borderColor: i === 0 ? primaryColor : undefined }}
                    >
                      {ACTIVITY_ICONS[act.type] ?? '📌'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-800">{act.title}</p>
                      {act.body && (
                        <p className="text-xs text-gray-500 mt-0.5">{act.body}</p>
                      )}
                      {act.metadata?.amount && (
                        <p className="text-xs font-bold mt-0.5" style={{ color: primaryColor }}>
                          RM {act.metadata.amount.toFixed(2)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
```


***

## 13. CRM Segment Builder

**`apps/web/src/components/dashboard/crm/CrmSegmentBuilder.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Operator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'in'
interface Condition {
  field: string; operator: Operator; value: string | number
}

const FIELDS = [
  { value: 'total_spent',     label: 'Total Spent (RM)',    type: 'number' },
  { value: 'total_orders',    label: 'Total Orders',        type: 'number' },
  { value: 'avg_order_value', label: 'Average Order Value', type: 'number' },
  { value: 'last_order_at',   label: 'Days Since Last Order', type: 'number' },
  { value: 'tags',            label: 'Has Tag',             type: 'text' },
  { value: 'segment',         label: 'Current Segment',     type: 'select', options: ['vip','loyal','new','at_risk','inactive'] },
  { value: 'is_subscribed',   label: 'Email Subscribed',    type: 'boolean' },
]

const OPERATORS: Record<string, { value: Operator; label: string }[]> = {
  number: [
    { value: 'gt',  label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt',  label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'eq',  label: '=' },
  ],
  text:    [{ value: 'contains', label: 'Contains' }, { value: 'eq', label: 'Is exactly' }],
  select:  [{ value: 'eq', label: 'Is' }, { value: 'in', label: 'Is one of' }],
  boolean: [{ value: 'eq', label: 'Is' }],
}

interface Props {
  storeId: string
  primaryColor: string
  onSaved: () => void
}

export function CrmSegmentBuilder({ storeId, primaryColor, onSaved }: Props) {
  const [name, setName]               = useState('')
  const [conditions, setConditions]   = useState<Condition[]>([{ field: 'total_spent', operator: 'gte', value: '' }])
  const [logic, setLogic]             = useState<'AND' | 'OR'>('AND')
  const [saving, setSaving]           = useState(false)
  const [previewCount, setPreviewCount]= useState<number | null>(null)
  const supabase = createClient()

  function addCondition() {
    setConditions((p) => [...p, { field: 'total_spent', operator: 'gte', value: '' }])
  }

  function removeCondition(i: number) {
    setConditions((p) => p.filter((_, idx) => idx !== i))
  }

  function updateCondition(i: number, updates: Partial<Condition>) {
    setConditions((p) => p.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/realtime
[^2]: https://supabase.com/docs/guides/realtime/realtime-with-nextjs
[^3]: https://resend.com/nextjs
[^4]: https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs
[^5]: https://resend.com/docs/send-with-nextjs
[^6]: https://www.reddit.com/r/Supabase/comments/1lc8juw/anyone_else_struggling_with_supabase_realtime/
[^7]: https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp
[^8]: https://tailwind-admin.com/blogs/crm-admin-dashboard
[^9]: https://supabase.com/blog/realtime-broadcast-from-database
[^10]: https://templates.popeki.com/blog/nextjs-send-emails-resend
[^11]: https://tailadmin.com
[^12]: https://blog.stackademic.com/realtime-chat-with-supabase-realtime-is-supa-easy-091c96411afd
[^13]: https://mui.com/store/collections/free-react-dashboard/
[^14]: https://www.youtube.com/watch?v=5MQb6pVkQHA
[^15]: https://www.youtube.com/watch?v=EhxwqXjX1dk```

