import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/tests/utils/render'
import userEvent from '@testing-library/user-event'
import { ProductInfo } from '../ProductInfo'
import React from 'react'
import { useCartStore } from '@/stores/cartStore'

const MOCK_PRODUCT = {
  id: 'p1', store_id: 'store-1', name: 'Kopi O',
  price: 3.50, image_urls: [], stock_qty: 20,
  avg_rating: 0, review_count: 0, description: 'Strong black coffee',
  stores: { id: 'store-1', name: 'Kedai Ali', logo_url: null, rating: 4.2 },
  categories: { name: 'Beverages', icon: '☕' },
  product_variants: [],
}

describe('ProductInfo', () => {
  beforeEach(() => useCartStore.getState().clearCart())

  it('renders name, price, and description', () => {
    render(<ProductInfo product={MOCK_PRODUCT} />)
    expect(screen.getByText('Kopi O')).toBeInTheDocument()
    expect(screen.getByText('RM 3.50')).toBeInTheDocument()
  })

  it('shows In Stock status', () => {
    render(<ProductInfo product={MOCK_PRODUCT} />)
    expect(screen.getByText(/In Stock/i)).toBeInTheDocument()
  })

  it('shows Out of Stock and disables buttons when stock = 0', () => {
    render(<ProductInfo product={{ ...MOCK_PRODUCT, stock_qty: 0 }} />)
    expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /buy now/i })).toBeDisabled()
  })

  it('quantity selector increments and decrements', async () => {
    const user = userEvent.setup()
    render(<ProductInfo product={MOCK_PRODUCT} />)
    const plusBtn  = screen.getByRole('button', { name: /increase quantity/i })
    const minusBtn = screen.getByRole('button', { name: /decrease quantity/i })
    expect(screen.getByText('1')).toBeInTheDocument()
    await user.click(plusBtn)
    expect(screen.getByText('2')).toBeInTheDocument()
    await user.click(minusBtn)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('quantity cannot go below 1', async () => {
    render(<ProductInfo product={MOCK_PRODUCT} />)
    const minusBtn = screen.getByRole('button', { name: /decrease quantity/i })
    expect(minusBtn).toBeDisabled()
  })

  it('adds item to cart on click', async () => {
    const user = userEvent.setup()
    render(<ProductInfo product={MOCK_PRODUCT} />)
    await user.click(screen.getByRole('button', { name: /add to cart/i }))
    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(1)
      expect(useCartStore.getState().items[0].id).toBe('p1')
    })
  })
})
