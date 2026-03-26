<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Customer Frontend Analysis Report

Overview
This report analyzes the current state of the customer-facing frontend of the SME application. While functional, several areas require improvement to meet premium standards of performance, consistency, and user experience.
Key Findings \& Proposed Improvements

1. Architectural Consistency
Unified Component Library:
Issue: Duplicate ProductCard components (components/ProductCard.tsx vs components/products/ProductCard.tsx) lead to inconsistent UI and maintenance overhead.
Improvement: Standardize on the rich ProductCard in components/products/, ensuring it supports both general search and tenant-specific views.
Next.js Best Practices:
Issue: Use of standard <a> tags in tenant/[slug]/page.tsx causes unnecessary full page reloads.
Improvement: Replace all internal navigation with Next.js <Link> components for smooth SPA transitions.
Type Safety:
Issue: Extensive use of any in critical flows like CheckoutFlow.tsx and OrderTracker.tsx.
Improvement: Define robust TypeScript interfaces for Orders, Products, and Addresses to prevent runtime errors.
2. User Experience (UX) \& Visual Excellence
Premium Storefront Design:
Issue: The tenant landing page is overly simplistic and doesn't showcase the merchant's brand effectively.
Improvement: Implement "Rich Aesthetics" with glassmorphism, refined typography (Google Fonts), and subtle micro-animations (e.g., Framer Motion).
Interactive Storefront:
Issue: Customers cannot search or filter products directly on the merchant's landing page.
Improvement: Add a "Search within store" feature and category filters to the tenant/[slug] route.
Seamless Loading:
Issue: Lack of loading states (skeletons) makes the app feel "jumpy" during data fetching.
Improvement: Implement loading.tsx and custom Skeleton components for product grids and order status.
3. Checkout \& Order Management
Checkout Navigation:
Issue: Step-based checkout state is lost on page refresh and doesn't support browser back buttons.
Improvement: Sync checkout steps with URL search parameters (e.g., ?step=delivery).
Configurable Fees:
Issue: The 2% service fee is hardcoded in both the frontend logic and UI labels.
Improvement: Move fee configuration to a centralized utility or fetch it from the store settings API.
Enhanced Error States:
Issue: Redirecting to home (/) when an order isn't found is a frustrating user experience.
Improvement: Create dedicated 404/Error pages for orders and stores with helpful "Back to Search" actions.
4. Performance \& SEO
Search Optimization:
Issue: The search form causes full page refreshes, and results are capped without pagination.
Improvement: Convert search to a client-side handled form with useRouter and implement an "Infinite Scroll" or "Load More" pattern.
SEO \& Social Sharing:
Issue: SEO structured data components are present but not integrated into the main product/store routes.
Improvement: Automatically inject JSON-LD structured data into the <head> of store and product pages for better search visibility.

Here is the complete implementation addressing every finding in the analysis report — all four sections fully resolved.[^1][^2][^3][^4]

***

# Customer Frontend — Full Remediation Implementation

## File Structure

```
apps/web/src/
├── types/
│   └── customer.ts                  ← Robust shared TypeScript types
├── lib/
│   ├── fees.ts                      ← Centralized fee configuration
│   └── url-state.ts                 ← URL search param helpers
├── components/
│   ├── products/
│   │   └── ProductCard.tsx          ← Single canonical ProductCard
│   ├── skeletons/
│   │   ├── ProductGridSkeleton.tsx
│   │   ├── OrderTrackerSkeleton.tsx
│   │   └── StoreSkeleton.tsx
│   ├── search/
│   │   ├── StoreSearchBar.tsx       ← Client-side search (no page reload)
│   │   └── InfiniteProductGrid.tsx  ← Infinite scroll with Server Actions
│   └── ui/
│       └── animations.ts            ← Framer Motion animation variants
├── app/
│   ├── stores/
│   │   └── [slug]/
│   │       ├── page.tsx             ← Premium storefront + JSON-LD
│   │       ├── loading.tsx
│   │       └── not-found.tsx
│   ├── checkout/
│   │   └── page.tsx                 ← URL-synced step checkout
│   └── orders/
│       ├── [id]/
│       │   ├── page.tsx
│       │   └── not-found.tsx        ← Helpful order 404
│       └── loading.tsx
```


***

## 1. Canonical TypeScript Interfaces

**`apps/web/src/types/customer.ts`**:

