<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# But when i navigate to other merchant page, i'm still logged in and the cart is still showing item from other merchant.

These are two separate bugs with the same root cause — **missing store scope on shared client state**. The auth session staying active is actually correct (platform-wide login is fine), but the cart and any store-specific UI must be completely isolated per store.

***

# Store Isolation Fix — Cart + Session Context

## Root Cause Diagram

```
❌ CURRENT (Broken)
───────────────────────────────────────────────────────
  CartContext (global, no store scope)
  localStorage key: "cart"  ← shared across ALL stores
  
  User adds "Nasi Lemak" from coffeeshop.mymarket.com
  → cart = [{ name: "Nasi Lemak", store: "coffeeshop" }]
  
  User visits florist.mymarket.com
  → CartContext still reads localStorage "cart"
  → Florist navbar shows 🛒 1  ← WRONG

✅ TARGET (Fixed)
───────────────────────────────────────────────────────
  CartContext receives storeSlug as a prop
  localStorage key: "cart:coffeeshop"   ← store-scoped
  localStorage key: "cart:florist"      ← completely separate
  DB: carts table (user_id + store_id UNIQUE)
  
  User visits florist.mymarket.com
  → CartContext reads "cart:florist" → empty
  → Florist navbar shows 🛒 0  ← CORRECT
  → coffeeshop cart is untouched in "cart:coffeeshop"
```


***

## File Structure

```
apps/web/src/
├── lib/
│   ├── cart/
│   │   ├── cart-store.ts          ← Zustand store (store-scoped)
│   │   ├── cart-storage.ts        ← localStorage + DB sync helpers
│   │   └── cart-merge.ts          ← Guest → auth cart merge on login
├── contexts/
│   └── CartProvider.tsx           ← Store-aware provider
├── hooks/
│   └── useCart.ts                 ← Public cart hook
├── components/
│   └── cart/
│       ├── CartDrawer.tsx         ← Store-scoped slide-out cart
│       └── AddToCartButton.tsx    ← Scoped add button
└── app/stores/[slug]/
    └── layout.tsx                 ← Injects storeSlug into CartProvider
supabase/migrations/
└── 20260327_carts.sql
```


***

## 1. Database Schema

**`supabase/migrations/20260327_carts.sql`**:

```sql
-- ── Persisted carts (for logged-in users, survives tab close) ─────────────────
CREATE TABLE IF NOT EXISTS public.carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)    -- one cart per user per store, always
);

CREATE INDEX IF NOT EXISTS carts_user_store_idx
  ON public.carts(user_id, store_id);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Users can only ever see and modify their OWN cart for the current store
CREATE POLICY "cart_owner_only" ON public.carts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_cart_updated
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION update_cart_timestamp();
```


***

## 2. Cart Types

**`apps/web/src/lib/cart/cart-types.ts`**:

```typescript
import type { Product, ProductVariant } from '@/types/customer'

export interface CartLineItem {
  // Snapshot of product data at time of adding (price may change)
  product_id:     string
  store_id:       string          // ← explicit store scope on every item
  store_slug:     string
  product_name:   string
  product_image:  string | null
  variant_id:     string | null
  variant_label:  string | null
  unit_price:     number          // locked at time of adding
  quantity:       number
  max_qty:        number          // stock limit
  subtotal:       number          // unit_price × quantity
  added_at:       string          // ISO timestamp
}

export interface CartState {
  storeSlug:    string
  storeId:      string
  items:        CartLineItem[]
  // Derived totals (computed, not stored)
  itemCount:    number
  subtotal:     number
  isEmpty:      boolean
}

export type CartAction =
  | { type: 'ADD_ITEM';    payload: Omit<CartLineItem, 'subtotal' | 'added_at'> }
  | { type: 'REMOVE_ITEM'; payload: { product_id: string; variant_id: string | null } }
  | { type: 'UPDATE_QTY';  payload: { product_id: string; variant_id: string | null; quantity: number } }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE';     payload: CartLineItem[] }
```


***

## 3. Cart Storage (Scoped localStorage + DB Sync)

**`apps/web/src/lib/cart/cart-storage.ts`**:

