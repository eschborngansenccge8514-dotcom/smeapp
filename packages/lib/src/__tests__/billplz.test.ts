import { describe, it, expect } from 'vitest'
import { verifyXSignature, getBillUrl, getAuth } from '../billplz/client'

describe('verifyXSignature', () => {
  it('validates a correct signature', () => {
    // Uses test key from Billplz sandbox docs
    process.env.BILLPLZ_X_SIGNATURE_KEY = 'test-secret-key'
    const params: Record<string, string> = {
      id:          'abc123',
      paid:        'true',
      paid_at:     '2026-01-01 12:00:00 +0800',
    }
    // Compute expected signature
    const crypto = require('crypto')
    const sorted = Object.keys(params).sort()
    const payload = sorted.map((k) => `${k}${params[k]}`).join('|')
    const sig = crypto.createHmac('sha256', 'test-secret-key').update(payload).digest('hex')
    params.x_signature = sig
    expect(verifyXSignature(params)).toBe(true)
  })

  it('rejects a tampered signature', () => {
    process.env.BILLPLZ_X_SIGNATURE_KEY = 'test-secret-key'
    expect(verifyXSignature({ id: 'abc', paid: 'true', x_signature: 'fake' })).toBe(false)
  })
})

describe('getBillUrl', () => {
  it('returns correctly without bank code', () => {
    process.env.BILLPLZ_SANDBOX = 'true'
    expect(getBillUrl('bill123')).toBe('https://www.billplz-sandbox.com/bills/bill123')
  })

  it('returns correctly with bank code', () => {
    process.env.BILLPLZ_SANDBOX = 'true'
    expect(getBillUrl('bill123', 'maybank2u')).toBe('https://www.billplz-sandbox.com/bills/bill123?bank_code=maybank2u&auto_submit=true')
  })
})

describe('getAuth', () => {
  it('throws error when BILLPLZ_API_KEY is missing', () => {
    const originalKey = process.env.BILLPLZ_API_KEY
    delete process.env.BILLPLZ_API_KEY
    expect(() => getAuth()).toThrow('BILLPLZ_API_KEY is not set in environment variables')
    process.env.BILLPLZ_API_KEY = originalKey
  })
})
