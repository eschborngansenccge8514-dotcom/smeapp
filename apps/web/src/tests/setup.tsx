import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { server } from './mocks/server'
import React from 'react'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.INTERNAL_SECRET = 'test-internal-secret'
process.env.BILLPLZ_X_SIGNATURE_KEY = 'test-secret'

// Start MSW mock server
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => { server.resetHandlers(); cleanup() })
afterAll(() => server.close())

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter:     () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname:   () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect:      vi.fn(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowser: () => mockSupabaseClient,
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast:   { success: vi.fn(), error: vi.fn() },
}))

// Note: mockSupabaseClient needs to be imported or defined
import { mockSupabaseClient } from './mocks/supabase'