```typescript
import type { CartLineItem } from './cart-types'

// ── localStorage key is always store-scoped ───────────────────────────────────
const CART_KEY = (storeSlug: string) => `cart:${storeSlug}`

export const localCart = {
  read(storeSlug: string): CartLineItem[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(CART_KEY(storeSlug))
      if (!raw) return []
      const parsed = JSON.parse(raw) as CartLineItem[]
      // Validate every item belongs to THIS store — hard guard
      return parsed.filter((item) => item.store_slug === storeSlug)
    } catch {
      return []
    }
  },

  write(storeSlug: string, items: CartLineItem[]): void {
    if (typeof window === 'undefined') return
    // Defensive: strip any cross-store items before writing
    const safe = items.filter((i) => i.store_slug === storeSlug)
    localStorage.setItem(CART_KEY(storeSlug), JSON.stringify(safe))
  },

  clear(storeSlug: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(CART_KEY(storeSlug))
  },

  // Returns all store slugs that have a cart in localStorage
  getAllStoreSlugs(): string[] {
    if (typeof window === 'undefined') return []
    return Object.keys(localStorage)
      .filter((k) => k.startsWith('cart:'))
      .map((k) => k.replace('cart:', ''))
  },
}

// ── DB sync (for logged-in users) ─────────────────────────────────────────────
import { createClient } from '@/lib/supabase/client'

export async function persistCartToDB(
  storeId: string,
  items: CartLineItem[]
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('carts')
    .upsert(
      { user_id: user.id, store_id: storeId, items },
      { onConflict: 'user_id,store_id' }
    )
}

export async function loadCartFromDB(storeId: string): Promise<CartLineItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('carts')
    .select('items')
    .eq('user_id', user.id)
    .eq('store_id', storeId)   // ← STORE-SCOPED
    .single()

  return (data?.items as CartLineItem[]) ?? []
}

export async function clearCartFromDB(storeId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('carts')
    .update({ items: [] })
    .eq('user_id', user.id)
    .eq('store_id', storeId)
}
```


***

## 4. Cart Merge (Guest → Auth on Login)

**`apps/web/src/lib/cart/cart-merge.ts`**:

```typescript
import { localCart, loadCartFromDB, persistCartToDB } from './cart-storage'
import type { CartLineItem } from './cart-types'

/**
 * Called once after a user signs in.
 * Merges their guest localStorage cart with their saved DB cart
 * for the CURRENT store only.
 */
export async function mergeGuestCartOnLogin(
  storeSlug: string,
  storeId:   string
): Promise<CartLineItem[]> {
  const [guestItems, dbItems] = await Promise.all([
    Promise.resolve(localCart.read(storeSlug)),
    loadCartFromDB(storeId),
  ])

  if (guestItems.length === 0) return dbItems
  if (dbItems.length === 0) {
    // Just persist the guest cart to DB
    await persistCartToDB(storeId, guestItems)
    localCart.clear(storeSlug)
    return guestItems
  }

  // Merge strategy: guest items take priority for quantity,
  // DB items retained if not in guest cart
  const merged = [...dbItems]

  for (const guestItem of guestItems) {
    const existingIdx = merged.findIndex(
      (i) =>
        i.product_id === guestItem.product_id &&
        i.variant_id === guestItem.variant_id
    )

    if (existingIdx >= 0) {
      // Use the higher quantity, capped at max_qty
      const combined = Math.min(
        merged[existingIdx].quantity + guestItem.quantity,
        guestItem.max_qty
      )
      merged[existingIdx] = {
        ...merged[existingIdx],
        quantity: combined,
        subtotal: combined * merged[existingIdx].unit_price,
      }
    } else {
      merged.push(guestItem)
    }
  }

  await persistCartToDB(storeId, merged)
  localCart.clear(storeSlug)
  return merged
}
```


***

## 5. Cart Zustand Store (Per-Instance, Store-Scoped)

**`apps/web/src/lib/cart/cart-store.ts`**:

