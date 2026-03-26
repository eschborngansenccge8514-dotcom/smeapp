// ─── Core Entities ─────────────────────────────────────────────────────────

export interface Store {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  contact_email: string | null
  operating_hours: OperatingHours | null
  delivery_options: DeliveryOption[]
  primary_color: string
  font_family: string | null
  industry_type: string | null
  is_active: boolean
  custom_domain: string | null
  domain_verified: boolean
  domain_txt_record: string | null
  subdomain_active: boolean
  rating: number | null
  review_count: number | null
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; is_closed: boolean }
}

export interface DeliveryOption {
  type: 'lalamove' | 'easyparcel' | 'pickup' | 'custom'
  label: string
  estimated_days: string
  base_fee: number | null
}

export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  sale_price: number | null
  image_url: string | null
  gallery_urls: string[]
  is_available: boolean
  stock_qty: number
  category: string | null
  subcategory: string | null
  brand: string | null
  weight_g: number | null
  sku: string | null
  rating: number | null
  review_count: number | null
  is_bestseller: boolean
  is_new_arrival: boolean
  is_on_sale: boolean
  low_stock_threshold: number
  variants: ProductVariant[]
  tags: string[]
  created_at: string
}

export interface ProductVariant {
  id: string
  label: string       // "500g", "Red", "Large"
  price: number
  stock_qty: number
  sku: string | null
}

export interface CartItem {
  product: Product
  variant_id: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

// ─── Order ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface Order {
  id: string
  store_id: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  status: OrderStatus
  items: OrderItem[]
  delivery_address: Address | null
  delivery_option: DeliveryOption | null
  subtotal: number
  delivery_fee: number
  service_fee: number
  discount_amount: number
  total: number
  promo_code: string | null
  notes: string | null
  tracking_number: string | null
  estimated_delivery: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  variant_label: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

// ─── Address ────────────────────────────────────────────────────────────────

export interface Address {
  id?: string
  full_name: string
  phone: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  postcode: string
  country: string
  is_default?: boolean
  label?: 'home' | 'office' | 'other'
  notes?: string | null
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export type CheckoutStep = 'cart' | 'delivery' | 'payment' | 'review' | 'confirmation'

export interface CheckoutState {
  step: CheckoutStep
  items: CartItem[]
  address: Address | null
  delivery_option: DeliveryOption | null
  payment_method: 'fpx' | 'card' | 'ewallet' | 'cod' | null
  promo_code: string | null
  discount_amount: number
  notes: string | null
}

export interface FeeConfig {
  service_fee_rate: number        // e.g. 0.02 for 2%
  service_fee_cap: number | null  // max service fee in RM, null = unlimited
  service_fee_label: string
  free_delivery_threshold: number | null
  min_order_amount: number
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchFilters {
  query: string
  category: string
  min_price: number | null
  max_price: number | null
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'
  in_stock_only: boolean
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
// ─── Store Customer (Multi-Tenant) ──────────────────────────────────────────

export interface StoreCustomer {
  id: string
  user_id: string
  store_id: string
  customer_number: string | null
  loyalty_points: number
  loyalty_tier: 'standard' | 'silver' | 'gold' | 'platinum'
  total_spent: number
  total_orders: number
  avg_order_value: number
  first_order_at: string | null
  last_order_at: string | null
  tags: string[]
  segment: string | null
  notes: string | null
  is_blocked: boolean
  is_subscribed: boolean
  created_at: string
  updated_at: string
}

export interface LoyaltyTransaction {
  id: string
  user_id: string
  store_id: string
  order_id: string | null
  type: 'earn' | 'redeem' | 'expire' | 'adjust'
  points: number
  description: string | null
  created_at: string
}
