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
