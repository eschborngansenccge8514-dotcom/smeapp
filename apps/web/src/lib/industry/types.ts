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
  primary_color: string | null
  operating_hours: OperatingHours | null
  is_halal_certified?: boolean
  rating?: number
  review_count?: number
  avg_prep_time_min?: number
  min_order_amount?: number
  loyalty_programs?: any[] | null
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; closed?: boolean }
}

export interface GroceryProduct {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  stock_qty: number
  category: string | null            // department: "Fresh Produce", "Dairy", etc.
  subcategory?: string | null        // "Vegetables", "Fruits", etc.
  brand?: string | null
  weight_value?: number | null       // e.g. 500
  weight_unit?: 'g' | 'kg' | 'ml' | 'L' | 'pcs' | 'pack' | null
  price_per_unit?: number | null     // price per 100g / per L
  price_per_unit_label?: string | null // "per 100g", "per L"
  is_organic?: boolean
  is_local?: boolean
  is_on_promotion?: boolean
  promotion_label?: string | null    // "2 for RM5", "Buy 3 Free 1"
  promotion_price?: number | null    // promotional price
  min_order_qty?: number | null
  max_order_qty?: number | null
  country_of_origin?: string | null
  expiry_note?: string | null        // "Best before 3 days"
  low_stock_threshold?: number       // show "only X left" warning
}

export interface GroceryDepartment {
  name: string
  icon: string
  subcategories: string[]
}

export interface GroceryBundle {
  id: string
  title: string                      // "Buy 2 Free 1 — Fresh Milk"
  subtitle?: string
  products: GroceryProduct[]
  bundle_price?: number
  bundle_type: 'multi_buy' | 'combo' | 'buy_x_free_y'
  buy_qty?: number
  free_qty?: number
  end_date?: string
}

export type RxStatus = 'otc' | 'prescription' | 'pharmacist_only' | 'supplement'

export interface PharmacyProduct {
  id: string
  name: string
  generic_name?: string | null        // e.g. "Paracetamol" for "Panadol"
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  stock_qty: number
  category: string | null             // "Pain Relief", "Cold & Flu", etc.
  brand?: string | null
  rx_status: RxStatus                 // OTC / Rx / Pharmacist / Supplement
  dosage_form?: string | null         // "Tablet", "Capsule", "Syrup", "Cream"
  dosage_strength?: string | null     // "500mg", "10mg/5ml"
  pack_size?: string | null           // "10 tablets", "100ml"
  active_ingredient?: string | null
  indications?: string[] | null       // ["Fever", "Headache", "Pain Relief"]
  warnings?: string[] | null          // ["Do not exceed 8 tablets in 24 hours"]
  age_restriction?: string | null     // "Not for children under 12"
  requires_consultation?: boolean
  country_of_origin?: string | null
  registration_no?: string | null     // KKM/MAL registration number
  is_on_promotion?: boolean
  promotion_price?: number | null
  promotion_label?: string | null
  low_stock_threshold?: number
  max_order_qty?: number | null
}

export interface PharmacyCategory {
  name: string
  icon: string
  subcategories: string[]
}

export type FashionSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'
  | '28' | '30' | '32' | '34' | '36' | '38' | '40'   // waist
  | '36' | '37' | '38' | '39' | '40' | '41' | '42'   // shoes EU
  | 'One Size' | 'Free Size'

export interface FashionColour {
  name: string            // "Midnight Black", "Cream White"
  hex: string             // "#1A1A1A"
  image_url?: string | null  // colour-specific product photo
  stock_by_size?: Record<string, number>
}

export interface FashionVariant {
  id: string
  size: string
  colour: string
  sku?: string | null
  stock_qty: number
  price_add?: number     // 0 = same price, >0 = upsize charge
}

export interface FashionProduct {
  id: string
  name: string
  description: string | null
  price: number
  sale_price?: number | null
  image_url: string | null
  gallery_urls?: string[]          // additional product photos
  is_available: boolean
  stock_qty: number
  category: string | null          // "Tops", "Bottoms", "Dresses", etc.
  subcategory?: string | null      // "T-Shirts", "Jeans", etc.
  brand?: string | null
  colours: FashionColour[]
  sizes: string[]
  variants: FashionVariant[]
  material?: string | null         // "100% Cotton", "Polyester blend"
  care_instructions?: string[] | null
  fit_type?: string | null         // "Slim Fit", "Regular", "Oversized"
  is_new_arrival?: boolean
  is_bestseller?: boolean
  is_on_sale?: boolean
  collection?: string | null       // "Summer 2026", "Raya Collection"
  gender_target?: 'men' | 'women' | 'unisex' | 'kids' | null
  tags?: string[]                  // ["casual", "formal", "streetwear"]
  model_height?: string | null     // "Model is 170cm, wearing size S"
  country_of_origin?: string | null
}

export interface FashionCollection {
  name: string
  cover_url?: string | null
  description?: string | null
}


export interface ElectronicsVariant {
  id: string
  label: string               // "256GB · Midnight Black"
  options: Record<string, string> // { storage: "256GB", colour: "Midnight Black" }
  price: number
  stock_qty: number
  sku?: string | null
}

export interface ElectronicsSpec {
  group: string               // "Display", "Performance", "Camera"
  key: string                 // "Screen Size"
  value: string               // "6.7 inches"
  highlight?: boolean         // Show in quick-spec strip
}

export interface ElectronicsProduct {
  id: string
  name: string
  description: string | null
  price: number                    // Base / lowest variant price
  image_url: string | null
  gallery_urls?: string[]
  is_available: boolean
  stock_qty: number
  category: string | null          // "Smartphones", "Laptops", "Audio", etc.
  subcategory?: string | null
  brand?: string | null
  model_number?: string | null
  variants: ElectronicsVariant[]
  variant_options?: Record<string, string[]>  // { storage: ["128GB","256GB"], colour: [...] }
  specs: ElectronicsSpec[]
  quick_specs?: string[]           // ["6.7\" OLED", "5000mAh", "50MP Camera"]
  warranty_months?: number | null  // 12, 24
  is_official_warranty?: boolean
  is_new_arrival?: boolean
  is_bestseller?: boolean
  is_on_promotion?: boolean
  promotion_price?: number | null
  promotion_label?: string | null
  is_refurbished?: boolean
  refurbished_grade?: 'A' | 'B' | 'C' | null
  rating?: number | null
  review_count?: number | null
  in_box_items?: string[]          // ["Phone", "USB-C Cable", "Quick Charger"]
  low_stock_threshold?: number
  max_order_qty?: number | null
}