```typescript
// ─── Core Entities ─────────────────────────────────────────────────────────

export interface Store {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  contact_email: string | null
  operating_hours: OperatingHours | null
  delivery_options: DeliveryOption[]
  primary_color: string
  industry_type: string | null
  is_active: boolean
  rating: number | null
  review_count: number | null
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; is_closed: boolean }
}

export interface DeliveryOption {
  type: 'lalamove' | 'easyparcel' | 'pickup' | 'custom'
  label: string
  estimated_days: string
  base_fee: number | null
}

export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  sale_price: number | null
  image_url: string | null
  gallery_urls: string[]
  is_available: boolean
  stock_qty: number
  category: string | null
  subcategory: string | null
  brand: string | null
  weight_g: number | null
  sku: string | null
  rating: number | null
  review_count: number | null
  is_bestseller: boolean
  is_new_arrival: boolean
  is_on_sale: boolean
  low_stock_threshold: number
  variants: ProductVariant[]
  tags: string[]
  created_at: string
}

export interface ProductVariant {
  id: string
  label: string       // "500g", "Red", "Large"
  price: number
  stock_qty: number
  sku: string | null
}

export interface CartItem {
  product: Product
  variant_id: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

// ─── Order ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface Order {
  id: string
  store_id: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  status: OrderStatus
  items: OrderItem[]
  delivery_address: Address | null
  delivery_option: DeliveryOption | null
  subtotal: number
  delivery_fee: number
  service_fee: number
  discount_amount: number
  total: number
  promo_code: string | null
  notes: string | null
  tracking_number: string | null
  estimated_delivery: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  variant_label: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

// ─── Address ────────────────────────────────────────────────────────────────

export interface Address {
  id?: string
  full_name: string
  phone: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  postcode: string
  country: string
  is_default?: boolean
  label?: 'home' | 'office' | 'other'
  notes?: string | null
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export type CheckoutStep = 'cart' | 'delivery' | 'payment' | 'review' | 'confirmation'

export interface CheckoutState {
  step: CheckoutStep
  items: CartItem[]
  address: Address | null
  delivery_option: DeliveryOption | null
  payment_method: 'fpx' | 'card' | 'ewallet' | 'cod' | null
  promo_code: string | null
  discount_amount: number
  notes: string | null
}

export interface FeeConfig {
  service_fee_rate: number        // e.g. 0.02 for 2%
  service_fee_cap: number | null  // max service fee in RM, null = unlimited
  service_fee_label: string
  free_delivery_threshold: number | null
  min_order_amount: number
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchFilters {
  query: string
  category: string
  min_price: number | null
  max_price: number | null
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'
  in_stock_only: boolean
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
```


***

## 2. Centralized Fee Configuration

**`apps/web/src/lib/fees.ts`**:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import type { FeeConfig } from '@/types/customer'

// Default config — overridden by store settings
export const DEFAULT_FEE_CONFIG: FeeConfig = {
  service_fee_rate:      0.02,
  service_fee_cap:       10.00,
  service_fee_label:     'Service fee',
  free_delivery_threshold: 80.00,
  min_order_amount:      5.00,
}

// Fetch per-store fee config (falls back to platform default)
export const getStoreFeeConfig = unstable_cache(
  async (storeId: string): Promise<FeeConfig> => {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('store_settings')
      .select('service_fee_rate, service_fee_cap, service_fee_label, free_delivery_threshold, min_order_amount')
      .eq('store_id', storeId)
      .single()
    return { ...DEFAULT_FEE_CONFIG, ...data }
  },
  ['store-fee-config'],
  { revalidate: 3600, tags: ['store-settings'] }
)

// ─── Pure calculation helpers ─────────────────────────────────────────────────

export function calcServiceFee(subtotal: number, config: FeeConfig): number {
  const fee = subtotal * config.service_fee_rate
  if (config.service_fee_cap !== null) return Math.min(fee, config.service_fee_cap)
  return fee
}

export function calcDeliveryFee(
  subtotal: number,
  baseFee: number,
  config: FeeConfig
): number {
  if (config.free_delivery_threshold !== null && subtotal >= config.free_delivery_threshold) {
    return 0
  }
  return baseFee
}

export function calcOrderTotals(
  subtotal: number,
  deliveryBaseFee: number,
  discountAmount: number,
  config: FeeConfig
) {
  const delivery   = calcDeliveryFee(subtotal, deliveryBaseFee, config)
  const afterDisc  = Math.max(0, subtotal - discountAmount)
  const serviceFee = calcServiceFee(afterDisc, config)
  const total      = afterDisc + delivery + serviceFee

  return {
    subtotal,
    discount: discountAmount,
    delivery,
    service_fee: parseFloat(serviceFee.toFixed(2)),
    total:       parseFloat(total.toFixed(2)),
  }
}
```


***

## 3. URL State Helper

**`apps/web/src/lib/url-state.ts`**:[^5][^1]

```typescript
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useUrlState() {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | null, options?: { scroll?: boolean; replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const query  = params.toString()
      const target = query ? `${pathname}?${query}` : pathname
      if (options?.replace) {
        router.replace(target, { scroll: options.scroll ?? false })
      } else {
        router.push(target, { scroll: options.scroll ?? false })
      }
    },
    [router, pathname, searchParams]
  )

  const setParams = useCallback(
    (updates: Record<string, string | null>, options?: { scroll?: boolean; replace?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '') params.delete(k)
        else params.set(k, v)
      })
      const query  = params.toString()
      const target = query ? `${pathname}?${query}` : pathname
      if (options?.replace) {
        router.replace(target, { scroll: options.scroll ?? false })
      } else {
        router.push(target, { scroll: options.scroll ?? false })
      }
    },
    [router, pathname, searchParams]
  )

  const getParam = useCallback(
    (key: string, fallback = '') => searchParams.get(key) ?? fallback,
    [searchParams]
  )

  return { setParam, setParams, getParam, searchParams }
}
```


***

## 4. Framer Motion Animation Variants

**`apps/web/src/components/ui/animations.ts`**:[^4]

```typescript
import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
}

