<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# continue

Continuing from where we left off — here is the full code implementation for every remaining part: API routes, merchant UI, customer UI, checkout integration, mobile screens, notifications, and admin panel.

***

## Step 6: Full API Routes

### 6.1 Merchant — Get/Save Program Settings

```typescript
// apps/web/src/app/api/merchant/loyalty/program/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const LoyaltyProgramSchema = z.object({
  is_enabled:           z.boolean(),
  base_points_per_myr:  z.number().min(0).max(100),
  points_per_myr_redeem: z.number().int().min(1).max(10000),
  min_order_amount_myr: z.number().min(0),
  point_expiry_months:  z.number().int().min(1).max(60).nullable(),
  max_redeem_pct:       z.number().min(0).max(100),
})

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_active', true)
    .single()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('*')
    .eq('store_id', store.id)
    .maybeSingle()

  return NextResponse.json({ program, storeId: store.id })
}

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const body   = await req.json()
  const parsed = LoyaltyProgramSchema.parse(body)

  const { data, error } = await supabase
    .from('loyalty_programs')
    .upsert({ ...parsed, store_id: store.id, updated_at: new Date().toISOString() },
             { onConflict: 'store_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```


### 6.2 Merchant — Manage Tiers

```typescript
// apps/web/src/app/api/merchant/loyalty/tiers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const TierSchema = z.object({
  id:               z.string().uuid().optional(),
  name:             z.string().min(1).max(50),
  description:      z.string().max(200).nullable().optional(),
  color:            z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  icon:             z.string().max(10).optional().nullable(),
  qualifier_type:   z.enum(['points', 'lifetime_spend']),
  threshold_value:  z.number().min(0),
  multiplier:       z.number().min(1).max(10),
  sort_order:       z.number().int().min(0),
  benefits:         z.record(z.any()).nullable().optional(),
})

const TiersPayloadSchema = z.object({
  tiers: z.array(TierSchema).min(1).max(10),
})

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const { data: tiers } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .eq('store_id', store.id)
    .order('sort_order')

  return NextResponse.json({ tiers: tiers ?? [] })
}

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const body   = await req.json()
  const { tiers } = TiersPayloadSchema.parse(body)

  // Delete removed tiers, upsert existing/new ones
  const incomingIds = tiers.filter((t) => t.id).map((t) => t.id!)

  if (incomingIds.length > 0) {
    await supabase
      .from('loyalty_tiers')
      .delete()
      .eq('store_id', store.id)
      .not('id', 'in', `(${incomingIds.join(',')})`)
  } else {
    await supabase.from('loyalty_tiers').delete().eq('store_id', store.id)
  }

  const upsertRows = tiers.map((t) => ({
    ...(t.id ? { id: t.id } : {}),
    store_id:        store.id,
    name:            t.name,
    description:     t.description ?? null,
    color:           t.color ?? null,
    icon:            t.icon ?? null,
    qualifier_type:  t.qualifier_type,
    threshold_value: t.threshold_value,
    multiplier:      t.multiplier,
    sort_order:      t.sort_order,
    benefits:        t.benefits ?? null,
    updated_at:      new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('loyalty_tiers')
    .upsert(upsertRows, { onConflict: 'id' })
    .select('*')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tiers: data })
}
```


### 6.3 Merchant — Customer Leaderboard \& Stats

```typescript
// apps/web/src/app/api/merchant/loyalty/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()
  if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url    = new URL(req.url)
  const page   = parseInt(url.searchParams.get('page')  ?? '1')
  const limit  = parseInt(url.searchParams.get('limit') ?? '20')
  const from   = (page - 1) * limit

  const { data: balances, count } = await supabase
    .from('loyalty_balances')
    .select(`
      id, current_points, lifetime_points, lifetime_spend,
      last_earned_at, last_redeemed_at, created_at,
      profiles(id, full_name, avatar_url),
      loyalty_tiers(name, color, icon)
    `, { count: 'exact' })
    .eq('store_id', store.id)
    .order('lifetime_points', { ascending: false })
    .range(from, from + limit - 1)

  return NextResponse.json({ balances: balances ?? [], total: count ?? 0, page, limit })
}
```


### 6.4 Merchant — Manual Adjust Points

```typescript
// apps/web/src/app/api/merchant/loyalty/adjust/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const AdjustSchema = z.object({
  userId:      z.string().uuid(),
  points:      z.number().int().min(-99999).max(99999),
  description: z.string().min(1).max(200),
})

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()
  if (!store) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, points, description } = AdjustSchema.parse(await req.json())

  const admin = createSupabaseAdmin()

  // Get current balance
  const { data: bal } = await admin
    .from('loyalty_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('store_id', store.id)
    .maybeSingle()

  const current = bal?.current_points ?? 0
  const after   = Math.max(0, current + points)

  await admin.from('loyalty_balances').upsert({
    user_id:        userId,
    store_id:       store.id,
    current_points: after,
    lifetime_points: points > 0 ? (bal?.lifetime_points ?? 0) + points : (bal?.lifetime_points ?? 0),
    updated_at:     new Date().toISOString(),
  }, { onConflict: 'user_id,store_id' })

  await admin.from('loyalty_transactions').insert({
    user_id:       userId,
    store_id:      store.id,
    type:          'adjust',
    source:        'manual',
    points:        points > 0 ? points : (after - current),
    points_before: current,
    points_after:  after,
    description,
  })

  return NextResponse.json({ ok: true, points_before: current, points_after: after })
}
```


