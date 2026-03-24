import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/tests/utils/render'
import userEvent from '@testing-library/user-event'
import { CheckoutFlow } from '../CheckoutFlow'
import React from 'react'
import { useCartStore } from '@/stores/cartStore'

const MOCK_ADDRESSES = [{
  id: 'addr-1', label: 'Home', recipient: 'Ahmad Bin Ali',
  phone: '0123456789', address_line: 'No 1 Jalan Mawar',
  city: 'Kuala Lumpur', state: 'Kuala Lumpur', postcode: '50450',
  is_default: true, lat: 3.139, lng: 101.686,
}]

const MOCK_PROFILE = { full_name: 'Ahmad Bin Ali', phone: '0123456789', email: 'ahmad@example.com' }

describe('CheckoutFlow', () => {
  beforeEach(() => {
    const { addItem } = useCartStore.getState()
    useCartStore.getState().clearCart()
    addItem({ id: 'p1', name: 'Nasi Lemak', price: 8.50, image_urls: [], stock_qty: 10, variant_id: null, quantity: 2 }, 'store-1', 'Ali Store')
  })

  it('shows address step first', () => {
    render(<CheckoutFlow addresses={MOCK_ADDRESSES} profile={MOCK_PROFILE} userId="user-1" />)
    expect(screen.getByText('Delivery Address')).toBeInTheDocument()
  })

  it('pre-selects default address', () => {
    render(<CheckoutFlow addresses={MOCK_ADDRESSES} profile={MOCK_PROFILE} userId="user-1" />)
    expect(screen.getByText('Ahmad Bin Ali')).toBeInTheDocument()
  })

  it('advances to delivery step on continue', async () => {
    const user = userEvent.setup()
    render(<CheckoutFlow addresses={MOCK_ADDRESSES} profile={MOCK_PROFILE} userId="user-1" />)
    await user.click(screen.getByRole('button', { name: /continue to delivery/i }))
    await waitFor(() => expect(screen.getByText('Delivery Method')).toBeInTheDocument())
  })
})
