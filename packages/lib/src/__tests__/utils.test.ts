import { describe, it, expect } from 'vitest'
import { formatPrice, haversineKm, slugify, truncate } from '../utils'

describe('formatPrice', () => {
  it('formats whole number', ()   => expect(formatPrice(10)).toBe('RM 10.00'))
  it('formats decimal',    ()   => expect(formatPrice(9.5)).toBe('RM 9.50'))
  it('formats zero',       ()   => expect(formatPrice(0)).toBe('RM 0.00'))
  it('formats large amount', () => expect(formatPrice(1234.5)).toBe('RM 1,234.50'))
})

describe('slugify', () => {
  it('lowercases and replaces spaces', () => expect(slugify('Hello World')).toBe('hello-world'))
  it('removes special chars',          () => expect(slugify('Café & Bar!')).toBe('cafe-bar'))
  it('trims leading/trailing dashes',  () => expect(slugify('--Test--')).toBe('test'))
})

describe('truncate', () => {
  it('does not truncate short strings', () => expect(truncate('Hi', 10)).toBe('Hi'))
  it('truncates long strings',          () => expect(truncate('Hello World', 5)).toBe('Hello...'))
})

describe('haversineKm', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm(3.139, 101.686, 3.139, 101.686)).toBeCloseTo(0, 1)
  })
  it('calculates KL to Putrajaya (~25km)', () => {
    expect(haversineKm(3.139, 101.686, 2.926, 101.696)).toBeCloseTo(23.7, 0)
  })
})
