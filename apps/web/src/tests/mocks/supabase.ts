import { vi } from 'vitest'

export const mockSupabaseClient = {
  auth: {
    getUser:  vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null }),
    signOut:  vi.fn().mockResolvedValue({ error: null }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq:     vi.fn().mockReturnThis(),
  neq:    vi.fn().mockReturnThis(),
  in:     vi.fn().mockReturnThis(),
  order:  vi.fn().mockReturnThis(),
  limit:  vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }),
  removeChannel: vi.fn(),
  storage: {
    from: vi.fn().mockReturnValue({
      upload:    vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
    }),
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}

// Reset between tests
export function resetSupabaseMocks() {
  Object.values(mockSupabaseClient).forEach((v) => {
    if (typeof v === 'object' && v !== null) {
      Object.values(v).forEach((fn) => {
        if (vi.isMockFunction(fn)) fn.mockReset()
      })
    }
    if (vi.isMockFunction(v)) v.mockReset()
  })
}
