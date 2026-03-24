import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock all external deps
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServer: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'user-1', full_name: 'Ahmad', email: 'a@b.com', phone: '012' },
    }),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'order-abc' }, error: null }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  }),
}))

vi.mock('@repo/lib', () => ({
  createBill: vi.fn().mockResolvedValue({
    id:   'bill-xyz',
    url:  'https://www.billplz-sandbox.com/bills/bill-xyz',
    paid: false,
  }),
  formatPrice: (p: number) => `RM ${p.toFixed(2)}`,
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/checkout/create-order', {
    method: 'POST',
    body:   JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/checkout/create-order', () => {
  it('creates order and returns billUrl on success', async () => {
    const res = await POST(makeRequest({
      storeId:    'store-1',
      items:      [{ id: 'p1', name: 'Item', price: 10, quantity: 1, variant_id: null }],
      address:    { id: 'addr-1', recipient: 'A', phone: '012', address_line: 'Jln', city: 'KL', state: 'KL', postcode: '50450' },
      deliveryType:   'lalamove',
      deliveryFee:    8.50,
      promotionId:    null,
      discountAmount: 0,
      notes:          '',
      subtotal:       10,
      serviceFee:     0.20,
      total:          18.70,
    }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.billUrl).toContain('billplz-sandbox')
    expect(json.orderId).toBe('order-abc')
  })
})
