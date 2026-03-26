<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Customer Frontend Gap Analysis

This report outlines the current state of the customer-facing frontend and identifies key missing features based on typical e-commerce and SME application standards.
Current Implementation Status
Feature AreaStatusNotes
Authentication
✅ Implemented
Login, Register, and Logout functionality exists.
Storefront
✅ Implemented
Dynamic store pages based on tenant slug.
Product Discovery
✅ Implemented
Product list and detail pages are functional.
Cart \& Checkout
✅ Implemented
Basic flow exists with manual/online payment options.
Order History
✅ Implemented
Customers can view their list of orders and order details.
Loyalty Program
🚧 Partial
Basic balance and transaction history exist; redemption integrated into checkout.
Customer Profile
❌ Missing
No page to view or edit user details (name, phone, avatar).
Address Book
❌ Missing
No "Saved Addresses" management; one-time entry during checkout.
Wishlist
❌ Missing
Components exist but are not integrated into the customer account area.
Reviews \& Ratings
❌ Missing
No UI for customers to rate products or view their feedback history.
Notifications
❌ Missing
No customer-facing notification center for order updates or promos.
Detailed Findings \& Recommendations

1. Customer Profile \& Settings
Gap: There is no dedicated page for customers to manage their personal information.
Recommendation: Create apps/web/src/app/account/profile/page.tsx.
Features: Edit full name, phone number, update avatar, and change password.
2. Address Book Management
Gap: Customers have to re-enter their address for every order if not cached by the browser. There is no database table for saved addresses.
Recommendation:
Add a public.customer_addresses table to the database.
Create apps/web/src/app/account/addresses/page.tsx for management.
Integrate address selection into the checkout flow.
3. Wishlist Integration
Gap: While a FashionWishlist component exists, it's not a standard feature across all store types, and there's no "My Wishlist" page in the account area.
Recommendation:
Implement a generic public.wishlists table.
Create apps/web/src/app/account/wishlist/page.tsx.
Add "Add to Wishlist" buttons to ProductCard.
4. Review System
Gap: Merchants have a "Reviews" section in the schema, but customers can't leave them yet.
Recommendation:
Add a "Leave a Review" button on the Order Detail page after an order is 'delivered'.
Create a "My Reviews" section in the account area.
5. Account Dashboard
Gap: The /account route currently doesn't have a landing page; it's just a folder for sub-routes.
Recommendation: Create apps/web/src/app/account/page.tsx as a dashboard showing:
Recent Order status.
Loyalty points summary.
Quick links to Profile, Addresses, and Wishlist.
Proposed Database Schema Updates
sql
-- For Address Book
CREATE TABLE public.customer_addresses (
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
label       TEXT, -- e.g., 'Home', 'Office'
full_name   TEXT NOT NULL,
phone       TEXT NOT NULL,
address     TEXT NOT NULL,
lat         DOUBLE PRECISION,
lng         DOUBLE PRECISION,
is_default  BOOLEAN DEFAULT false,
created_at  TIMESTAMPTZ DEFAULT now()
);
-- For Wishlist
CREATE TABLE public.wishlists (
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
created_at  TIMESTAMPTZ DEFAULT now(),
UNIQUE(customer_id, product_id)
);

Here is the complete full implementation of all five missing feature areas from the gap analysis.[^1][^2][^3]

***

# Customer Account — Full Gap Remediation

## File Structure

```
apps/web/src/
├── app/account/
│   ├── layout.tsx                    ← Account shell with sidebar nav
│   ├── page.tsx                      ← Account dashboard
│   ├── profile/page.tsx              ← Edit profile + avatar upload
│   ├── addresses/page.tsx            ← Address book management
│   ├── wishlist/page.tsx             ← Wishlist page
│   ├── reviews/page.tsx              ← My reviews history
│   └── notifications/page.tsx        ← Customer notification center
├── components/account/
│   ├── AvatarUpload.tsx
│   ├── AddressCard.tsx
│   ├── AddressFormModal.tsx
│   ├── WishlistGrid.tsx
│   ├── ReviewCard.tsx
│   └── LeaveReviewModal.tsx
├── lib/actions/
│   ├── profile.ts                    ← Server Actions
│   ├── addresses.ts
│   ├── wishlist.ts
│   └── reviews.ts
supabase/migrations/
└── 20260326_customer_account.sql     ← All schema + RLS
```


***

## 1. Database Migration + RLS

