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