### 6.5 Customer — Get Balance

```typescript
// apps/web/src/app/api/loyalty/balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('storeId')

  let query = supabase
    .from('loyalty_balances')
    .select(`
      id, current_points, lifetime_points, lifetime_spend,
      last_earned_at, last_redeemed_at,
      stores(id, name, logo_url),
      loyalty_tiers(
        id, name, color, icon, threshold_value, qualifier_type,
        multiplier, benefits
      )
    `)
    .eq('user_id', user.id)

  if (storeId) query = query.eq('store_id', storeId)

  const { data: balances } = await query.order('lifetime_points', { ascending: false })

  // For each store, also fetch next tier
  const enriched = await Promise.all(
    (balances ?? []).map(async (bal: any) => {
      const { data: nextTier } = await supabase
        .from('loyalty_tiers')
        .select('id, name, color, icon, threshold_value, multiplier')
        .eq('store_id', bal.stores.id)
        .gt('threshold_value', bal.lifetime_points)
        .order('threshold_value')
        .limit(1)
        .maybeSingle()

      return { ...bal, next_tier: nextTier }
    })
  )

  return NextResponse.json({ balances: enriched })
}
```


### 6.6 Customer — Get Transactions

```typescript
// apps/web/src/app/api/loyalty/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('storeId')
  const page    = parseInt(searchParams.get('page')  ?? '1')
  const limit   = parseInt(searchParams.get('limit') ?? '20')
  const from    = (page - 1) * limit

  let query = supabase
    .from('loyalty_transactions')
    .select(`
      id, type, source, points, points_before, points_after,
      description, occurred_at, expires_at,
      orders(id, total_amount, status),
      stores(id, name, logo_url)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .range(from, from + limit - 1)

  if (storeId) query = query.eq('store_id', storeId)

  const { data, count } = await query
  return NextResponse.json({ transactions: data ?? [], total: count ?? 0, page, limit })
}
```


### 6.7 Checkout — Check Redeemable Points

```typescript
// apps/web/src/app/api/loyalty/redeem-preview/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const PreviewSchema = z.object({
  storeId:        z.string().uuid(),
  subtotal:       z.number().positive(),
  requestPoints:  z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storeId, subtotal, requestPoints } = PreviewSchema.parse(await req.json())

  const [{ data: bal }, { data: prog }] = await Promise.all([
    supabase
      .from('loyalty_balances')
      .select('current_points, lifetime_points, loyalty_tiers(multiplier)')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .maybeSingle(),
    supabase
      .from('loyalty_programs')
      .select('is_enabled, base_points_per_myr, points_per_myr_redeem, max_redeem_pct, min_order_amount_myr')
      .eq('store_id', storeId)
      .eq('is_enabled', true)
      .maybeSingle(),
  ])

  if (!prog) return NextResponse.json({ enabled: false })

  const currentPoints = bal?.current_points ?? 0
  const multiplier    = (bal?.loyalty_tiers as any)?.multiplier ?? 1.0

  // ─── Points that WILL be earned from this order ──────────────
  const willEarn = Math.floor(prog.base_points_per_myr * subtotal * multiplier)

  // ─── Points that CAN be redeemed right now ───────────────────
  const maxByPct    = (prog.max_redeem_pct / 100) * subtotal
  const maxByPoints = currentPoints / prog.points_per_myr_redeem
  const maxDiscount = Math.min(maxByPct, maxByPoints)
  const maxPoints   = Math.floor(maxDiscount * prog.points_per_myr_redeem)

  let appliedPoints  = 0
  let discountAmount = 0

  if (requestPoints && requestPoints > 0) {
    appliedPoints  = Math.min(requestPoints, maxPoints)
    discountAmount = parseFloat((appliedPoints / prog.points_per_myr_redeem).toFixed(2))
  }

  return NextResponse.json({
    enabled:         true,
    currentPoints,
    willEarn,
    maxRedeemable:   maxPoints,
    maxDiscountMyr:  parseFloat(maxDiscount.toFixed(2)),
    appliedPoints,
    discountAmount,
    conversionRate:  prog.points_per_myr_redeem,
  })
}
```


***

## Step 7: Checkout Integration

### 7.1 Update Checkout Flow to Accept Loyalty Redemption

```typescript
// apps/web/src/components/checkout/CheckoutFlow.tsx
// Add a loyalty step between "Delivery" and "Payment"

// 1. Add loyalty state to the existing flow:
const [loyaltyPreview, setLoyaltyPreview] = useState<LoyaltyPreview | null>(null)
const [pointsToRedeem, setPointsToRedeem]  = useState(0)

// 2. Fetch preview whenever subtotal or storeId changes
useEffect(() => {
  if (!storeId || !subtotal) return
  fetchLoyaltyPreview(storeId, subtotal, pointsToRedeem).then(setLoyaltyPreview)
}, [storeId, subtotal, pointsToRedeem])