**`supabase/migrations/20260326_customer_account.sql`**:[^2][^3]

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMER ADDRESSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label        TEXT,                    -- 'Home', 'Office', 'Other'
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city         TEXT NOT NULL,
  state        TEXT NOT NULL,
  postcode     TEXT NOT NULL,
  country      TEXT NOT NULL DEFAULT 'Malaysia',
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one default address per customer enforced via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_default_idx
  ON public.customer_addresses(customer_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx
  ON public.customer_addresses(customer_id, created_at DESC);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_own_addresses" ON public.customer_addresses
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- WISHLISTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlists (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlists_customer_idx
  ON public.wishlists(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wishlists_product_idx
  ON public.wishlists(product_id);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_own_wishlist" ON public.wishlists
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCT REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT,
  images       TEXT[] DEFAULT '{}',
  is_verified  BOOLEAN NOT NULL DEFAULT true,  -- always true when from order
  is_visible   BOOLEAN NOT NULL DEFAULT true,
  merchant_reply TEXT,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, order_id, product_id)    -- one review per order item
);

CREATE INDEX IF NOT EXISTS reviews_product_rating_idx
  ON public.product_reviews(product_id, is_visible, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_customer_idx
  ON public.product_reviews(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_store_idx
  ON public.product_reviews(store_id, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Customers can only see visible reviews (and their own drafts)
CREATE POLICY "reviews_read" ON public.product_reviews
  FOR SELECT USING (is_visible = true OR auth.uid() = customer_id);

-- Customers can only insert reviews for their own orders
CREATE POLICY "reviews_insert" ON public.product_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id
        AND user_id = auth.uid()
        AND status IN ('delivered', 'completed')
    )
  );

CREATE POLICY "reviews_update_own" ON public.product_reviews
  FOR UPDATE USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Auto-update product rating on insert/update
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET
    rating       = (
      SELECT ROUND(AVG(rating)::NUMERIC, 1)
      FROM public.product_reviews
      WHERE product_id = NEW.product_id AND is_visible = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.product_reviews
      WHERE product_id = NEW.product_id AND is_visible = TRUE
    )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_update_product_rating
  AFTER INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMER NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,       -- 'order_update' | 'promo' | 'loyalty' | 'system'
  title        TEXT NOT NULL,
  body         TEXT,
  link         TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_notif_unread_idx
  ON public.customer_notifications(customer_id, is_read, created_at DESC)
  WHERE is_archived = FALSE;

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_own_notifications" ON public.customer_notifications
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES (extend existing table)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone         TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender        TEXT CHECK (gender IN ('male','female','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT now();

-- Auto-trigger notification on order status change
CREATE OR REPLACE FUNCTION notify_customer_on_order_update()
RETURNS TRIGGER AS $$
DECLARE
  msg RECORD;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT
      CASE NEW.status
        WHEN 'confirmed'        THEN ROW('Order Confirmed', 'Great news! Your order has been confirmed.', '🎉')
        WHEN 'preparing'        THEN ROW('Being Prepared', 'Your order is being prepared now.', '👨‍🍳')
        WHEN 'out_for_delivery' THEN ROW('Out for Delivery', 'Your order is on its way!', '🛵')
        WHEN 'delivered'        THEN ROW('Order Delivered', 'Your order has arrived. Leave a review!', '📦')
        WHEN 'cancelled'        THEN ROW('Order Cancelled', 'Your order has been cancelled.', '❌')
        ELSE NULL
      END INTO msg;

    IF msg IS NOT NULL THEN
      INSERT INTO public.customer_notifications(customer_id, type, title, body, link, metadata)
      SELECT
        NEW.user_id,
        'order_update',
        msg.f1,
        msg.f2,
        '/orders/' || NEW.id,
        jsonb_build_object('order_id', NEW.id, 'status', NEW.status, 'icon', msg.f3)
      WHERE NEW.user_id IS NOT NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_order_customer_notification
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION notify_customer_on_order_update();
```


***

## 2. Server Actions

**`apps/web/src/lib/actions/profile.ts`**:[^1]

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase  = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const fullName  = formData.get('full_name')  as string
  const phone     = formData.get('phone')      as string
  const dob       = formData.get('date_of_birth') as string | null
  const gender    = formData.get('gender')     as string | null

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name:     fullName.trim(),
      phone:         phone?.trim() || null,
      date_of_birth: dob || null,
      gender:        gender || null,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/account')
  revalidatePath('/account/profile')
}

export async function uploadAvatar(formData: FormData): Promise<string> {
  const supabase   = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) throw new Error('No file selected')
  if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB')
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('Only JPEG, PNG, WebP or AVIF files are allowed')
  }

  const ext      = file.name.split('.').pop()
  const filePath = `avatars/${user.id}/avatar-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  revalidatePath('/account/profile')
  return publicUrl
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createServerClient()
  // Verify current password first
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('Not authenticated')

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) throw new Error('Current password is incorrect')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}
```

**`apps/web/src/lib/actions/addresses.ts`**:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { Address } from '@/types/customer'

export async function getAddresses(): Promise<Address[]> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (data ?? []) as Address[]
}

export async function saveAddress(address: Omit<Address, 'id'>, id?: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // If setting as default, unset all others first
  if (address.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', user.id)
  }

  if (id) {
    const { error } = await supabase
      .from('customer_addresses')
      .update({ ...address, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('customer_id', user.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('customer_addresses')
      .insert({ ...address, customer_id: user.id })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/account/addresses')
  revalidatePath('/checkout')
}

export async function deleteAddress(id: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', id)
    .eq('customer_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/account/addresses')
}

export async function setDefaultAddress(id: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', user.id)

  await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('customer_id', user.id)

  revalidatePath('/account/addresses')
}
```

**`apps/web/src/lib/actions/wishlist.ts`**:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export async function toggleWishlist(
  productId: string,
  storeId: string
): Promise<{ wishlisted: boolean }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('customer_id', user.id)
    .eq('product_id', productId)
    .single()

  if (existing) {
    await supabase.from('wishlists').delete().eq('id', existing.id)
    revalidatePath('/account/wishlist')
    return { wishlisted: false }
  } else {
    await supabase.from('wishlists').insert({
      customer_id: user.id,
      product_id: productId,
      store_id: storeId,
    })
    revalidatePath('/account/wishlist')
    return { wishlisted: true }
  }
}

export async function getWishlistIds(productIds: string[]): Promise<Set<string>> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data } = await supabase
    .from('wishlists')
    .select('product_id')
    .eq('customer_id', user.id)
    .in('product_id', productIds)

  return new Set((data ?? []).map((d) => d.product_id))
}
```

**`apps/web/src/lib/actions/reviews.ts`**:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export interface ReviewInput {
  product_id: string
  store_id: string
  order_id: string
  rating: number
  title?: string
  body?: string
}

export async function submitReview(input: ReviewInput) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (input.rating < 1 || input.rating > 5) throw new Error('Rating must be 1–5')

  const { error } = await supabase
    .from('product_reviews')
    .upsert({
      customer_id: user.id,
      ...input,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'customer_id,order_id,product_id' })

  if (error) throw new Error(error.message)
  revalidatePath(`/orders/${input.order_id}`)
  revalidatePath('/account/reviews')
}

export async function getMyReviews() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('product_reviews')
    .select(`
      id, rating, title, body, created_at, updated_at,
      products ( id, name, image_url ),
      stores ( id, name, slug )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getPendingReviews() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('order_items')
    .select(`
      id, product_id, product_name, product_image, order_id,
      orders!inner( id, status, created_at, store_id,
        stores( id, name, slug )
      )
    `)
    .eq('orders.user_id', user.id)
    .in('orders.status', ['delivered', 'completed'])
    .not('product_reviews.id', 'is', null)  // exclude already reviewed

  return data ?? []
}
```


***

## 3. Account Layout

**`apps/web/src/app/account/layout.tsx`**:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import Image from 'next/image'

const NAV_ITEMS = [
  { href: '/account',               icon: '🏠', label: 'Dashboard'      },
  { href: '/account/profile',       icon: '👤', label: 'Profile'        },
  { href: '/account/addresses',     icon: '📍', label: 'Addresses'      },
  { href: '/account/wishlist',      icon: '❤️',  label: 'Wishlist'       },
  { href: '/account/reviews',       icon: '⭐', label: 'My Reviews'     },
  { href: '/account/notifications', icon: '🔔', label: 'Notifications'  },
  { href: '/orders',                icon: '📦', label: 'Order History'  },
]

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-6">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-full lg:w-64 shrink-0 space-y-3">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3 shadow-sm">
            <div className="relative shrink-0">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                  {(profile?.full_name ?? user.email ?? 'U')[^0].toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {profile?.full_name ?? 'My Account'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Nav items */}
          <nav className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {NAV_ITEMS.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
                  i < NAV_ITEMS.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sign out */}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full text-left flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-semibold text-red-500 bg-white border border-gray-100 hover:bg-red-50 transition-colors shadow-sm"
            >
              <span>🚪</span> Sign out
            </button>
          </form>
        </aside>

        {/* ── Page content ───────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
```


