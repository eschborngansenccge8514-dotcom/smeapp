export const ELECTRONICS_CATEGORIES = [
  { name: 'Smartphones',    icon: '📱', subcategories: ['Android', 'iPhone', 'Foldables'] },
  { name: 'Laptops',        icon: '💻', subcategories: ['Gaming', 'Ultrabook', 'Chromebook', 'MacBook'] },
  { name: 'Tablets',        icon: '📟', subcategories: ['iPad', 'Android Tablet', 'E-Readers'] },
  { name: 'Audio',          icon: '🎧', subcategories: ['TWS Earbuds', 'Headphones', 'Speakers', 'Soundbars'] },
  { name: 'Wearables',      icon: '⌚', subcategories: ['Smartwatches', 'Fitness Bands', 'Smart Glasses'] },
  { name: 'Gaming',         icon: '🎮', subcategories: ['Consoles', 'Controllers', 'Gaming Mice', 'Monitors'] },
  { name: 'Cameras',        icon: '📷', subcategories: ['DSLR', 'Mirrorless', 'Action Cameras', 'Lenses'] },
  { name: 'Smart Home',     icon: '🏠', subcategories: ['Smart Bulbs', 'Security Cameras', 'Smart Plugs', 'Routers'] },
  { name: 'Accessories',    icon: '🔌', subcategories: ['Cables', 'Chargers', 'Power Banks', 'Cases', 'Screen Protectors'] },
  { name: 'Networking',     icon: '📡', subcategories: ['Routers', 'Mesh Systems', 'Network Switches'] },
]

export const SPEC_GROUP_ORDER = [
  'Overview', 'Display', 'Performance', 'Memory & Storage',
  'Camera', 'Battery', 'Connectivity', 'Physical', 'Software',
]

export const TRUST_BADGES = [
  { icon: '🛡️', label: 'Official Warranty',   key: 'is_official_warranty' },
  { icon: '✅', label: 'Genuine Product',      key: 'genuine' },
  { icon: '🔄', label: 'Free Returns',         key: 'returns' },
  { icon: '⚡', label: 'Fast Delivery',        key: 'fast_delivery' },
]

export const REFURBISHED_GRADES = {
  A: { label: 'Grade A — Like New',   color: '#065F46', bg: '#D1FAE5', description: 'No visible scratches. All functions perfect.' },
  B: { label: 'Grade B — Good',       color: '#92400E', bg: '#FEF3C7', description: 'Minor cosmetic wear. Fully functional.' },
  C: { label: 'Grade C — Fair',       color: '#991B1B', bg: '#FEE2E2', description: 'Visible marks. Fully functional.' },
}

export const SORT_OPTIONS = [
  { value: 'default',     label: 'Recommended' },
  { value: 'price_asc',   label: 'Price: Low to High' },
  { value: 'price_desc',  label: 'Price: High to Low' },
  { value: 'rating',      label: 'Top Rated' },
  { value: 'new_first',   label: 'New Arrivals' },
  { value: 'promo_first', label: 'On Sale' },
]
