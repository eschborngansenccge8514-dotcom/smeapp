import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/tests/utils/render'
import { ProductCard } from '../ProductCard'
import React from 'react'
import { useCartStore } from '@/stores/cartStore'

const MOCK_PRODUCT = {
  id: 'p1', store_id: 'store-1', name: 'Nasi Lemak Ayam',
  price: 8.50, image_urls: ['https://example.com/img.jpg'],
  stock_qty: 10, is_available: true, avg_rating: 4.5, review_count: 12,
  product_variants: [],
}

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(<ProductCard product={MOCK_PRODUCT} storeSlug="test-store" />)
    expect(screen.getByText('Nasi Lemak Ayam')).toBeInTheDocument()
    expect(screen.getByText('RM 8.50')).toBeInTheDocument()
  })

  it('shows rating stars when avg_rating > 0', () => {
    render(<ProductCard product={MOCK_PRODUCT} storeSlug="test-store" />)
    expect(screen.getByText('(12)')).toBeInTheDocument()
  })

  it('shows Out of Stock badge when stock_qty = 0', () => {
    render(<ProductCard product={{ ...MOCK_PRODUCT, stock_qty: 0 }} storeSlug="test-store" />)
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
  })

  it('shows Low Stock badge when stock_qty <= 5', () => {
    render(<ProductCard product={{ ...MOCK_PRODUCT, stock_qty: 3 }} storeSlug="test-store" />)
    expect(screen.getByText('Only 3 left')).toBeInTheDocument()
  })

  it('does NOT show add to cart button when out of stock', () => {
    render(<ProductCard product={{ ...MOCK_PRODUCT, stock_qty: 0 }} storeSlug="test-store" />)
    expect(screen.queryByRole('button', { name: /cart/i })).not.toBeInTheDocument()
  })

  it('links to correct product URL', () => {
    render(<ProductCard product={MOCK_PRODUCT} storeSlug="test-store" />)
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === '/store/store-1/product/p1')).toBe(true)
  })
})