***

## 4. Account Dashboard

**`apps/web/src/app/account/page.tsx`**:

```tsx
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

const QUICK_LINKS = [
  { href: '/account/profile',       icon: '👤', label: 'Edit Profile',    desc: 'Name, phone, avatar'   },
  { href: '/account/addresses',     icon: '📍', label: 'Addresses',       desc: 'Manage saved addresses' },
  { href: '/account/wishlist',      icon: '❤️',  label: 'Wishlist',        desc: 'Saved products'        },
  { href: '/account/reviews',       icon: '⭐', label: 'Reviews',         desc: 'Rate your purchases'    },
  { href: '/account/notifications', icon: '🔔', label: 'Notifications',   desc: 'Order updates & promos' },
  { href: '/orders',                icon: '📦', label: 'Order History',   desc: 'All past orders'        },
]

const ORDER_STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  pending:           { icon: '⏳', color: '#F59E0B', bg: '#FFFBEB' },
  confirmed:         { icon: '✅', color: '#3B82F6', bg: '#EFF6FF' },
  preparing:         { icon: '👨‍🍳', color: '#8B5CF6', bg: '#F5F3FF' },
  out_for_delivery:  { icon: '🛵', color: '#F59E0B', bg: '#FFFBEB' },
  delivered:         { icon: '📦', color: '#10B981', bg: '#ECFDF5' },
  completed:         { icon: '🎉', color: '#10B981', bg: '#ECFDF5' },
  cancelled:         { icon: '❌', color: '#EF4444', bg: '#FEF2F2' },
}

export default async function AccountPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account')

  const [profileRes, ordersRes, loyaltyRes, notifRes] = await Promise.all([
    supabase.from('profiles').select('full_name, loyalty_points').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('id, status, created_at, total, stores(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('loyalty_transactions')
      .select('points, type, created_at, description')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('customer_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .eq('is_read', false),
  ])

  const profile      = profileRes.data
  const orders       = ordersRes.data ?? []
  const loyalty      = loyaltyRes.data ?? []
  const unreadNotifs = notifRes.count ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[^0] ?? 'there'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your account, orders, and preferences
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: '📦', color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Loyalty Points', value: (profile?.loyalty_points ?? 0).toLocaleString(), icon: '🏆', color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Unread Alerts', value: unreadNotifs, icon: '🔔', color: '#8B5CF6', bg: '#F5F3FF', href: '/account/notifications' },
          { label: 'Active Orders', value: orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length, icon: '🛵', color: '#10B981', bg: '#ECFDF5' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-500 font-semibold truncate">{s.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: s.bg }}>
                {s.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-900 text-sm">Account Settings</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-50">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                {link.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{link.label}</p>
                <p className="text-xs text-gray-400 truncate">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm">Recent Orders</h2>
          <Link href="/orders" className="text-xs text-indigo-600 font-semibold hover:underline">
            View all →
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm font-bold text-gray-900">No orders yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Start shopping to see orders here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => {
              const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ backgroundColor: cfg.bg }}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {(order.stores as any)?.name ?? 'Store'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">RM {order.total.toFixed(2)}</p>
                    <span className="text-xs font-bold capitalize" style={{ color: cfg.color }}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Loyalty summary */}
      {loyalty.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              🏆 Loyalty Points
            </h2>
            <p className="text-2xl font-bold text-amber-700">
              {(profile?.loyalty_points ?? 0).toLocaleString()} pts
            </p>
          </div>
          <div className="space-y-1.5">
            {loyalty.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-amber-700">{t.description ?? t.type}</span>
                <span className={`font-bold ${t.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'earn' ? '+' : '-'}{t.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```


***

## 5. Profile Page

**`apps/web/src/app/account/profile/page.tsx`**:

```tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './ProfileForm'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, avatar_url, date_of_birth, gender')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Update your personal information and account details
        </p>
      </div>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ''}
        profile={profile ?? { full_name: null, phone: null, avatar_url: null, date_of_birth: null, gender: null }}
      />
    </div>
  )
}
```

**`apps/web/src/app/account/profile/ProfileForm.tsx`**:

```tsx
'use client'
import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { updateProfile, uploadAvatar, changePassword } from '@/lib/actions/profile'

