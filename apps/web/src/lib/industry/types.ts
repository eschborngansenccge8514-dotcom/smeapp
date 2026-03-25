export type IndustrySlug =
  | 'fnb'           // Food & Beverages
  | 'grocery'       // Grocery & Market
  | 'pharmacy'      // Health & Pharmacy
  | 'fashion'       // Fashion & Apparel
  | 'electronics'   // Electronics
  | 'beauty'        // Beauty & Wellness
  | 'default'       // Generic fallback

export interface IndustryTheme {
  slug: IndustrySlug
  primaryColor: string
  accentColor: string
  bgColor: string
  cardStyle: 'portrait' | 'landscape' | 'grid'
  showCategories: boolean
  showHero: boolean
  showRatings: boolean
  showBadges: boolean
  productLabel: string     // "Menu", "Products", "Items"
  searchPlaceholder: string
  emptyIcon: string
  emptyLabel: string
}

export interface FnbBadge {
  type: 'halal' | 'vegan' | 'vegetarian' | 'spicy' | 'popular' | 'new' | 'soldout'
  label: string
  color: string
  bg: string
}

export interface FnbProduct {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  stock_qty: number
  category: string | null
  is_popular?: boolean
  is_new?: boolean
  spice_level?: 0 | 1 | 2 | 3  // 0=none, 1=mild, 2=medium, 3=hot
  is_halal?: boolean
  is_vegan?: boolean
  is_vegetarian?: boolean
  addons?: FnbAddonGroup[]
}

export interface FnbAddonGroup {
  id: string
  name: string           // e.g. "Choose your size", "Add-ons"
  required: boolean
  max_select: number
  options: FnbAddonOption[]
}

export interface FnbAddonOption {
  id: string
  name: string
  price_add: number      // 0 = free
}

export interface FnbStore {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  address: string | null
  category: string | null
  brand_primary_color: string | null
  operating_hours: OperatingHours | null
  is_halal_certified?: boolean
  rating?: number
  review_count?: number
  avg_prep_time_min?: number
  min_order_amount?: number
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; closed?: boolean }
}
