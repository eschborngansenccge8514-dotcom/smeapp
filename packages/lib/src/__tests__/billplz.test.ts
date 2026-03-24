import { describe, it, expect } from 'vitest'
import { verifyXSignature } from '../billplz/client'

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