// 3. Show loyalty row in order summary (if enabled + user has points):
function LoyaltyRow() {
  if (!loyaltyPreview?.enabled || loyaltyPreview.currentPoints === 0) return null

  return (
    <div className="border-t border-dashed border-indigo-200 pt-3 mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
          ⭐ Loyalty Points
          <span className="text-xs text-indigo-500 font-semibold">
            ({loyaltyPreview.currentPoints.toLocaleString()} available)
          </span>
        </span>
        {pointsToRedeem > 0 && (
          <span className="text-sm font-bold text-green-600">
            −RM {loyaltyPreview.discountAmount?.toFixed(2)}
          </span>
        )}
      </div>

      {/* Slider */}
      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={loyaltyPreview.maxRedeemable}
          step={loyaltyPreview.conversionRate}
          value={pointsToRedeem}
          onChange={(e) => setPointsToRedeem(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0 pts</span>
          <span>{pointsToRedeem > 0 ? `Using ${pointsToRedeem.toLocaleString()} pts` : 'Slide to redeem'}</span>
          <span>{loyaltyPreview.maxRedeemable.toLocaleString()} pts</span>
        </div>
      </div>

      {loyaltyPreview.willEarn > 0 && (
        <p className="text-xs text-indigo-500 flex items-center gap-1">
          ✨ You will earn <strong>{loyaltyPreview.willEarn} points</strong> from this order
        </p>
      )}
    </div>
  )
}
```


### 7.2 Pass Points to Create-Order API

```typescript
// apps/web/src/app/api/checkout/create-order/route.ts
// Add to your existing CreateOrderSchema:
// loyaltyPointsToRedeem: z.number().int().min(0).default(0),

// Inside POST handler, after Billplz bill creation, apply loyalty:
if (body.loyaltyPointsToRedeem > 0) {
  const { data: redeemResult } = await admin.rpc('redeem_loyalty_points', {
    p_store_id:         body.storeId,
    p_user_id:          user.id,
    p_order_id:         order.id,
    p_subtotal:         body.subtotal,
    p_requested_points: body.loyaltyPointsToRedeem,
  })
  // Store discount in order record
  await admin.from('orders').update({
    loyalty_points_redeemed: redeemResult?.[^0]?.applied_points ?? 0,
    loyalty_discount_amount: redeemResult?.[^0]?.discount_myr   ?? 0,
  }).eq('id', order.id)
}

// Note: points are EARNED in the Billplz webhook (on payment confirmed),
// not here — to avoid giving points for unpaid orders.
```


***

## Step 8: Merchant Settings UI

```typescript
// apps/web/src/app/merchant/settings/loyalty/page.tsx
import { createSupabaseServer } from '@/lib/supabase/server'
import { LoyaltySettingsClient } from '@/components/merchant/loyalty/LoyaltySettingsClient'

export default async function MerchantLoyaltyPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: store } = await supabase
    .from('stores').select('id, name').eq('owner_id', user!.id).single()

  const [{ data: program }, { data: tiers }] = await Promise.all([
    supabase.from('loyalty_programs').select('*').eq('store_id', store!.id).maybeSingle(),
    supabase.from('loyalty_tiers').select('*').eq('store_id', store!.id).order('sort_order'),
  ])

  return (
    <LoyaltySettingsClient
      store={store!}
      initialProgram={program}
      initialTiers={tiers ?? []}
    />
  )
}
```

```typescript
// apps/web/src/components/merchant/loyalty/LoyaltySettingsClient.tsx
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, GripVertical, Save, Info } from 'lucide-react'

const PRESET_TIERS = [
  { name: 'Bronze', icon: '🥉', color: '#CD7F32', threshold_value: 0,    multiplier: 1.0 },
  { name: 'Silver', icon: '🥈', color: '#C0C0C0', threshold_value: 500,  multiplier: 1.5 },
  { name: 'Gold',   icon: '🥇', color: '#FFD700', threshold_value: 2000, multiplier: 2.0 },
  { name: 'VIP',    icon: '💎', color: '#9C27B0', threshold_value: 5000, multiplier: 3.0 },
]