interface ProfileData {
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  date_of_birth: string | null
  gender: string | null
}

export function ProfileForm({
  userId, email, profile,
}: {
  userId: string
  email: string
  profile: ProfileData
}) {
  const [avatarUrl, setAvatarUrl]       = useState(profile.avatar_url)
  const [uploading, setUploading]       = useState(false)
  const [profileMsg, setProfileMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition]    = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[^0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const url = await uploadAvatar(fd)
      setAvatarUrl(url)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileMsg(null)
    startTransition(async () => {
      try {
        await updateProfile(new FormData(e.currentTarget))
        setProfileMsg({ ok: true, text: 'Profile updated successfully!' })
      } catch (err: any) {
        setProfileMsg({ ok: false, text: err.message })
      }
    })
  }

  async function handlePasswordSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordMsg(null)
    const fd = new FormData(e.currentTarget)
    const current = fd.get('current_password') as string
    const newPw   = fd.get('new_password')     as string
    const confirm = fd.get('confirm_password') as string
    if (newPw !== confirm) {
      setPasswordMsg({ ok: false, text: 'New passwords do not match.' })
      return
    }
    if (newPw.length < 8) {
      setPasswordMsg({ ok: false, text: 'Password must be at least 8 characters.' })
      return
    }
    startTransition(async () => {
      try {
        await changePassword(current, newPw)
        setPasswordMsg({ ok: true, text: 'Password changed successfully.' })
        ;(e.target as HTMLFormElement).reset()
      } catch (err: any) {
        setPasswordMsg({ ok: false, text: err.message })
      }
    })
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-gray-900 placeholder-gray-400 transition-all'

  return (
    <div className="space-y-6">
      {/* ── Avatar Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-indigo-100 to-purple-100">
                {(profile.full_name ?? email)[^0].toUpperCase()}
              </div>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <p className="font-bold text-gray-900">{profile.full_name ?? 'Your Name'}</p>
          <p className="text-sm text-gray-400 mt-0.5">{email}</p>
          <div className="flex gap-2 mt-3 justify-center sm:justify-start">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : '📷 Change Photo'}
            </button>
            {avatarUrl && (
              <button
                onClick={() => setAvatarUrl(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">JPG, PNG or WebP · Max 5MB</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* ── Personal Info Form ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">👤 Personal Information</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                name="full_name"
                type="text"
                defaultValue={profile.full_name ?? ''}
                required
                className={inputClass}
                placeholder="Ali bin Ahmad"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ''}
                className={inputClass}
                placeholder="+60 12-345 6789"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <input
                name="date_of_birth"
                type="date"
                defaultValue={profile.date_of_birth ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select name="gender" defaultValue={profile.gender ?? ''} className={inputClass}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Other</option>
              </select>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
          </div>

          {profileMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-semibold px-4 py-3 rounded-xl flex items-center gap-2 ${
                profileMsg.ok
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {profileMsg.ok ? '✅' : '⚠️'} {profileMsg.text}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm"
          >
            {isPending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* ── Change Password ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">🔐 Change Password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
          {(['current_password', 'new_password', 'confirm_password'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 capitalize">
                {field.replace(/_/g, ' ')}
              </label>
              <div className="relative">
                <input
                  name={field}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={field === 'current_password' ? 1 : 8}
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-lg"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          ))}

          {passwordMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-semibold px-4 py-3 rounded-xl flex items-center gap-2 ${
                passwordMsg.ok
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {passwordMsg.ok ? '✅' : '⚠️'} {passwordMsg.text}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {isPending ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
```


***

## 6. Address Book Page

**`apps/web/src/app/account/addresses/page.tsx`**:

```tsx
import { getAddresses } from '@/lib/actions/addresses'
import { AddressesClient } from './AddressesClient'

export const metadata = { title: 'Address Book' }

export default async function AddressesPage() {
  const addresses = await getAddresses()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Address Book</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Saved delivery addresses for faster checkout
        </p>
      </div>
      <AddressesClient initialAddresses={addresses} />
    </div>
  )
}
```

**`apps/web/src/app/account/addresses/AddressesClient.tsx`**:

```tsx
'use client'
import { useState, useOptimistic } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { saveAddress, deleteAddress, setDefaultAddress } from '@/lib/actions/addresses'
import { AddressFormModal } from '@/components/account/AddressFormModal'
import type { Address } from '@/types/customer'

export function AddressesClient({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses]   = useState<Address[]>(initialAddresses)
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<Address | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)

  async function handleSave(data: Omit<Address, 'id'>) {
    await saveAddress(data, editing?.id)
    setShowModal(false)
    setEditing(null)
    // Optimistic update: refetch via router.refresh() or re-fetch
    window.location.reload()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this address?')) return
    setDeleting(id)
    await deleteAddress(id)
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    setDeleting(null)
  }

  async function handleSetDefault(id: string) {
    await setDefaultAddress(id)
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === id }))
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence>
          {addresses.map((addr) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white rounded-2xl border-2 p-5 shadow-sm relative ${
                addr.is_default ? 'border-indigo-300' : 'border-gray-100'
              }`}
            >
              {addr.is_default && (
                <span className="absolute top-3 right-3 text-xs font-bold bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full">
                  Default
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-lg shrink-0">
                  {addr.label === 'home' ? '🏠' : addr.label === 'office' ? '🏢' : '📍'}
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <p className="font-bold text-gray-900 text-sm">{addr.full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                    {addr.address_line_1}
                    {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                    <br />
                    {addr.postcode} {addr.city}, {addr.state}
                  </p>
                  {addr.notes && (
                    <p className="text-xs text-gray-400 italic mt-1">{addr.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                <button
                  onClick={() => { setEditing(addr); setShowModal(true) }}
                  className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ✏️ Edit
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => handleSetDefault(addr.id!)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    ⭐ Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(addr.id!)}
                  disabled={deleting === addr.id}
                  className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto disabled:opacity-50"
                >
                  {deleting === addr.id ? '…' : '🗑️ Delete'}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add new card */}
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all min-h-[140px]"
        >
          <span className="text-3xl">➕</span>
          <span className="text-sm font-bold">Add New Address</span>
        </button>
      </div>

      <AddressFormModal
        open={showModal}
        address={editing}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSave={handleSave}
      />
    </>
  )
}
```


***

## 7. Address Form Modal

**`apps/web/src/components/account/AddressFormModal.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Address } from '@/types/customer'

