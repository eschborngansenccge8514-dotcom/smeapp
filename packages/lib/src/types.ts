export type UserRole = 'customer' | 'merchant' | 'admin'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type DeliveryType = 'lalamove' | 'easyparcel' | 'pickup'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  push_token: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Store {
  id: string
  owner_id: string
  name: string
  description: string | null
  category: string | null
  address: string | null
  lat: number | null
  lng: number | null
  is_active: boolean
  brand_primary_color: string | null
  brand_subdomain: string | null
  brand_custom_domain: string | null
  brand_app_name: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  image_urls: string[]
  stock_qty: number
  is_available: boolean
  views_count: number
  avg_rating: number
  review_count: number
  sku: string | null
  weight_kg: number | null
  category_id: string | null
  sort_order: number
  created_at: string
  // joined
  store_name?: string
  store_logo?: string
  categories?: { name: string; icon: string }
  product_variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price: number | null
  stock_qty: number
  is_active: boolean
  sort_order: number
}

export interface Order {
  id: string
  customer_id: string
  store_id: string
  status: OrderStatus
  delivery_type: DeliveryType | null
  delivery_fee: number
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  tracking_number: string | null
  courier_name: string | null
  delivery_provider: string | null
  lalamove_order_id: string | null
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  status: PaymentStatus
  amount: number
  currency: string
  created_at: string
  updated_at: string
}
