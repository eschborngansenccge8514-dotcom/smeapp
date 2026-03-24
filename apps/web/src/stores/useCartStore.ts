'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl: string | null
}

interface CartStore {
  items: CartItem[]
  storeId: string | null
  storeName: string | null
  addItem: (item: CartItem, storeId: string, storeName: string) => 'added' | 'cross_store'
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
  getItemById: (productId: string) => CartItem | undefined
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      storeName: null,

      addItem: (item, storeId, storeName) => {
        const { storeId: currentStoreId, items } = get()
        if (currentStoreId && currentStoreId !== storeId) return 'cross_store'

        const existing = items.find((i) => i.productId === item.productId)
        if (existing) {
          set({ items: items.map((i) => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i) })
        } else {
          set({ items: [...items, item], storeId, storeName })
        }
        return 'added'
      },

      removeItem: (productId) => set((state) => {
        const next = state.items.filter((i) => i.productId !== productId)
        return { items: next, storeId: next.length ? state.storeId : null, storeName: next.length ? state.storeName : null }
      }),

      updateQuantity: (productId, quantity) => set((state) => ({
        items: quantity <= 0
          ? state.items.filter((i) => i.productId !== productId)
          : state.items.map((i) => i.productId === productId ? { ...i, quantity } : i),
      })),

      clearCart: () => set({ items: [], storeId: null, storeName: null }),
      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getItemById: (productId) => get().items.find((i) => i.productId === productId),
    }),
    { name: 'web-cart-storage', storage: createJSONStorage(() => localStorage) }
  )
)