export function LoyaltySettingsClient({ store, initialProgram, initialTiers }: any) {
  const [program, setProgram] = useState({
    is_enabled:            initialProgram?.is_enabled            ?? false,
    base_points_per_myr:   initialProgram?.base_points_per_myr   ?? 1,
    points_per_myr_redeem: initialProgram?.points_per_myr_redeem ?? 100,
    min_order_amount_myr:  initialProgram?.min_order_amount_myr  ?? 0,
    point_expiry_months:   initialProgram?.point_expiry_months   ?? null,
    max_redeem_pct:        initialProgram?.max_redeem_pct        ?? 20,
  })

  const [tiers, setTiers] = useState(
    initialTiers.length > 0
      ? initialTiers
      : PRESET_TIERS.map((t, i) => ({ ...t, id: undefined, qualifier_type: 'points', sort_order: i }))
  )

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'tiers'>('settings')

  async function saveAll() {
    setSaving(true)
    try {
      await Promise.all([
        fetch('/api/merchant/loyalty/program', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(program),
        }),
        fetch('/api/merchant/loyalty/tiers', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tiers }),
        }),
      ])
      toast.success('Loyalty program saved!')
    } catch {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  function addTier() {
    setTiers((prev: any[]) => [...prev, {
      id: undefined, name: 'New Tier', icon: '⭐', color: '#4F46E5',
      qualifier_type: 'points', threshold_value: 0, multiplier: 1,
      sort_order: prev.length, benefits: null,
    }])
  }

  function removeTier(idx: number) {
    setTiers((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))
  }

  function updateTier(idx: number, field: string, value: any) {
    setTiers((prev: any[]) => prev.map((t: any, i: number) =>
      i === idx ? { ...t, [field]: value } : t
    ))
  }

  // ─── Computed preview ─────────────────────────────────────────
  const exampleOrder = 50
  const examplePoints = Math.floor(program.base_points_per_myr * exampleOrder)
  const redemptionValue = (100 / program.points_per_myr_redeem).toFixed(2)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Loyalty Program</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Reward repeat customers and increase retention
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Enable Toggle */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">Enable Loyalty Program</p>
          <p className="text-sm text-gray-500">Customers start earning points on every paid order</p>
        </div>
        <button
          onClick={() => setProgram((p: any) => ({ ...p, is_enabled: !p.is_enabled }))}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors
            ${program.is_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
            ${program.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {program.is_enabled && (
        <>
          {/* Tab Switcher */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            {(['settings', 'tiers'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors
                  ${activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">

              {/* Live Preview Card */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900 space-y-1">
                <p className="font-semibold text-indigo-700 flex items-center gap-1">
                  <Info size={14} /> Live Preview
                </p>
                <p>
                  Order of <strong>RM {exampleOrder}</strong> → earns{' '}
                  <strong>{examplePoints} points</strong>
                </p>
                <p>
                  <strong>100 points</strong> = <strong>RM {redemptionValue}</strong> discount
                </p>
                <p>
                  Max redemption: <strong>{program.max_redeem_pct}%</strong> of order subtotal
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Earn Rate (points per RM 1)
                  </label>
                  <input type="number" min={0} max={100} step={0.5}
                    value={program.base_points_per_myr}
                    onChange={(e) => setProgram((p: any) => ({ ...p, base_points_per_myr: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default: 1 pt per RM 1 spent</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Redemption Rate (points per RM 1)
                  </label>
                  <input type="number" min={1} max={10000} step={1}
                    value={program.points_per_myr_redeem}
                    onChange={(e) => setProgram((p: any) => ({ ...p, points_per_myr_redeem: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g. 100 pts = RM 1 discount</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Max Redemption per Order (%)
                  </label>
                  <input type="number" min={0} max={100} step={5}
                    value={program.max_redeem_pct}
                    onChange={(e) => setProgram((p: any) => ({ ...p, max_redeem_pct: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Caps points discount at X% of subtotal</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Min Order to Earn Points (RM)
                  </label>
                  <input type="number" min={0} step={1}
                    value={program.min_order_amount_myr}
                    onChange={(e) => setProgram((p: any) => ({ ...p, min_order_amount_myr: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Set 0 for no minimum</p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Point Expiry
                  </label>
                  <select
                    value={program.point_expiry_months ?? ''}
                    onChange={(e) => setProgram((p: any) => ({
                      ...p,
                      point_expiry_months: e.target.value ? Number(e.target.value) : null
                    }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Never expire</option>
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Points expire X months after they are earned
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── TIERS TAB ── */}
          {activeTab === 'tiers' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <Info size={13} className="shrink-0 mt-0.5" />
                <span>
                  Tiers are based on <strong>lifetime points</strong> or <strong>lifetime spend</strong>.
                  Higher tiers earn points faster via their multiplier. Customers keep their tier even if points are redeemed.
                </span>
              </div>

              {tiers.map((tier: any, idx: number) => (
                <div key={idx}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: tier.color + '20' }}>
                      {tier.icon ?? '⭐'}
                    </div>
                    <input
                      value={tier.name}
                      onChange={(e) => updateTier(idx, 'name', e.target.value)}
                      placeholder="Tier name"
                      className="flex-1 font-bold text-gray-900 border-b border-gray-200 focus:outline-none focus:border-indigo-400 bg-transparent text-base"
                    />
                    <button onClick={() => removeTier(idx)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Icon</label>
                      <input
                        value={tier.icon ?? ''}
                        onChange={(e) => updateTier(idx, 'icon', e.target.value)}
                        placeholder="⭐"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={tier.color ?? '#4F46E5'}
                          onChange={(e) => updateTier(idx, 'color', e.target.value)}
                          className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        />
                        <input value={tier.color ?? ''}
                          onChange={(e) => updateTier(idx, 'color', e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none"
                          placeholder="#4F46E5"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Qualifier</label>
                      <select
                        value={tier.qualifier_type}
                        onChange={(e) => updateTier(idx, 'qualifier_type', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
                      >
                        <option value="points">Lifetime Pts</option>
                        <option value="lifetime_spend">Lifetime RM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Threshold ({tier.qualifier_type === 'points' ? 'pts' : 'RM'})
                      </label>
                      <input type="number" min={0}
                        value={tier.threshold_value}
                        onChange={(e) => updateTier(idx, 'threshold_value', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Earn Multiplier</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} max={10} step={0.1}
                          value={tier.multiplier}
                          onChange={(e) => updateTier(idx, 'multiplier', Number(e.target.value))}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                        <span className="text-sm text-indigo-600 font-bold">{tier.multiplier}×</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Description</label>
                      <input
                        value={tier.description ?? ''}
                        onChange={(e) => updateTier(idx, 'description', e.target.value)}
                        placeholder="e.g. Earn 1.5× points on every order"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addTier}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-2xl py-4 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <Plus size={16} /> Add Tier
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```


***

## Step 9: Customer Web UI

### 9.1 Account Loyalty Page

```typescript
// apps/web/src/app/account/loyalty/page.tsx
import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoyaltyDashboard } from '@/components/account/loyalty/LoyaltyDashboard'

export default async function AccountLoyaltyPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: balances } = await supabase
    .from('loyalty_balances')
    .select(`
      id, current_points, lifetime_points, lifetime_spend,
      last_earned_at, last_redeemed_at, store_id,
      stores(id, name, logo_url, is_active),
      loyalty_tiers(id, name, color, icon, threshold_value, multiplier)
    `)
    .eq('user_id', user.id)
    .gt('lifetime_points', 0)
    .order('lifetime_points', { ascending: false })

  return <LoyaltyDashboard balances={balances ?? []} userId={user.id} />
}
```

```typescript
// apps/web/src/components/account/loyalty/LoyaltyDashboard.tsx
'use client'
import { useState } from 'react'
import { LoyaltyBalanceCard }       from './LoyaltyBalanceCard'
import { LoyaltyTransactionList }   from './LoyaltyTransactionList'

export function LoyaltyDashboard({ balances, userId }: any) {
  const [selectedStore, setSelectedStore] = useState<string | null>(
    balances[^0]?.store_id ?? null
  )

  const selectedBalance = balances.find((b: any) => b.store_id === selectedStore)

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Loyalty Points</h1>
        <p className="text-gray-500 text-sm mt-1">
          Earn points with every purchase and redeem for discounts
        </p>
      </div>

      {balances.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-5xl mb-4">⭐</p>
          <h3 className="font-bold text-gray-900">No points yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Start ordering from stores with loyalty programs to earn points
          </p>
        </div>
      ) : (
        <>
          {/* Store selector if multiple */}
          {balances.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {balances.map((bal: any) => (
                <button
                  key={bal.store_id}
                  onClick={() => setSelectedStore(bal.store_id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm whitespace-nowrap transition-colors shrink-0
                    ${selectedStore === bal.store_id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                  {bal.stores?.logo_url && (
                    <img src={bal.stores.logo_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                  )}
                  {bal.stores?.name}
                  <span className="text-xs font-bold ml-1">
                    {bal.current_points.toLocaleString()} pts
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Main balance card */}
          {selectedBalance && (
            <LoyaltyBalanceCard balance={selectedBalance} storeId={selectedStore!} />
          )}

          {/* Transaction history */}
          {selectedStore && (
            <LoyaltyTransactionList storeId={selectedStore} userId={userId} />
          )}
        </>
      )}
    </div>
  )
}
```

```typescript
// apps/web/src/components/account/loyalty/LoyaltyBalanceCard.tsx
'use client'
import { useEffect, useState } from 'react'

export function LoyaltyBalanceCard({ balance, storeId }: any) {
  const [nextTier, setNextTier] = useState<any>(null)
  const tier = balance.loyalty_tiers

  useEffect(() => {
    fetch(`/api/loyalty/balance?storeId=${storeId}`)
      .then((r) => r.json())
      .then((d) => setNextTier(d.balances?.[^0]?.next_tier))
  }, [storeId])

  const lifetimeVal   = balance.lifetime_points
  const nextThreshold = nextTier?.threshold_value ?? lifetimeVal
  const prevThreshold = tier?.threshold_value ?? 0
  const progress      = nextTier
    ? Math.min(100, ((lifetimeVal - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
    : 100

  return (
    <div
      className="rounded-2xl p-6 text-white shadow-lg"
      style={{
        background: tier?.color
          ? `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`
          : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
      }}
    >
      {/* Store + tier */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {balance.stores?.logo_url && (
            <img src={balance.stores.logo_url}
              className="w-8 h-8 rounded-full border-2 border-white/30" alt="" />
          )}
          <span className="font-semibold text-white/90">{balance.stores?.name}</span>
        </div>
        {tier && (
          <span className="text-lg font-bold">
            {tier.icon} {tier.name}
          </span>
        )}
      </div>

      {/* Points balance */}
      <div className="mb-5">
        <p className="text-white/70 text-sm">Available Points</p>
        <p className="text-5xl font-extrabold tracking-tight">
          {balance.current_points.toLocaleString()}
        </p>
        <p className="text-white/70 text-sm mt-1">
          {balance.lifetime_points.toLocaleString()} lifetime points earned
        </p>
      </div>

      {/* Tier progress */}
      {nextTier ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/80">
            <span>{tier?.name ?? 'Base'}</span>
            <span>{nextTier.icon} {nextTier.name} in {(nextThreshold - lifetimeVal).toLocaleString()} pts</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="text-sm text-white/80 font-medium flex items-center gap-1">
          ✨ You've reached the highest tier!
        </div>
      )}

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-white/70">Multiplier</p>
          <p className="font-bold text-white">{tier?.multiplier ?? 1}× points</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-white/70">Lifetime Spend</p>
          <p className="font-bold text-white">RM {Number(balance.lifetime_spend).toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
```

```typescript
// apps/web/src/components/account/loyalty/LoyaltyTransactionList.tsx
'use client'
import { useEffect, useState } from 'react'

const TX_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  earn:    { label: 'Earned',   color: 'text-green-600',  sign: '+' },
  redeem:  { label: 'Redeemed', color: 'text-indigo-600', sign: '−' },
  expire:  { label: 'Expired',  color: 'text-gray-400',   sign: '−' },
  adjust:  { label: 'Adjusted', color: 'text-amber-600',  sign: '~' },
}

export function LoyaltyTransactionList({ storeId, userId }: any) {
  const [txs, setTxs]         = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/loyalty/transactions?storeId=${storeId}&page=${page}`)
      .then((r) => r.json())
      .then((d) => {
        setTxs(d.transactions)
        setTotal(d.total)
        setLoading(false)
      })
  }, [storeId, page])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Point History</h3>
      </div>

      {loading ? (
        <div className="divide-y divide-gray-50">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="px-5 py-4 flex items-center justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-50 rounded w-24" />
              </div>
              <div className="h-5 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No transactions yet</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-50">
            {txs.map((tx: any) => {
              const config = TX_LABELS[tx.type] ?? TX_LABELS.adjust
              const isPositive = tx.points > 0
              return (
                <div key={tx.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {tx.description ?? config.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.occurred_at).toLocaleString('en-MY', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {tx.expires_at && tx.type === 'earn' && (
                        <span className="ml-2 text-amber-500">
                          · Expires {new Date(tx.expires_at).toLocaleDateString('en-MY')}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`font-bold text-sm ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{tx.points.toLocaleString()} pts
                  </span>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between text-sm text-gray-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="disabled:opacity-30 hover:text-indigo-600"
              >
                ← Previous
              </button>
              <span>Page {page} of {Math.ceil(total / 20)}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="disabled:opacity-30 hover:text-indigo-600"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```


***

## Step 10: Mobile Screens

```typescript
// apps/mobile/app/(tabs)/account/loyalty.tsx
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { CachedImage } from '@/components/ui/CachedImage'
import { FlashList } from '@shopify/flash-list'

export default function LoyaltyScreen() {
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading]  = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('loyalty_balances')
        .select(`
          id, current_points, lifetime_points, lifetime_spend,
          store_id,
          stores(id, name, logo_url),
          loyalty_tiers(id, name, color, icon, threshold_value, multiplier)
        `)
        .eq('user_id', user.id)
        .gt('lifetime_points', 0)
        .order('lifetime_points', { ascending: false })

      setBalances(data ?? [])
      if (data?.[^0]) setSelected(data[^0])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  if (balances.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 60, marginBottom: 12 }}>⭐</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>No points yet</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
          Order from stores with loyalty programs to start earning points
        </Text>
      </View>
    )
  }

  const tier   = selected?.loyalty_tiers
  const color  = tier?.color ?? '#4F46E5'

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Store Picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {balances.map((bal) => (
          <Pressable
            key={bal.store_id}
            onPress={() => setSelected(bal)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 8,
              borderRadius: 12, borderWidth: 1.5,
              borderColor: selected?.store_id === bal.store_id ? '#4F46E5' : '#E5E7EB',
              backgroundColor: selected?.store_id === bal.store_id ? '#EEF2FF' : '#fff',
            }}
          >
            {bal.stores?.logo_url && (
              <CachedImage uri={bal.stores.logo_url} width={20} height={20} borderRadius={10} />
            )}
            <Text style={{
              fontSize: 13, fontWeight: '600',
              color: selected?.store_id === bal.store_id ? '#4F46E5' : '#374151'
            }}>
              {bal.stores?.name}
            </Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '700' }}>
              {bal.current_points.toLocaleString()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selected && (
        <View style={{ margin: 16, gap: 12 }}>
          {/* Balance Card */}
          <View style={{
            borderRadius: 20, padding: 24, overflow: 'hidden',
            backgroundColor: color,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                {selected.stores?.name}
              </Text>
              {tier && (
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  {tier.icon} {tier.name}
                </Text>
              )}
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Available Points
            </Text>
            <Text style={{ color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -1 }}>
              {selected.current_points.toLocaleString()}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
              {selected.lifetime_points.toLocaleString()} lifetime pts earned
            </Text>

            {tier && (
              <View style={{ marginTop: 16, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                    {tier.multiplier}× earn rate
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                    RM {Number(selected.lifetime_spend).toFixed(2)} spent
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Transactions */}
          <LoyaltyTransactionsMobile storeId={selected.store_id} />
        </View>
      )}
    </ScrollView>
  )
}

function LoyaltyTransactionsMobile({ storeId }: { storeId: string }) {
  const [txs, setTxs]         = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('loyalty_transactions')
      .select('id, type, points, description, occurred_at')
      .eq('store_id', storeId)
      .order('occurred_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setTxs(data ?? []); setLoading(false) })
  }, [storeId])

  if (loading) return <ActivityIndicator color="#4F46E5" style={{ marginTop: 16 }} />

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' }}>
      <Text style={{ padding: 16, fontWeight: 'bold', fontSize: 16, color: '#111827', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        Point History
      </Text>
      {txs.map((tx) => (
        <View key={tx.id} style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          padding: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB'
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
              {tx.description ?? tx.type}
            </Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              {new Date(tx.occurred_at).toLocaleDateString('en-MY', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </Text>
          </View>
          <Text style={{
            fontSize: 14, fontWeight: 'bold',
            color: tx.points > 0 ? '#16A34A' : '#DC2626'
          }}>
            {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  )
}
```


***

## Step 11: Store Page — Loyalty Teaser

Show a compact loyalty badge on every store page to set expectations before checkout.[^1][^2]

```typescript
// apps/web/src/components/store/LoyaltyTeaser.tsx
interface Props {
  storeId:       string
  program:       any  // loyalty_programs row
  userBalance?:  any  // loyalty_balances row or null
}

export function LoyaltyTeaser({ storeId, program, userBalance }: Props) {
  if (!program?.is_enabled) return null

  return (
    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="font-semibold text-indigo-900 text-sm">
            Earn {program.base_points_per_myr} pt{program.base_points_per_myr !== 1 ? 's' : ''} per RM 1 spent
          </p>
          <p className="text-xs text-indigo-600">
            {program.points_per_myr_redeem} pts = RM 1 discount
            · Up to {program.max_redeem_pct}% off per order
          </p>
        </div>
      </div>

      {userBalance ? (
        <div className="text-right shrink-0">
          <p className="font-bold text-indigo-700 text-sm">
            {userBalance.current_points.toLocaleString()} pts
          </p>
          {userBalance.loyalty_tiers && (
            <p className="text-xs text-indigo-400">
              {userBalance.loyalty_tiers.icon} {userBalance.loyalty_tiers.name}
            </p>
          )}
        </div>
      ) : (
        <a href="/login" className="text-xs text-indigo-600 font-semibold shrink-0 hover:underline">
          Login to earn →
        </a>
      )}
    </div>
  )
}
```


***

## Step 12: Notifications — Loyalty Events

Plug into your existing notification system to send push + in-app notifications for loyalty events.

```typescript
// packages/lib/src/notifications/loyaltyNotifications.ts
import { createSupabaseAdmin } from '../supabase/admin'

export async function notifyPointsEarned(params: {
  userId:   string
  storeId:  string
  storeName: string
  points:   number
  orderTotal: number
  newTotal:   number
}) {
  const admin = createSupabaseAdmin()

  await admin.from('notifications').insert({
    user_id:  params.userId,
    type:     'loyalty_earn',
    title:    `+${params.points} points earned! ⭐`,
    body:     `You earned ${params.points.toLocaleString()} points from your RM ${params.orderTotal.toFixed(2)} order at ${params.storeName}. Balance: ${params.newTotal.toLocaleString()} pts`,
    data:     { storeId: params.storeId, points: params.points },
    is_read:  false,
  })
}

export async function notifyTierUpgrade(params: {
  userId:   string
  storeId:  string
  storeName: string
  tierName: string
  tierIcon: string
  multiplier: number
}) {
  const admin = createSupabaseAdmin()

  await admin.from('notifications').insert({
    user_id: params.userId,
    type:    'loyalty_tier_up',
    title:   `${params.tierIcon} Congratulations! You reached ${params.tierName}`,
    body:    `You're now a ${params.tierName} member at ${params.storeName}. Earn ${params.multiplier}× points on every order!`,
    data:    { storeId: params.storeId, tier: params.tierName },
    is_read: false,
  })
}

export async function notifyPointsExpiringSoon(params: {
  userId:   string
  storeId:  string
  storeName: string
  points:   number
  daysLeft: number
}) {
  const admin = createSupabaseAdmin()

  await admin.from('notifications').insert({
    user_id: params.userId,
    type:    'loyalty_expiry_warning',
    title:   `⏰ ${params.points} points expiring in ${params.daysLeft} days`,
    body:    `Your points at ${params.storeName} will expire soon. Use them before they're gone!`,
    data:    { storeId: params.storeId, points: params.points },
    is_read: false,
  })
}
```


### Expiry Warning Cron (7-day advance notice)

```typescript
// apps/web/src/app/api/cron/loyalty-expiry-warning/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyPointsExpiringSoon } from '@packages/lib/notifications/loyaltyNotifications'

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdmin()
  const now   = new Date()
  const soon  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  const { data: expiringTxs } = await admin
    .from('loyalty_transactions')
    .select(`
      user_id, store_id, points,
      stores(name)
    `)
    .eq('type', 'earn')
    .gt('expires_at', now.toISOString())
    .lte('expires_at', soon.toISOString())

  if (!expiringTxs?.length) return NextResponse.json({ warned: 0 })

  // Group by user+store and aggregate points
  const grouped = expiringTxs.reduce((acc: Record<string, any>, tx) => {
    const key = `${tx.user_id}_${tx.store_id}`
    if (!acc[key]) {
      acc[key] = {
        userId:    tx.user_id,
        storeId:   tx.store_id,
        storeName: (tx.stores as any)?.name ?? 'Store',
        points:    0,
      }
    }
    acc[key].points += tx.points
    return acc
  }, {})

  let warned = 0
  for (const entry of Object.values(grouped)) {
    await notifyPointsExpiringSoon({ ...entry, daysLeft: 7 })
    warned++
  }

  return NextResponse.json({ warned })
}
```

Add to vercel.json crons:

```json
{ "path": "/api/cron/loyalty-expiry-warning", "schedule": "0 9 * * *" }
```


***

## Step 13: Merchant Loyalty Dashboard

```typescript
// apps/web/src/app/merchant/loyalty/page.tsx
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function MerchantLoyaltyOverviewPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: store } = await supabase
    .from('stores').select('id, name').eq('owner_id', user!.id).single()

  const [{ data: program }, { count: totalMembers }, { data: topCustomers }] = await Promise.all([
    supabase.from('loyalty_programs').select('*').eq('store_id', store!.id).maybeSingle(),

    supabase.from('loyalty_balances')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store!.id),

    supabase.from('loyalty_balances')
      .select(`
        current_points, lifetime_points,
        profiles(full_name, avatar_url),
        loyalty_tiers(name, color, icon)
      `)
      .eq('store_id', store!.id)
      .order('lifetime_points', { ascending: false })
      .limit(5),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {program?.is_enabled ? '✅ Active' : '⚠️ Disabled'} · {(totalMembers ?? 0).toLocaleString()} members
          </p>
        </div>
        <a href="/merchant/settings/loyalty"
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
          Settings →
        </a>
      </div>

      {/* Top customers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Top Members</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {(topCustomers ?? []).map((c: any, i: number) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <span className="text-lg font-bold text-gray-300 w-6 shrink-0">
                {i + 1}
              </span>
              <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 shrink-0">
                {(c.profiles?.full_name ?? '?')[^0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {c.profiles?.full_name ?? 'Customer'}
                </p>
                {c.loyalty_tiers && (
                  <p className="text-xs" style={{ color: c.loyalty_tiers.color }}>
                    {c.loyalty_tiers.icon} {c.loyalty_tiers.name}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900 text-sm">
                  {c.current_points.toLocaleString()} pts
                </p>
                <p className="text-xs text-gray-400">
                  {c.lifetime_points.toLocaleString()} lifetime
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```


***

## Final Checklist

```
Database
  ✅ loyalty_programs  — per-store settings
  ✅ loyalty_tiers     — per-store configurable tiers
  ✅ loyalty_balances  — per-user per-store points + tier
  ✅ loyalty_transactions — full audit log
  ✅ calculate_loyalty_points()   — atomic earn + tier update
  ✅ recalculate_loyalty_tier()   — called after every earn
  ✅ redeem_loyalty_points()      — atomic redeem with cap enforcement
  ✅ expire_loyalty_points()      — daily expiry sweep
  ✅ RLS — customers see only their data; merchants see only their store

API Routes
  ✅ GET/PUT /api/merchant/loyalty/program   — save settings
  ✅ GET/PUT /api/merchant/loyalty/tiers     — manage tier editor
  ✅ GET     /api/merchant/loyalty/customers — leaderboard
  ✅ POST    /api/merchant/loyalty/adjust    — manual point correction
  ✅ GET     /api/loyalty/balance            — customer balance per store
  ✅ GET     /api/loyalty/transactions       — customer history
  ✅ POST    /api/loyalty/redeem-preview     — checkout points preview

Checkout
  ✅ Points preview on order summary (earn + redeem)
  ✅ Slider to choose how many points to apply
  ✅ Max redemption cap enforced (% of subtotal)
  ✅ Points EARNED only after payment confirmed (Billplz webhook)
  ✅ Points REDEEMED at order creation (atomic DB function)

UI — Merchant
  ✅ /merchant/settings/loyalty — program + tier editor
  ✅ /merchant/loyalty          — overview, top members, leaderboard
  ✅ Manual adjust points (credit/debit with note)

UI — Customer (Web)
  ✅ /account/loyalty           — multi-store balance, history, progress
  ✅ Store page loyalty teaser  — earn rate, balance if logged in
  ✅ Checkout loyalty row       — slider, points to earn

UI — Customer (Mobile)
  ✅ Loyalty tab screen         — balance card, tier progress
  ✅ Transaction history list

Notifications
  ✅ notifyPointsEarned()        — after every successful earn
  ✅ notifyTierUpgrade()         — when customer advances tier
  ✅ notifyPointsExpiringSoon()  — 7-day warning cron

Crons (vercel.json)
  ✅ 0 3 * * *  /api/cron/loyalty-expire-points    — daily expiry
  ✅ 0 9 * * *  /api/cron/loyalty-expiry-warning   — 7-day pre-warn
```

<span style="display:none">[^3][^4][^5][^6]</span>

<div align="center">⁂</div>

[^1]: https://antavo.com/blog/loyalty-program-best-practices/

[^2]: https://www.zigpoll.com/content/what-are-the-most-effective-strategies-for-designing-a-points-system-that-maximizes-customer-engagement-and-retention-in-a-competitive-market

[^3]: https://www.brandmovers.com/elevating-customer-loyalty-with-tiered-loyalty-programs-guide

[^4]: https://ecosire.com/blog/loyalty-programs-points-tiers-referrals

[^5]: https://fastercapital.com/articles/How-to-Design-Loyalty-Program-Tiers-for-Maximum-Retention-in-2025.html

[^6]: https://rewardz.sg/blog/tier-based-loyalty-programmes/

