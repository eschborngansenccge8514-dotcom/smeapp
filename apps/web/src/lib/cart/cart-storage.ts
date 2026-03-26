import type { CartLineItem } from './cart-types'
import { createClient } from '@/lib/supabase/client'

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