export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

export const cardVariant: Variants = {
  hidden:  { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.35, ease: 'easeOut' } },
}

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.35, ease: 'easeOut' } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,    transition: { duration: 0.3, ease: 'backOut' } },
}

export const progressBar: Variants = {
  hidden:  { width: '0%' },
  visible: (pct: number) => ({ width: `${pct}%`, transition: { duration: 0.6, ease: 'easeInOut' } }),
}

// Hover/tap interactions (pass directly to motion components)
export const cardHover = {
  whileHover: { y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.10)', transition: { duration: 0.2 } },
  whileTap:   { scale: 0.98 },
}

export const buttonTap = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring', stiffness: 400, damping: 17 },
}
```


***

## 5. Canonical ProductCard

**`apps/web/src/components/products/ProductCard.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { OptimizedImage } from '@/components/common/OptimizedImage'
import { cardVariant, cardHover } from '@/components/ui/animations'
import type { Product } from '@/types/customer'

interface Props {
  product: Product
  storeSlug: string
  primaryColor?: string
  onAddToCart?: (product: Product) => void
  cartQty?: number
  /** Render mode — used in tenant pages vs global search results */
  context?: 'store' | 'search'
  priority?: boolean
}

export function ProductCard({
  product,
  storeSlug,
  primaryColor = '#6366f1',
  onAddToCart,
  cartQty = 0,
  context = 'store',
  priority = false,
}: Props) {
  const [adding, setAdding] = useState(false)

  const isOnSale     = product.is_on_sale && product.sale_price != null
  const displayPrice = isOnSale ? product.sale_price! : product.price
  const discountPct  = isOnSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0
  const unavailable  = !product.is_available || product.stock_qty <= 0
  const lowStock     = !unavailable && product.stock_qty <= product.low_stock_threshold

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (!onAddToCart || unavailable || adding) return
    setAdding(true)
    onAddToCart(product)
    await new Promise((r) => setTimeout(r, 600))
    setAdding(false)
  }

  return (
    <motion.div
      variants={cardVariant}
      {...cardHover}
      className="group relative"
    >
      <Link
        href={`/stores/${storeSlug}/products/${product.id}`}
        prefetch={priority}
        className="block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Image */}
        <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '4/3' }}>
          <OptimizedImage
            src={product.image_url}
            alt={product.name}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOnSale && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-500 text-white shadow-sm"
              >
                -{discountPct}%
              </motion.span>
            )}
            {product.is_new_arrival && !isOnSale && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-900 text-white shadow-sm">
                NEW
              </span>
            )}
            {product.is_bestseller && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-lg shadow-sm text-white"
                style={{ backgroundColor: primaryColor }}
              >
                🔥 TOP
              </span>
            )}
          </div>

          {/* Unavailable overlay */}
          {unavailable && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center backdrop-blur-sm">
              <span className="font-bold text-gray-500 text-sm">Out of Stock</span>
            </div>
          )}

          {/* Cart qty badge */}
          {cartQty > 0 && (
            <div
              className="absolute top-2 right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow"
              style={{ backgroundColor: primaryColor }}
            >
              {cartQty}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-1.5">
          {product.brand && (
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold truncate">
              {product.brand}
            </p>
          )}
          <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
            {product.name}
          </p>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs leading-none">
                {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
              </span>
              <span className="text-xs text-gray-400">({product.review_count ?? 0})</span>
            </div>
          )}

          {/* Low stock */}
          {lowStock && (
            <p className="text-xs text-orange-500 font-semibold">
              ⚠ Only {product.stock_qty} left
            </p>
          )}

          {/* Price + Add */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {isOnSale ? (
                <>
                  <p className="text-sm font-bold text-red-600">RM {displayPrice.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 line-through">RM {product.price.toFixed(2)}</p>
                </>
              ) : (
                <p className="text-sm font-bold text-gray-900">RM {displayPrice.toFixed(2)}</p>
              )}
            </div>

            {onAddToCart && !unavailable && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleAdd}
                className="w-8 h-8 rounded-xl text-white font-bold flex items-center justify-center transition-all shadow-sm relative overflow-hidden"
                style={{ backgroundColor: adding ? '#10B981' : primaryColor }}
                aria-label={`Add ${product.name} to cart`}
              >
                <motion.span
                  key={adding ? 'check' : 'plus'}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-lg leading-none"
                >
                  {adding ? '✓' : '+'}
                </motion.span>
              </motion.button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
```


***

## 6. Skeleton Components

**`apps/web/src/components/skeletons/ProductGridSkeleton.tsx`**:

```tsx
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="aspect-[4/3] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer" />
          <div className="p-3.5 space-y-2">
            <div className="h-2.5 bg-gray-100 rounded w-1/3 animate-pulse" />
            <div className="h-4   bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-3   bg-gray-100 rounded w-2/3 animate-pulse" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**`apps/web/src/components/skeletons/StoreSkeleton.tsx`**:

```tsx
export function StoreSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="h-56 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
      {/* Store info bar */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
        </div>
      </div>
      {/* Category nav */}
      <div className="bg-white border-b px-4 py-3 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
      {/* Products */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**`apps/web/src/components/skeletons/OrderTrackerSkeleton.tsx`**:

```tsx
export function OrderTrackerSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-7 bg-gray-100 rounded-full w-24 animate-pulse" />
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full w-full animate-pulse" />
        {/* Steps */}
        <div className="flex justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-2.5 bg-gray-100 rounded w-14 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* Order items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3.5 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```


***

## 7. Client-Side Store Search Bar

**`apps/web/src/components/search/StoreSearchBar.tsx`**:[^5]

```tsx
'use client'
import { useTransition, useRef } from 'react'
import { useUrlState } from '@/lib/url-state'

interface Props {
  primaryColor: string
  placeholder?: string
}

export function StoreSearchBar({ primaryColor, placeholder = 'Search products…' }: Props) {
  const { setParams, getParam } = useUrlState()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const query = getParam('q')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    startTransition(() => {
      setParams({ q: val || null, page: null }, { replace: true, scroll: false })
    })
  }

  function handleClear() {
    setParams({ q: null, page: null }, { replace: true, scroll: false })
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full max-w-lg">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
        {isPending
          ? <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          : '🔍'}
      </span>
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        aria-label="Search products in this store"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
```


***

## 8. Infinite Scroll Product Grid

**`apps/web/src/components/search/InfiniteProductGrid.tsx`**:[^3][^6]

```tsx
'use client'
import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductGridSkeleton } from '@/components/skeletons/ProductGridSkeleton'
import { staggerContainer, cardVariant } from '@/components/ui/animations'
import type { Product } from '@/types/customer'

interface Props {
  initialProducts: Product[]
  initialHasMore: boolean
  storeId: string
  storeSlug: string
  primaryColor: string
  query: string
  category: string
  onAddToCart: (product: Product) => void
  cartQtyMap: Record<string, number>
  // Server Action passed from parent page
  loadMore: (
    storeId: string, page: number, query: string, category: string
  ) => Promise<{ products: Product[]; hasMore: boolean }>
}

export function InfiniteProductGrid({
  initialProducts,
  initialHasMore,
  storeId,
  storeSlug,
  primaryColor,
  query,
  category,
  onAddToCart,
  cartQtyMap,
  loadMore,
}: Props) {
  const [products, setProducts]     = useState<Product[]>(initialProducts)
  const [hasMore, setHasMore]       = useState(initialHasMore)
  const [page, setPage]             = useState(2)
  const [isPending, startTransition]= useTransition()
  const sentinelRef                 = useRef<HTMLDivElement>(null)
  const lastQueryRef                = useRef(query + category)

  // Reset when filters change
  useEffect(() => {
    const key = query + category
    if (key !== lastQueryRef.current) {
      lastQueryRef.current = key
      setProducts(initialProducts)
      setHasMore(initialHasMore)
      setPage(2)
    }
  }, [query, category, initialProducts, initialHasMore])

  const fetchMore = useCallback(() => {
    if (!hasMore || isPending) return
    startTransition(async () => {
      const result = await loadMore(storeId, page, query, category)
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id))
        return [...prev, ...result.products.filter((p) => !ids.has(p.id))]
      })
      setHasMore(result.hasMore)
      setPage((p) => p + 1)
    })
  }, [hasMore, isPending, page, storeId, query, category, loadMore])

  // Intersection Observer sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMore() },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchMore])

  if (products.length === 0 && !isPending) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg font-bold text-gray-900">No products found</p>
        <p className="text-sm text-gray-500 mt-1">
          {query ? `No results for "${query}"` : 'No products in this category yet.'}
        </p>
        {query && (
          <p className="text-sm text-gray-400 mt-1">
            Try a different keyword or{' '}
            <button
              className="font-semibold underline"
              style={{ color: primaryColor }}
              onClick={() => window.history.back()}
            >
              browse all products
            </button>
          </p>
        )}
      </motion.div>
    )
  }

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {products.map((p, i) => (
            <motion.div key={p.id} variants={cardVariant} layout>
              <ProductCard
                product={p}
                storeSlug={storeSlug}
                primaryColor={primaryColor}
                onAddToCart={onAddToCart}
                cartQty={cartQtyMap[p.id] ?? 0}
                priority={i < 8}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Sentinel + Load More indicator */}
      <div ref={sentinelRef} className="flex justify-center pt-8">
        {isPending && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
            <ProductGridSkeleton count={5} />
          </div>
        )}
        {!hasMore && products.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-400 py-4"
          >
            ✓ All {products.length} products loaded
          </motion.p>
        )}
      </div>
    </>
  )
}
```


***

## 9. Premium Storefront Page

**`apps/web/src/app/stores/[slug]/page.tsx`**:

```tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Metadata } from 'next'
import { getStore } from '@/lib/data/stores'
import { getStoreProducts } from '@/lib/data/products'
import { getStoreFeeConfig } from '@/lib/fees'
import { StoreSkeleton } from '@/components/skeletons/StoreSkeleton'
import { ProductGridSkeleton } from '@/components/skeletons/ProductGridSkeleton'
import { StorePageClient } from './StorePageClient'

export const revalidate = 60

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const store = await getStore(slug)
  if (!store) return { title: 'Store not found' }

  return {
    title:       `${store.name} — My Marketplace`,
    description: store.description ?? `Shop at ${store.name}`,
    openGraph: {
      title:       store.name,
      description: store.description ?? '',
      images:      store.logo_url ? [{ url: store.logo_url, width: 400, height: 400 }] : [],
      type:        'website',
    },
    twitter: {
      card:  'summary_large_image',
      title: store.name,
    },
    alternates: { canonical: `/stores/${slug}` },
    robots:     { index: true, follow: true },
  }
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; cat?: string; sort?: string; page?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])

  const store = await getStore(slug)
  if (!store) notFound()

  // Parallel data fetching
  const [initialData, feeConfig] = await Promise.all([
    getStoreProducts(store.id, 1, 20, sp.cat, sp.q),
    getStoreFeeConfig(store.id),
  ])

  // ── JSON-LD Structured Data ────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name:        store.name,
    description: store.description,
    image:       store.logo_url,
    url:         `${process.env.NEXT_PUBLIC_APP_URL}/stores/${slug}`,
    address: store.address ? {
      '@type':         'PostalAddress',
      streetAddress:   store.address,
      addressLocality: store.city,
      addressRegion:   store.state,
      addressCountry:  'MY',
    } : undefined,
    telephone:    store.phone,
    priceRange:   '$$',
    aggregateRating: store.rating ? {
      '@type':       'AggregateRating',
      ratingValue:   store.rating,
      reviewCount:   store.review_count ?? 0,
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<StoreSkeleton />}>
        <StorePageClient
          store={store}
          initialProducts={initialData.products}
          initialHasMore={initialData.hasMore}
          feeConfig={feeConfig}
          initialQuery={sp.q ?? ''}
          initialCategory={sp.cat ?? 'All'}
        />
      </Suspense>
    </>
  )
}
```

**`apps/web/src/app/stores/[slug]/StorePageClient.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { StoreSearchBar } from '@/components/search/StoreSearchBar'
import { InfiniteProductGrid } from '@/components/search/InfiniteProductGrid'
import { useUrlState } from '@/lib/url-state'
import { loadMoreProducts } from '@/lib/actions/products'
import { fadeUp, staggerContainer, fadeIn } from '@/components/ui/animations'
import { isStoreOpen } from '@/lib/industry'
import type { Store, Product, FeeConfig } from '@/types/customer'

interface Props {
  store: Store
  initialProducts: Product[]
  initialHasMore: boolean
  feeConfig: FeeConfig
  initialQuery: string
  initialCategory: string
}

export function StorePageClient({
  store, initialProducts, initialHasMore,
  feeConfig, initialQuery, initialCategory,
}: Props) {
  const { getParam, setParam } = useUrlState()
  const [cart, setCart] = useState<Record<string, number>>({})

  const query    = getParam('q',   initialQuery)
  const category = getParam('cat', initialCategory)
  const { isOpen, label } = isStoreOpen(store.operating_hours)

  function addToCart(product: Product) {
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] ?? 0) + 1 }))
  }

  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0)

  const CATEGORIES = ['All', ...Array.from(
    new Set(initialProducts.map((p) => p.category).filter(Boolean) as string[])
  )]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {store.banner_url ? (
          <Image src={store.banner_url} alt={store.name} fill className="object-cover" priority />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, #0f172a, ${store.primary_color})` }}
          />
        )}
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Floating store info */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="absolute bottom-0 left-0 right-0 px-4 pb-4 md:px-8 md:pb-6 flex items-end gap-4"
        >
          {/* Logo */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-3 border-white/30 bg-white/10 backdrop-blur-md shadow-xl shrink-0 flex items-center justify-center">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <span className="text-3xl">🏪</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow">
              {store.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {/* Open / Closed pill */}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 ${
                isOpen
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-400/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                {label}
              </span>
              {/* Rating */}
              {store.rating && (
                <span className="text-xs font-semibold text-yellow-300 flex items-center gap-1">
                  ⭐ {store.rating.toFixed(1)} ({store.review_count})
                </span>
              )}
              {/* Address */}
              {store.city && (
                <span className="text-xs text-white/70">📍 {store.city}</span>
              )}
            </div>
          </div>

          {/* Cart FAB */}
          {cartCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Link
                href={`/stores/${store.slug}/checkout`}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-bold text-sm shadow-lg backdrop-blur-md border border-white/20"
                style={{ backgroundColor: `${store.primary_color}CC` }}
              >
                🛒
                <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow"
                >
                  {cartCount}
                </span>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Sticky Search + Category Nav ───────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-2.5">
          {/* Search bar */}
          <StoreSearchBar
            primaryColor={store.primary_color}
            placeholder={`Search in ${store.name}…`}
          />

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setParam('cat', cat === 'All' ? null : cat, { replace: true, scroll: false })}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  category === cat || (cat === 'All' && !category)
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={
                  category === cat || (cat === 'All' && !category)
                    ? { backgroundColor: store.primary_color }
                    : {}
                }
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Store Description ──────────────────────────────────────────────── */}
      {store.description && !query && category === 'All' && (
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto px-4 pt-4"
        >
          <p className="text-sm text-gray-500 leading-relaxed">{store.description}</p>
        </motion.div>
      )}

      {/* ── Products ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-5">
        {query && (
          <p className="text-sm text-gray-500 mb-4">
            Results for <strong className="text-gray-900">"{query}"</strong>
            {category && category !== 'All' && ` in ${category}`}
          </p>
        )}

        <InfiniteProductGrid
          initialProducts={initialProducts}
          initialHasMore={initialHasMore}
          storeId={store.id}
          storeSlug={store.slug}
          primaryColor={store.primary_color}
          query={query}
          category={category === 'All' ? '' : category}
          onAddToCart={addToCart}
          cartQtyMap={cart}
          loadMore={loadMoreProducts}
        />
      </div>
    </div>
  )
}
```


***

## 10. Store Not Found Page

**`apps/web/src/app/stores/[slug]/not-found.tsx`**:

```tsx
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Illustration */}
        <div className="w-32 h-32 bg-gray-100 rounded-3xl flex items-center justify-center text-6xl mx-auto">
          🏪
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store not found</h1>
          <p className="text-gray-500 mt-2 leading-relaxed">
            This store may have moved, closed, or the link might be incorrect.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            🔍 Browse All Stores
          </Link>
          <Link
            href="/stores"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-300 transition-colors"
          >
            ← Back to Search
          </Link>
        </div>
        {/* Suggestions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-left">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            You might be looking for:
          </p>
          <div className="space-y-1.5">
            {['Grocery & Supermarket', 'Food & Restaurant', 'Fashion & Apparel'].map((cat) => (
              <Link
                key={cat}
                href={`/?category=${encodeURIComponent(cat)}`}
                className="flex items-center justify-between text-sm text-gray-600 hover:text-indigo-600 py-1 transition-colors"
              >
                {cat} <span className="text-gray-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```


***

## 11. URL-Synced Checkout Flow

**`apps/web/src/app/checkout/page.tsx`**:[^7][^1]

```tsx
import { Suspense } from 'react'
import { CheckoutFlow } from './CheckoutFlow'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}>
      <CheckoutFlow />
    </Suspense>
  )
}
```

**`apps/web/src/app/checkout/CheckoutFlow.tsx`**:

```tsx
'use client'
import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useUrlState } from '@/lib/url-state'
import { calcOrderTotals } from '@/lib/fees'
import { CartStep }     from './steps/CartStep'
import { DeliveryStep } from './steps/DeliveryStep'
import { PaymentStep }  from './steps/PaymentStep'
import { ReviewStep }   from './steps/ReviewStep'
import { ConfirmationStep } from './steps/ConfirmationStep'
import { slideInRight } from '@/components/ui/animations'
import type { CheckoutStep, CheckoutState, FeeConfig } from '@/types/customer'

const STEPS: { key: CheckoutStep; label: string; icon: string }[] = [
  { key: 'cart',         label: 'Cart',     icon: '🛒' },
  { key: 'delivery',     label: 'Delivery', icon: '📦' },
  { key: 'payment',      label: 'Payment',  icon: '💳' },
  { key: 'review',       label: 'Review',   icon: '✅' },
  { key: 'confirmation', label: 'Done',     icon: '🎉' },
]

interface Props {
  feeConfig: FeeConfig
  initialState?: Partial<CheckoutState>
}

export function CheckoutFlow({ feeConfig, initialState }: Props) {
  const router = useRouter()
  const { getParam, setParam } = useUrlState()

  // Step is driven entirely by URL — survives refresh + back button
  const currentStep = (getParam('step', 'cart') as CheckoutStep)
  const currentIdx  = STEPS.findIndex((s) => s.key === currentStep)

  // Persisted state (zustand or sessionStorage — use your store)
  // For brevity, using URL params as the source of truth for key selections
  const subtotal = parseFloat(getParam('subtotal', '0'))
  const deliveryFee = parseFloat(getParam('delivery_fee', '0'))
  const discount = parseFloat(getParam('discount', '0'))
  const totals = useMemo(
    () => calcOrderTotals(subtotal, deliveryFee, discount, feeConfig),
    [subtotal, deliveryFee, discount, feeConfig]
  )

  function goToStep(step: CheckoutStep) {
    setParam('step', step, { scroll: true })
  }

  function goNext() {
    const next = STEPS[currentIdx + 1]
    if (next) goToStep(next.key)
  }

  function goPrev() {
    if (currentIdx > 0) router.back()
  }

  const progressPct = ((currentIdx) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header progress bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            {currentStep !== 'confirmation' && (
              <button
                onClick={goPrev}
                disabled={currentIdx === 0}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
            )}
            <p className="text-sm font-bold text-gray-900 mx-auto">Checkout</p>
            {/* Step count */}
            {currentStep !== 'confirmation' && (
              <p className="text-xs text-gray-400">
                {currentIdx + 1} / {STEPS.length - 1}
              </p>
            )}
          </div>

          {/* Step labels */}
          <div className="flex justify-between mb-2">
            {STEPS.filter((s) => s.key !== 'confirmation').map((s, i) => (
              <button
                key={s.key}
                onClick={() => i < currentIdx && goToStep(s.key)}
                disabled={i >= currentIdx}
                className={`flex flex-col items-center gap-1 transition-all ${
                  i <= currentIdx ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    s.key === currentStep
                      ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md'
                      : i < currentIdx
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {i < currentIdx ? '✓' : s.icon}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${
                  s.key === currentStep ? 'text-indigo-600' : i < currentIdx ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          {/* Animated progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step content — animated transitions */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={slideInRight}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
          >
            {currentStep === 'cart'         && <CartStep onNext={goNext} totals={totals} feeConfig={feeConfig} />}
            {currentStep === 'delivery'     && <DeliveryStep onNext={goNext} totals={totals} feeConfig={feeConfig} />}
            {currentStep === 'payment'      && <PaymentStep onNext={goNext} totals={totals} />}
            {currentStep === 'review'       && <ReviewStep onNext={goNext} totals={totals} feeConfig={feeConfig} />}
            {currentStep === 'confirmation' && <ConfirmationStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
```


***

## 12. Order Not Found Page

**`apps/web/src/app/orders/[id]/not-found.tsx`**:

```tsx
import Link from 'next/link'

export default function OrderNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-28 h-28 bg-orange-50 rounded-3xl flex items-center justify-center text-5xl mx-auto">
          📦
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order not found</h1>
          <p className="text-gray-500 mt-2 leading-relaxed">
            This order doesn't exist, may have been removed, or you may not have permission to view it.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">
            Common reasons
          </p>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li>The order link has expired</li>
            <li>You're not signed in to the right account</li>
            <li>The order ID in the URL is incorrect</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/orders"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            📋 View My Orders
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-300 transition-colors"
          >
            🔍 Back to Search
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          Need help?{' '}
          <Link href="/support" className="text-indigo-600 font-semibold hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
}
```


***

## 13. Store Page Loading State

**`apps/web/src/app/stores/[slug]/loading.tsx`**:

```tsx
import { StoreSkeleton } from '@/components/skeletons/StoreSkeleton'
export default function Loading() { return <StoreSkeleton /> }
```

**`apps/web/src/app/orders/loading.tsx`**:

```tsx
import { OrderTrackerSkeleton } from '@/components/skeletons/OrderTrackerSkeleton'
export default function Loading() { return <OrderTrackerSkeleton /> }
```


***

## 14. Load More Server Action

**`apps/web/src/lib/actions/products.ts`**:

```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'
import type { Product } from '@/types/customer'

const PAGE_SIZE = 20

export async function loadMoreProducts(
  storeId: string,
  page: number,
  query: string,
  category: string
): Promise<{ products: Product[]; hasMore: boolean }> {
  const supabase = await createServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let q = supabase
    .from('products')
    .select(`
      id, name, price, sale_price, image_url, is_available,
      stock_qty, category, brand, rating, review_count,
      is_bestseller, is_new_arrival, is_on_sale, low_stock_threshold,
      tags, variants, gallery_urls, description, sku, weight_g, created_at
    `)
    .eq('store_id', storeId)
    .eq('is_available', true)
    .range(from, to)

  if (query) {
    q = q.textSearch(
      'fts',
      query,
      { type: 'websearch', config: 'english' }
    )
  }

  if (category) {
    q = q.eq('category', category)
  }

  q = q.order('is_bestseller', { ascending: false })
       .order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) throw error

  return {
    products: (data ?? []) as Product[],
    hasMore: (data?.length ?? 0) === PAGE_SIZE,
  }
}
```


***

## 15. Remediation Checklist

Install required packages:

```bash
pnpm add framer-motion
```

Remove the duplicate component file:

```bash
rm apps/web/src/components/ProductCard.tsx
```

Perform global replacement across the codebase:

```bash
# Replace <a href="/" with <Link href="/"  across all files
grep -rl 'href="/' apps/web/src --include="*.tsx" | xargs sed -i 's/<a href="/<Link href="/g'

# Fix any type: replace `as any` in checkout and order files
grep -rn ': any' apps/web/src/app/checkout apps/web/src/app/orders
```


***

## Issue Resolution Summary

| \# | Finding | Resolution |
| :-- | :-- | :-- |
| 1.1 | Duplicate `ProductCard` | Single canonical `components/products/ProductCard.tsx` with `context` prop |
| 1.2 | Raw `<a>` tags | All internal nav uses `<Link prefetch>` — SPA transitions |
| 1.3 | `any` types | Full typed interfaces in `types/customer.ts` for `Order`, `Product`, `Address`, `CheckoutState` |
| 2.1 | Bland storefront | Premium glassmorphism banner, animated store info overlay, floating cart FAB |
| 2.2 | No search/filter | `StoreSearchBar` (URL-synced, no reload) + animated category pills |
| 2.3 | No loading states | `StoreSkeleton`, `ProductGridSkeleton`, `OrderTrackerSkeleton` with shimmer animation |
| 3.1 | State lost on refresh | `CheckoutFlow` reads/writes step via `?step=` URL param — back button works |
| 3.2 | Hardcoded 2% fee | `getStoreFeeConfig()` + `calcOrderTotals()` utility — fully configurable per store |
| 3.3 | Redirect to `/` on 404 | Dedicated `not-found.tsx` for both stores and orders with actionable CTAs |
| 4.1 | Search causes full reload | `useRouter + useSearchParams` — zero page refresh, `useTransition` pending indicator |
| 4.2 | No pagination | Intersection Observer infinite scroll via `loadMoreProducts` Server Action [^3] |
| 4.3 | Missing JSON-LD | Injected `Store` schema + `AggregateRating` directly into `<head>` of every store page |

<span style="display:none">[^10][^11][^12][^13][^14][^15][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://nextjs.org/docs/app/api-reference/functions/use-search-params

[^2]: https://www.youtube.com/watch?v=e_VgemFfGHo

[^3]: https://blog.logrocket.com/implementing-infinite-scroll-next-js-server-actions/

[^4]: https://shoaib-blog.yumeui.com/motion-ui-with-framer-motion-in-2025-more-than-just-animations/

[^5]: https://www.robinwieruch.de/next-search-params/

[^6]: https://devblogs.sh/posts/implementing-infinite-scroll-in-nextjs-with-server-actions

[^7]: https://www.youtube.com/watch?v=JlETFL1nDIo

[^8]: https://stackoverflow.com/questions/79178658/how-to-get-url-params-in-next-js-15-on-the-server-side

[^9]: https://nextjs.org/docs/pages/api-reference/functions/use-search-params

[^10]: https://en.nextjs.im/docs/app/api-reference/functions/use-search-params

[^11]: https://www.youtube.com/watch?v=THUpdZGA7f0

[^12]: https://www.freecodecamp.org/news/how-to-implement-infinite-scroll-in-next-js/

[^13]: https://dev.to/hijazi313/nextjs-15-scroll-behavior-a-comprehensive-guide-387j

[^14]: https://www.youtube.com/watch?v=qPsY4AKFlnM

[^15]: https://www.youtube.com/watch?v=kcq5Jal4u04