```typescript
import { createStore } from 'zustand'
import { localCart, persistCartToDB } from './cart-storage'
import type { CartLineItem, CartState } from './cart-types'

export interface CartStore extends CartState {
  // Actions
  addItem:    (item: Omit<CartLineItem, 'subtotal' | 'added_at'>) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQty:  (productId: string, variantId: string | null, quantity: number) => void
  clear:      () => void
  hydrate:    (items: CartLineItem[]) => void
}

function deriveState(storeSlug: string, storeId: string, items: CartLineItem[]): CartState {
  return {
    storeSlug,
    storeId,
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal:  items.reduce((s, i) => s + i.subtotal,  0),
    isEmpty:   items.length === 0,
  }
}

// createStore (not create) so we can make multiple instances, one per store
export function createCartStore(storeSlug: string, storeId: string) {
  return createStore<CartStore>()((set, get) => ({
    ...deriveState(storeSlug, storeId, []),

    hydrate: (items) => {
      // GUARD: reject any items that don't belong to this store
      const safe = items.filter((i) => i.store_slug === storeSlug)
      set(deriveState(storeSlug, storeId, safe))
    },

    addItem: (incoming) => {
      // GUARD: block adding items from a different store
      if (incoming.store_slug !== storeSlug) {
        console.error(`[Cart] Blocked cross-store add: ${incoming.store_slug} → ${storeSlug}`)
        return
      }

      const { items } = get()
      const existingIdx = items.findIndex(
        (i) => i.product_id === incoming.product_id && i.variant_id === incoming.variant_id
      )

      let next: CartLineItem[]

      if (existingIdx >= 0) {
        const updated = { ...items[existingIdx] }
        updated.quantity = Math.min(updated.quantity + incoming.quantity, incoming.max_qty)
        updated.subtotal = updated.quantity * updated.unit_price
        next = items.map((item, i) => (i === existingIdx ? updated : item))
      } else {
        const newItem: CartLineItem = {
          ...incoming,
          subtotal:  incoming.quantity * incoming.unit_price,
          added_at:  new Date().toISOString(),
        }
        next = [...items, newItem]
      }

      set(deriveState(storeSlug, storeId, next))
      localCart.write(storeSlug, next)
      persistCartToDB(storeId, next).catch(console.error)
    },

    removeItem: (productId, variantId) => {
      const next = get().items.filter(
        (i) => !(i.product_id === productId && i.variant_id === variantId)
      )
      set(deriveState(storeSlug, storeId, next))
      localCart.write(storeSlug, next)
      persistCartToDB(storeId, next).catch(console.error)
    },

    updateQty: (productId, variantId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(productId, variantId)
        return
      }
      const next = get().items.map((i) => {
        if (i.product_id === productId && i.variant_id === variantId) {
          const capped = Math.min(quantity, i.max_qty)
          return { ...i, quantity: capped, subtotal: capped * i.unit_price }
        }
        return i
      })
      set(deriveState(storeSlug, storeId, next))
      localCart.write(storeSlug, next)
      persistCartToDB(storeId, next).catch(console.error)
    },

    clear: () => {
      set(deriveState(storeSlug, storeId, []))
      localCart.clear(storeSlug)
      persistCartToDB(storeId, []).catch(console.error)
    },
  }))
}

export type CartStoreInstance = ReturnType<typeof createCartStore>
```


***

## 6. Cart Provider (Store-Scoped Context)

**`apps/web/src/contexts/CartProvider.tsx`**:

