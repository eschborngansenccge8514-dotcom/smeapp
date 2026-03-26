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
