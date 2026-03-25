// Server-safe exports only — no React hooks, no browser APIs
export { supabase } from './supabase'
export type { 
  Profile, Store, Product, Order, OrderItem, Payment,
  UserRole, OrderStatus, DeliveryType, PaymentStatus
} from './types'
export { ringgitToSen, senToRinggit, formatOrderId } from './payment'
export * from './billplz/client'
export * from './lalamove/client'
export * from './easyparcel/client'

// Client-only exports — import from '@repo/lib/client' in Client Components
// export * from './hooks/useAuth'   ← moved to @repo/lib/client
// export * from './stores/cartStore' ← moved to @repo/lib/client
