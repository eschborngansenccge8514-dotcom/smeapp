export interface CrmContact {
  id: string
  store_id: string
  user_id?: string | null
  full_name: string
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  tags?: string[]
  segment?: 'vip' | 'at_risk' | 'new' | 'loyal' | 'inactive' | string | null
  total_orders: number
  total_spent: number
  avg_order_value: number
  last_order_at?: string | null
  first_order_at?: string | null
  notes?: string | null
  is_subscribed: boolean
  is_blocked: boolean
  custom_fields?: Record<string, any>
  created_at: string
  updated_at: string
}
