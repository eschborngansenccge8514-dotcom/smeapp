export type UserRole = 'customer' | 'merchant' | 'admin'
export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'dispatched' 
  | 'delivered' 
  | 'cancelled'
export type DeliveryType = 'lalamove' | 'easyparcel' | 'self_pickup'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface Store {
  id: string
  owner_id: string
  name: string
  description: string | null
  category: string
  address: string
  postcode: string
  state: string
  lat: number
  lng: number
  logo_url: string | null
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  stock_qty: number
  image_url: string | null
  category: string | null
  is_available: boolean
  created_at: string
}

export interface Order {
  id: string
  customer_id: string
  store_id: string
  status: OrderStatus
  total_amount: number
  delivery_address: string
  delivery_postcode: string
  delivery_state: string
  delivery_lat: number
  delivery_lng: number
  delivery_type: DeliveryType
  tracking_number: string | null
  courier_name: string | null
  lalamove_order_id: string | null
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
}

export interface Payment {
  id: string
  order_id: string
  razorpay_order_id: string
  razorpay_payment_id: string | null
  status: PaymentStatus
  amount: number
  created_at: string
}
