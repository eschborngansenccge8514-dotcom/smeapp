import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/tests/utils/render'
import { OrderCard } from '../OrderCard'
import React from 'react'

const MOCK_ORDER = {
  id: 'order-1', status: 'confirmed', total_amount: 18.50,
  created_at: new Date().toISOString(),
  profiles: { full_name: 'Nurul Ain' },
  order_items: [
    { id: 'oi-1', products: { name: 'Nasi Lemak' }, quantity: 2 },
  ],
  delivery_type: 'lalamove',
}

describe('OrderCard', () => {
  it('renders customer name and total', () => {
    render(<OrderCard order={MOCK_ORDER} onAdvance={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Nurul Ain')).toBeInTheDocument()
    expect(screen.getByText('RM 18.50')).toBeInTheDocument()
  })

  it('shows correct advance button label for "confirmed"', () => {
    render(<OrderCard order={MOCK_ORDER} onAdvance={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: /start preparing/i })).toBeInTheDocument()
  })

  it('calls onAdvance when advance button clicked', async () => {
    const onAdvance = vi.fn()
    render(<OrderCard order={MOCK_ORDER} onAdvance={onAdvance} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /start preparing/i }))
    expect(onAdvance).toHaveBeenCalledOnce()
  })

  it('shows Lalamove delivery type', () => {
    render(<OrderCard order={MOCK_ORDER} onAdvance={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/lalamove/i)).toBeInTheDocument()
  })
})