const MY_STATES = ['Johor','Kedah','Kelantan','Melaka','Negeri Sembilan','Pahang','Perak','Perlis','Pulau Pinang','Sabah','Sarawak','Selangor','Terengganu','Kuala Lumpur','Labuan','Putrajaya']

interface Props {
  open: boolean
  address: Address | null
  onClose: () => void
  onSave: (data: Omit<Address, 'id'>) => Promise<void>
}

export function AddressFormModal({ open, address, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState<Omit<Address, 'id'>>({
    full_name:     address?.full_name     ?? '',
    phone:         address?.phone         ?? '',
    address_line_1:address?.address_line_1?? '',
    address_line_2:address?.address_line_2?? '',
    city:          address?.city          ?? '',
    state:         address?.state         ?? '',
    postcode:      address?.postcode      ?? '',
    country:       'Malaysia',
    is_default:    address?.is_default    ?? false,
    label:         address?.label         ?? 'home',
    notes:         address?.notes         ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-gray-900'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl z-50 overflow-y-auto max-h-[92vh] shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900">
                  {address ? 'Edit Address' : 'Add New Address'}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl font-bold w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Label */}
                <div className="flex gap-2">
                  {(['home', 'office', 'other'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, label: l }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 capitalize transition-all ${
                        form.label === l
                          ? 'bg-indigo-600 text-white border-transparent'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {l === 'home' ? '🏠' : l === 'office' ? '🏢' : '📍'} {l}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Full Name *</label>
                    <input type="text" required value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className={inputClass} placeholder="Ali Ahmad" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Phone *</label>
                    <input type="tel" required value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className={inputClass} placeholder="+60 12-345 6789" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Address Line 1 *</label>
                  <input type="text" required value={form.address_line_1}
                    onChange={(e) => setForm((f) => ({ ...f, address_line_1: e.target.value }))}
                    className={inputClass} placeholder="Unit/Block, Street name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Address Line 2</label>
                  <input type="text" value={form.address_line_2 ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, address_line_2: e.target.value }))}
                    className={inputClass} placeholder="Taman, area, landmark" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Postcode *</label>
                    <input type="text" required maxLength={5} value={form.postcode}
                      onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
                      className={inputClass} placeholder="50000" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">City *</label>
                    <input type="text" required value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className={inputClass} placeholder="Kuala Lumpur" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">State *</label>
                    <select required value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                      className={inputClass}>
                      <option value="">Select</option>
                      {MY_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Delivery Notes</label>
                  <input type="text" value={form.notes ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className={inputClass} placeholder="Leave at door, call on arrival, etc." />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_default}
                    onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm text-gray-600 font-medium">Set as default address</span>
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                >
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {saving ? 'Saving…' : (address ? 'Update Address' : 'Save Address')}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```


***

## 8. Wishlist Page

**`apps/web/src/app/account/wishlist/page.tsx`**:

```tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { WishlistGrid } from './WishlistGrid'

export const metadata = { title: 'My Wishlist' }

export default async function WishlistPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account/wishlist')

  const { data } = await supabase
    .from('wishlists')
    .select(`
      id, created_at, product_id,
      products ( id, name, price, sale_price, image_url, is_available, stock_qty, rating, is_on_sale, brand ),
      stores   ( id, name, slug, primary_color )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.length ?? 0} saved items</p>
        </div>
      </div>
      <WishlistGrid initialItems={data ?? []} />
    </div>
  )
}
```

**`apps/web/src/app/account/wishlist/WishlistGrid.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleWishlist } from '@/lib/actions/wishlist'

export function WishlistGrid({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)

  async function handleRemove(wishlistId: string, productId: string, storeId: string) {
    setItems((prev) => prev.filter((i) => i.id !== wishlistId))
    await toggleWishlist(productId, storeId)
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 text-center py-20 shadow-sm">
        <p className="text-5xl mb-3">❤️</p>
        <p className="font-bold text-gray-900">Your wishlist is empty</p>
        <p className="text-sm text-gray-400 mt-1">Save products you love by tapping ❤️ on any product</p>
        <Link
          href="/"
          className="mt-5 inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Browse Stores
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <AnimatePresence>
        {items.map((item) => {
          const p = item.products
          const s = item.stores
          const displayPrice = p.is_on_sale && p.sale_price ? p.sale_price : p.price
          const unavailable  = !p.is_available || p.stock_qty <= 0

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm group"
            >
              <div className="relative aspect-[4/3] bg-gray-50">
                {p.image_url ? (
                  <Image src={p.image_url} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="25vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200 text-4xl">🖼️</div>
                )}
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id, p.id, s.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-white shadow-sm transition-all"
                  aria-label="Remove from wishlist"
                >
                  ❤️
                </button>
                {unavailable && (
                  <div className="absolute inset-0 bg-white/75 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-xs font-bold text-gray-500">Out of Stock</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                {p.brand && <p className="text-xs text-gray-400 truncate">{p.brand}</p>}
                <p className="text-sm font-bold text-gray-900 line-clamp-2 mt-0.5">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">📍 {s.name}</p>

                <div className="flex items-center justify-between mt-2.5">
                  <div>
                    <p className={`text-sm font-bold ${p.is_on_sale ? 'text-red-600' : 'text-gray-900'}`}>
                      RM {displayPrice.toFixed(2)}
                    </p>
                    {p.is_on_sale && (
                      <p className="text-xs text-gray-400 line-through">RM {p.price.toFixed(2)}</p>
                    )}
                  </div>
                  <Link
                    href={`/stores/${s.slug}/products/${p.id}`}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: s.primary_color ?? '#6366f1' }}
                  >
                    View →
                  </Link>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
```


***

## 9. Reviews Page + Leave Review Modal

**`apps/web/src/app/account/reviews/page.tsx`**:

```tsx
import { getMyReviews } from '@/lib/actions/reviews'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewsClient } from './ReviewsClient'

export const metadata = { title: 'My Reviews' }

export default async function ReviewsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch reviewed + pending review items
  const [reviews, pendingRes] = await Promise.all([
    getMyReviews(),
    supabase.rpc('get_pending_reviews', { p_user_id: user.id }).select('*'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Rate products from your delivered orders
        </p>
      </div>
      <ReviewsClient reviews={reviews} />
    </div>
  )
}
```

**`apps/web/src/app/account/reviews/ReviewsClient.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LeaveReviewModal } from '@/components/account/LeaveReviewModal'
import { formatDistanceToNow } from 'date-fns'

export function ReviewsClient({ reviews }: { reviews: any[] }) {
  const [reviewing, setReviewing] = useState<any | null>(null)

  function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
    return (
      <div className={`flex gap-0.5 ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>
        {[1,2,3,4,5].map((i) => (
          <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 text-center py-20 shadow-sm">
        <p className="text-5xl mb-3">⭐</p>
        <p className="font-bold text-gray-900">No reviews yet</p>
        <p className="text-sm text-gray-400 mt-1">Reviews appear after orders are delivered.</p>
        <Link href="/orders" className="mt-4 inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
          View Orders
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {reviews.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex gap-4">
              {/* Product image */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {r.products?.image_url ? (
                  <Image src={r.products.image_url} alt={r.products.name} width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{r.products?.name}</p>
                    <Link
                      href={`/stores/${r.stores?.slug}`}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {r.stores?.name}
                    </Link>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>

                <StarDisplay rating={r.rating} />

                {r.title && (
                  <p className="text-sm font-semibold text-gray-900 mt-1.5">{r.title}</p>
                )}
                {r.body && (
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-3">{r.body}</p>
                )}

                {/* Edit button */}
                <button
                  onClick={() => setReviewing(r)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 mt-2 flex items-center gap-1 hover:underline"
                >
                  ✏️ Edit review
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <LeaveReviewModal
        open={!!reviewing}
        review={reviewing}
        onClose={() => setReviewing(null)}
        onSaved={() => { setReviewing(null); window.location.reload() }}
      />
    </>
  )
}
```

**`apps/web/src/components/account/LeaveReviewModal.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { submitReview, type ReviewInput } from '@/lib/actions/reviews'

interface Props {
  open: boolean
  review: any                // order item or existing review
  onClose: () => void
  onSaved: () => void
  // When called from Order Detail page:
  productId?: string
  storeId?: string
  orderId?: string
  productName?: string
  productImage?: string | null
}

export function LeaveReviewModal({
  open, review, onClose, onSaved,
  productId, storeId, orderId, productName, productImage,
}: Props) {
  const isEdit  = !!review?.rating
  const [rating, setRating]   = useState<number>(review?.rating ?? 0)
  const [hovered, setHovered] = useState<number>(0)
  const [title, setTitle]     = useState(review?.title ?? '')
  const [body, setBody]       = useState(review?.body ?? '')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const displayRating = hovered || rating

  const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating'); return }
    setSaving(true)
    setError(null)
    try {
      await submitReview({
        product_id: productId ?? review.product_id,
        store_id:   storeId   ?? review.store_id,
        order_id:   orderId   ?? review.order_id,
        rating,
        title: title.trim() || undefined,
        body:  body.trim()  || undefined,
      })
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const imgSrc  = productImage ?? review?.products?.image_url
  const pName   = productName  ?? review?.products?.name ?? 'Product'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl z-50 shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Review' : 'Leave a Review'}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 font-bold">✕</button>
            </div>

            {/* Product info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 mb-5">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                {imgSrc ? (
                  <Image src={imgSrc} alt={pName} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📦</div>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">{pName}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star selector */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Your Rating *</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(i)}
                      className={`text-4xl transition-all ${i <= displayRating ? 'text-yellow-400 scale-110' : 'text-gray-200 hover:text-yellow-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {displayRating > 0 && (
                  <p className="text-sm font-bold text-yellow-600">{STAR_LABELS[displayRating]}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Review Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="Summarise your experience"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Your Review (optional)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="What did you like or dislike? Would you recommend it?"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{body.length}/1000</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5 border border-red-100">
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || rating === 0}
                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {saving ? 'Submitting…' : isEdit ? 'Update Review' : 'Submit Review ⭐'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```


***

## 10. "Leave a Review" Button on Order Detail

Add to the existing order detail page after order status is `delivered` or `completed`:

```tsx
// apps/web/src/app/orders/[id]/page.tsx — inside order items loop:
{(order.status === 'delivered' || order.status === 'completed') && (
  <div className="mt-3 pt-3 border-t border-gray-50">
    {item.review_id ? (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
        <span>✅</span> Reviewed — {item.rating}★
      </div>
    ) : (
      <button
        onClick={() => setReviewing(item)}
        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 hover:underline transition-colors"
      >
        ⭐ Leave a Review
      </button>
    )}
  </div>
)}

// Add modal at bottom of the page component:
<LeaveReviewModal
  open={!!reviewing}
  review={null}
  productId={reviewing?.product_id}
  storeId={order.store_id}
  orderId={order.id}
  productName={reviewing?.product_name}
  productImage={reviewing?.product_image}
  onClose={() => setReviewing(null)}
  onSaved={() => { setReviewing(null); router.refresh() }}
/>
```


***

## 11. Wishlist Heart Button on ProductCard

Add to `components/products/ProductCard.tsx` (the canonical card from last session):[^4]

```tsx
// Import at top of ProductCard.tsx:
import { toggleWishlist } from '@/lib/actions/wishlist'

// Add inside Props interface:
isWishlisted?: boolean
onWishlistToggle?: (productId: string, wishlisted: boolean) => void

// Add inside the image container, next to cart qty badge:
{onWishlistToggle && (
  <motion.button
    whileTap={{ scale: 0.8 }}
    onClick={async (e) => {
      e.preventDefault()
      const result = await toggleWishlist(product.id, product.store_id)
      onWishlistToggle?.(product.id, result.wishlisted)
    }}
    className="absolute top-2 left-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110"
    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
  >
    <span className={isWishlisted ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}>
      ❤️
    </span>
  </motion.button>
)}
```


***

## 12. Implementation Checklist

Run the migration and install:

```bash
# Apply migration
supabase db push

# Install Supabase storage bucket for avatars
supabase storage create-bucket avatars --public

# No new packages needed — already have framer-motion from previous session
```


***

## Gap Resolution Summary

| Gap | Solution |
| :-- | :-- |
| **Profile** | `ProfileForm` with avatar upload to Supabase Storage, name/phone/DOB edit, inline password change with current-password verification [^1] |
| **Addresses** | `customer_addresses` table with partial unique index for default, full CRUD via Server Actions, animated modal with Malaysian state dropdown |
| **Wishlist** | `wishlists` table, `toggleWishlist` Server Action, heart button on `ProductCard`, full wishlist page with optimistic removal |
| **Reviews** | `product_reviews` table with DB trigger auto-updating product rating, `LeaveReviewModal` on Order Detail for delivered items, reviews history page with edit |
| **Account Dashboard** | Unified landing at `/account` with stats, quick links, recent orders, loyalty points summary |
| **Notifications** | `customer_notifications` table with Postgres trigger on `orders.status` change — auto-fires on `confirmed`, `out_for_delivery`, `delivered` etc. |
| **RLS Security** | Every new table has `auth.uid() = customer_id` policies — zero cross-customer data leakage [^2][^3] |

<span style="display:none">[^10][^11][^12][^13][^14][^15][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

[^2]: https://supabase.com/docs/guides/database/postgres/row-level-security

[^3]: https://designrevision.com/blog/supabase-row-level-security

[^4]: https://www.reddit.com/r/Supabase/comments/1ht7ksb/how_to_upload_an_image_to_supabase_storage_and/

[^5]: https://stackoverflow.com/questions/79328313/how-to-upload-an-image-to-supabase-storage-and-store-the-public-url-in-a-form-us

[^6]: https://www.youtube.com/watch?v=q1vAOlupxQ4

[^7]: https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp

[^8]: https://kodaschool.com/blog/next-js-and-supabase-how-to-store-and-serve-images

[^9]: https://supabase.com/features/row-level-security

[^10]: https://www.youtube.com/watch?v=87JAdYPC2n0

[^11]: https://github.com/orgs/supabase/discussions/33731

[^12]: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx

[^13]: https://supabase.com/docs/guides/storage/uploads/standard-uploads

[^14]: https://supabase.com/blog/supabase-security-2025-retro

[^15]: https://www.youtube.com/watch?v=Qhuxvk9-Zkw

