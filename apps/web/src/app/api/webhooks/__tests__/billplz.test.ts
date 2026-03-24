import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockCreateSupabaseAdmin } = vi.hoisted(() => ({
  mockCreateSupabaseAdmin: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('../../../../lib/supabase/admin', () => ({
  createSupabaseAdmin: mockCreateSupabaseAdmin,
}))

import { POST } from '../billplz/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

function buildSignedParams(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort()
  const payload = sorted.map((k) => `${k}${params[k]}`).join('|')
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const all = { ...params, x_signature: sig }
  return new URLSearchParams(all).toString()
}

describe('POST /api/webhooks/billplz', () => {
  const SECRET = 'test-webhook-secret'

  beforeEach(() => {
    process.env.BILLPLZ_X_SIGNATURE_KEY = SECRET
    process.env.INTERNAL_SECRET         = 'internal-secret'
    process.env.NEXT_PUBLIC_APP_URL     = 'http://localhost:3000'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    mockCreateSupabaseAdmin.mockClear()
  })

  it('returns 400 on invalid signature', async () => {
    const body = new URLSearchParams({ id: 'bill-1', paid: 'true', x_signature: 'bad' }).toString()
    const req  = new NextRequest('http://localhost/api/webhooks/billplz', {
      method: 'POST', body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('updates payment to paid on valid paid=true callback', async () => {
    const body = buildSignedParams({
      id:          'bill-1',
      paid:        'true',
      paid_at:     '2026-01-01T12:00:00',
      reference_1: 'order-abc',
    }, SECRET)
    const req = new NextRequest('http://localhost/api/webhooks/billplz', {
      method: 'POST', body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const res  = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
  })
})
