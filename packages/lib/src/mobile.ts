// Mobile-specific exports (no browser APIs)
export { useAuth } from './hooks/useAuth'
export type { 
  Profile, Store, Product, Order, OrderItem, Payment,
  UserRole, OrderStatus, DeliveryType, PaymentStatus 
} from './types'
export { useCreatePaymentOrder } from './hooks/usePayment'
// Do NOT export supabase client here — mobile creates its own instance
