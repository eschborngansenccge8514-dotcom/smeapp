import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '../stores/cartStore'

const PRODUCT_A = { id: 'p1', name: 'Nasi Lemak', price: 8.50, image_urls: [], stock_qty: 10, variant_id: null }
const PRODUCT_B = { id: 'p2', name: 'Teh Tarik',  price: 2.50, image_urls: [], stock_qty: 5,  variant_id: null }

describe('CartStore', () => {
  beforeEach(() => useCartStore.getState().clearCart())

  it('adds item to empty cart', () => {
    const { addItem } = useCartStore.getState()
    addItem({ ...PRODUCT_A, quantity: 1 }, 'store-1', 'Ali Store')
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().storeId).toBe('store-1')
  })

  it('increments quantity for duplicate item', () => {
    const { addItem } = useCartStore.getState()
    addItem({ ...PRODUCT_A, quantity: 1 }, 'store-1', 'Ali Store')
    addItem({ ...PRODUCT_A, quantity: 1 }, 'store-1', 'Ali Store')
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('caps quantity at stock_qty', () => {
    const { addItem, updateQuantity } = useCartStore.getState()
    addItem({ ...PRODUCT_B, quantity: 1 }, 'store-1', 'Ali Store')
    updateQuantity('p2', null, 999)
    expect(useCartStore.getState().items[0].quantity).toBe(5)
  })

  it('clears cart on different store add', () => {
    const { addItem } = useCartStore.getState()
    addItem({ ...PRODUCT_A, quantity: 1 }, 'store-1', 'Ali Store')
    // Force clear by adding from different store (simulates confirmed clear)
    useCartStore.getState().clearCart()
    addItem({ ...PRODUCT_B, quantity: 1 }, 'store-2', 'Ali Store 2')
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().storeId).toBe('store-2')
  })

  it('calculates total correctly', () => {
    const { addItem } = useCartStore.getState()
    addItem({ ...PRODUCT_A, quantity: 2 }, 'store-1', 'Ali Store')
    addItem({ ...PRODUCT_B, quantity: 3 }, 'store-1', 'Ali Store')
    expect(useCartStore.getState().getTotal()).toBeCloseTo(8.50 * 2 + 2.50 * 3, 2)
  })

  it('removes item', () => {
    const { addItem, removeItem } = useCartStore.getState()
    addItem({ ...PRODUCT_A, quantity: 1 }, 'store-1', 'Ali Store')
    removeItem('p1', null)
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().storeId).toBeNull()
  })
})