```tsx
'use client'
import {
  createContext, useContext, useEffect, useRef,
  useState, type ReactNode,
} from 'react'
import { useStore }                from 'zustand'
import { createClient }            from '@/lib/supabase/client'
import { createCartStore, type CartStoreInstance } from '@/lib/cart/cart-store'
import { localCart, loadCartFromDB }               from '@/lib/cart/cart-storage'
import { mergeGuestCartOnLogin }                   from '@/lib/cart/cart-merge'
import type { CartStore }                          from '@/lib/cart/cart-store'

// ── Context ───────────────────────────────────────────────────────────────────
const CartContext = createContext<CartStoreInstance | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
interface Props {
  storeSlug: string
  storeId:   string
  children:  ReactNode
}

export function CartProvider({ storeSlug, storeId, children }: Props) {
  // Create ONE store instance per storeSlug — memoized in a ref
  const storeRef = useRef<CartStoreInstance | null>(null)
  if (
    !storeRef.current ||
    storeRef.current.getState().storeSlug !== storeSlug
  ) {
    storeRef.current = createCartStore(storeSlug, storeId)
  }

  const [hydrated, setHydrated] = useState(false)

  // ── Hydration: localStorage first, then DB if logged in ──────────────────
  useEffect(() => {
    async function hydrate() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Logged in: load from DB (source of truth), ignore localStorage
        const dbItems = await loadCartFromDB(storeId)
        storeRef.current!.getState().hydrate(dbItems)
      } else {
        // Guest: load from store-scoped localStorage
        const localItems = localCart.read(storeSlug)
        storeRef.current!.getState().hydrate(localItems)
      }
      setHydrated(true)
    }
    hydrate()
  }, [storeSlug, storeId])   // ← re-hydrates when store changes

  // ── Auth state listener: merge cart on login ──────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          // Merge guest cart into DB cart for THIS store
          const merged = await mergeGuestCartOnLogin(storeSlug, storeId)
          storeRef.current!.getState().hydrate(merged)
        }
        if (event === 'SIGNED_OUT') {
          // On sign-out, clear in-memory state (keep localStorage intact for re-login)
          storeRef.current!.getState().hydrate([])
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [storeSlug, storeId])

  return (
    <CartContext.Provider value={storeRef.current}>
      {/* Prevent flash of wrong cart count before hydration */}
      <div data-cart-hydrated={hydrated} data-store-slug={storeSlug}>
        {children}
      </div>
    </CartContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCart(): CartStore {
  const store = useContext(CartContext)
  if (!store) throw new Error('useCart must be used inside <CartProvider>')
  return useStore(store)
}

// Lightweight selector hook — avoids re-renders on unrelated state changes
export function useCartCount(): number {
  const store = useContext(CartContext)
  if (!store) return 0
  return useStore(store, (s) => s.itemCount)
}

export function useCartItems() {
  const store = useContext(CartContext)
  if (!store) return []
  return useStore(store, (s) => s.items)
}
```


***

## 7. Updated Store Layout (Wires CartProvider)

**`apps/web/src/app/stores/[slug]/layout.tsx`**:

```tsx
import { notFound }                              from 'next/navigation'
import { getStoreBySlug, getTenantContext }       from '@/lib/tenant'
import { CartProvider }                          from '@/contexts/CartProvider'
import { TenantThemeProvider }                   from '@/components/tenant/TenantThemeProvider'
import { StoreNavbar }                           from './_components/StoreNavbar'
import { StoreFooter }                           from './_components/StoreFooter'
import { CartDrawer }                            from '@/components/cart/CartDrawer'
import type { Metadata }                         from 'next'

interface Props {
  children: React.ReactNode
  params:   Promise<{ slug: string }>
}

export default async function StoreLayout({ children, params }: Props) {
  const { slug }        = await params
  const store           = await getStoreBySlug(slug)
  if (!store) notFound()

  const { isSubdomain } = await getTenantContext()

  return (
    // TenantThemeProvider injects CSS vars for this store's brand
    <TenantThemeProvider
      primaryColor={store.primary_color ?? '#6366f1'}
      fontFamily={store.font_family    ?? 'Inter'}
    >
      {/*
        CartProvider is keyed to storeSlug + storeId.
        When a user navigates to a DIFFERENT store's layout,
        React unmounts this provider and mounts a fresh one —
        completely separate cart state.
      */}
      <CartProvider
        key={`cart-${store.slug}`}   // force remount on store change
        storeSlug={store.slug}
        storeId={store.id}
      >
        <div className="min-h-screen flex flex-col bg-white" data-store={slug}>
          <StoreNavbar store={store} isSubdomain={isSubdomain} />
          <main className="flex-1">{children}</main>
          <StoreFooter store={store} />
        </div>

        {/* Cart drawer is scoped inside CartProvider */}
        <CartDrawer store={store} />
      </CartProvider>
    </TenantThemeProvider>
  )
}
```


