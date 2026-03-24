import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  image_urls: string[]
  quantity: number
  stock_qty: number
  variant_id: string | null
  store_id: string
}

interface CartStore {
  items: CartItem[]
  storeId: string | null
  storeName: string | null
  addItem: (product: any, storeId: string, storeName: string) => void
  removeItem: (id: string, variantId: string | null) => void
  updateQuantity: (id: string, variantId: string | null, qty: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
  getItemQuantity: (id: string, variantId: string | null) => number
  getItemById: (id: string) => CartItem | undefined
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      storeName: null,

      addItem: (product, storeId, storeName) => {
        set((state) => {
          // Cross-store: clear existing cart
          if (state.storeId && state.storeId !== storeId) {
            return {
              items: [{ ...product, quantity: product.quantity ?? 1 }],
              storeId,
              storeName,
            }
          }
          const existing = state.items.find(
            (i) => i.id === product.id && i.variant_id === (product.variant_id ?? null)
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id && i.variant_id === (product.variant_id ?? null)
                  ? { ...i, quantity: Math.min(i.stock_qty, i.quantity + (product.quantity ?? 1)) }
                  : i
              ),
            }
          }
          return {
            items: [...state.items, { ...product, quantity: product.quantity ?? 1 }],
            storeId,
            storeName,
          }
        })
      },

      removeItem: (id, variantId) => {
        set((state) => {
          const items = state.items.filter(
            (i) => !(i.id === id && i.variant_id === variantId)
          )
          return { items, storeId: items.length === 0 ? null : state.storeId,
                   storeName: items.length === 0 ? null : state.storeName }
        })
      },

      updateQuantity: (id, variantId, qty) => {
        if (qty <= 0) { get().removeItem(id, variantId); return }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id && i.variant_id === variantId
              ? { ...i, quantity: Math.min(i.stock_qty, qty) }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [], storeId: null, storeName: null }),
      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getItemQuantity: (id, variantId) =>
        get().items.find((i) => i.id === id && i.variant_id === variantId)?.quantity ?? 0,
      getItemById: (id) => get().items.find((i) => i.id === id),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
)