***

## 8. AddToCart Button

**`apps/web/src/components/cart/AddToCartButton.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/contexts/CartProvider'
import type { Product } from '@/types/customer'

interface Props {
  product:     Product
  storeSlug:   string    // ← must be passed explicitly and match the current store
  storeId:     string
  variantId?:  string | null
  variantLabel?:string | null
  quantity?:   number
  className?:  string
}

export function AddToCartButton({
  product, storeSlug, storeId,
  variantId = null, variantLabel = null,
  quantity = 1, className,
}: Props) {
  const { addItem, items }  = useCart()
  const [flash, setFlash]   = useState(false)

  const inCart = items.some(
    (i) => i.product_id === product.id && i.variant_id === variantId
  )

  const unavailable = !product.is_available || product.stock_qty <= 0

  function handleAdd() {
    if (unavailable) return

    // The cart store will reject this if storeSlug doesn't match the provider
    addItem({
      product_id:    product.id,
      store_id:      storeId,
      store_slug:    storeSlug,   // ← carries store identity into the item
      product_name:  product.name,
      product_image: product.image_url,
      variant_id:    variantId,
      variant_label: variantLabel,
      unit_price:    product.sale_price ?? product.price,
      quantity,
      max_qty:       product.stock_qty,
    })

    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={handleAdd}
      disabled={unavailable}
      className={`relative overflow-hidden font-bold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <AnimatePresence mode="wait">
        {flash ? (
          <motion.span
            key="added"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -8 }}
            className="flex items-center gap-1.5"
          >
            ✅ Added!
          </motion.span>
        ) : unavailable ? (
          <motion.span key="unavail">Out of Stock</motion.span>
        ) : (
          <motion.span
            key="add"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -8 }}
            className="flex items-center gap-1.5"
          >
            {inCart ? '🛒 Add More' : '🛒 Add to Cart'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
```


***

## 9. Cart Drawer (Store-Scoped UI)

**`apps/web/src/components/cart/CartDrawer.tsx`**:

```tsx
'use client'
import { useState }               from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link                        from 'next/link'
import Image                       from 'next/image'
import { useCart }                 from '@/contexts/CartProvider'
import type { Store }              from '@/types/customer'

export function CartDrawer({ store }: { store: Store }) {
  const [open, setOpen]               = useState(false)
  const { items, itemCount, subtotal,
          removeItem, updateQty, clear } = useCart()

  const checkoutHref = `/stores/${store.slug}/checkout`

  return (
    <>
      {/* Trigger button (mounted in Navbar) */}
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Open cart"
        id="cart-trigger"
      >
        🛒
        <AnimatePresence>
          {itemCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{   scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center"
              style={{ backgroundColor: store.primary_color ?? '#6366f1' }}
            >
              {itemCount > 9 ? '9+' : itemCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{   x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-white z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900">Your Cart</h2>
                  {/* Store badge — makes it crystal clear whose cart this is */}
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <span>🏪</span>
                    {store.name}
                    {itemCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {itemCount > 0 && (
                    <button
                      onClick={clear}
                      className="text-xs font-bold text-red-400 hover:text-red-600 px-2.5 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 px-6">
                    <span className="text-5xl">🛒</span>
                    <p className="font-bold text-gray-900">Your cart is empty</p>
                    <p className="text-sm text-center">
                      Add items from <span className="font-bold text-gray-700">{store.name}</span> to get started
                    </p>
                    <button
                      onClick={() => setOpen(false)}
                      className="mt-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: store.primary_color ?? '#6366f1' }}
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50 px-4 py-2">
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <motion.li
                          key={`${item.product_id}-${item.variant_id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{   opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.2 }}
                          className="py-3 flex items-start gap-3"
                        >
                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                            {item.product_image ? (
                              <Image
                                src={item.product_image}
                                alt={item.product_name}
                                width={64} height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🖼️</div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 line-clamp-2">
                              {item.product_name}
                            </p>
                            {item.variant_label && (
                              <p className="text-xs text-gray-400 mt-0.5">{item.variant_label}</p>
                            )}
                            <p className="text-sm font-bold mt-1" style={{ color: store.primary_color ?? '#6366f1' }}>
                              RM {item.subtotal.toFixed(2)}
                            </p>

                            {/* Qty controls */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => updateQty(item.product_id, item.variant_id, item.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm transition-colors"
                              >
                                −
                              </button>
                              <span className="text-sm font-bold w-5 text-center tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQty(item.product_id, item.variant_id, item.quantity + 1)}
                                disabled={item.quantity >= item.max_qty}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm transition-colors disabled:opacity-40"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeItem(item.product_id, item.variant_id)}
                                className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-gray-100 p-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-bold text-gray-900">RM {subtotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Delivery fee and service charge calculated at checkout
                  </p>
                  <Link
                    href={checkoutHref}
                    onClick={() => setOpen(false)}
                    className="block w-full text-center py-4 rounded-2xl text-white font-bold text-sm transition-opacity hover:opacity-90 shadow-md"
                    style={{ backgroundColor: store.primary_color ?? '#6366f1' }}
                  >
                    Proceed to Checkout →
                  </Link>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```


***

## 10. Cross-Store Navigation Warning

When a user has items in Store A's cart and visits Store B, show a subtle persistent banner so they're not confused:[^1]

**`apps/web/src/components/cart/CrossStoreCartBanner.tsx`**:

```tsx
'use client'
import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { localCart }           from '@/lib/cart/cart-storage'

interface Props {
  currentStoreSlug: string
  currentStoreName: string
}

export function CrossStoreCartBanner({ currentStoreSlug, currentStoreName }: Props) {
  const [otherCarts, setOtherCarts] = useState<{ slug: string; count: number }[]>([])

  useEffect(() => {
    const others = localCart
      .getAllStoreSlugs()
      .filter((slug) => slug !== currentStoreSlug)
      .map((slug) => ({
        slug,
        count: localCart.read(slug).reduce((s, i) => s + i.quantity, 0),
      }))
      .filter((c) => c.count > 0)

    setOtherCarts(others)
  }, [currentStoreSlug])

  if (otherCarts.length === 0) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <p className="text-amber-800 font-semibold">
          🛒 You have unpurchased items saved from{' '}
          {otherCarts.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ', '}
              <Link
                href={`/stores/${c.slug}`}
                className="font-bold underline hover:text-amber-900"
              >
                {c.slug} ({c.count} item{c.count !== 1 ? 's' : ''})
              </Link>
            </span>
          ))}
        </p>
        <p className="text-amber-600 shrink-0">
          You're now viewing <span className="font-bold">{currentStoreName}</span>
        </p>
      </div>
    </div>
  )
}
```

Add to **`StoreNavbar.tsx`** just below the `<header>` closing tag:

```tsx
import { CrossStoreCartBanner } from '@/components/cart/CrossStoreCartBanner'

// Inside StoreNavbar, after the header:
<CrossStoreCartBanner
  currentStoreSlug={store.slug}
  currentStoreName={store.name}
/>
```


***

## Summary of All Fixes

| Bug | Root Cause | Fix |
| :-- | :-- | :-- |
| Cart shows items from other store | `localStorage` key `"cart"` was global | Key changed to `"cart:${storeSlug}"` — completely isolated |
| Cart count wrong on new store | `CartContext` was a singleton | `CartProvider` is now keyed to `storeSlug`, remounts per store |
| Cross-store items in DB cart | No `store_id` on `carts` table | `carts(user_id, store_id)` unique constraint — one row per store per user |
| Items from wrong store added | No guard on `addItem` | Store-slug check rejects any item where `item.store_slug !== storeSlug` |
| Guest cart lost on login | No merge logic | `mergeGuestCartOnLogin()` called on `SIGNED_IN` event |
| User confused about which cart is active | No UI indicator | `CartDrawer` shows store name badge; `CrossStoreCartBanner` warns of pending carts |
| Auth session leaking across stores | Working as intended | Platform-wide login is correct — store-specific data (loyalty, orders) already scoped by `store_id` from previous sessions |

<div align="center">⁂</div>

[^1]: https://www.achromatic.dev/blog/multi-tenant-architecture-nextjs

