import type { IndustrySlug, IndustryTheme } from './types'

const CATEGORY_TO_INDUSTRY: Record<string, IndustrySlug> = {
  '🍜 Food & Beverages': 'fnb',
  '🛒 Grocery & Market': 'grocery',
  '💊 Health & Pharmacy': 'pharmacy',
  '👗 Fashion & Apparel': 'fashion',
  '📱 Electronics': 'electronics',
  '💄 Beauty & Wellness': 'beauty',
}

export function resolveIndustry(category: string | null): IndustrySlug {
  if (!category) return 'default'
  return CATEGORY_TO_INDUSTRY[category] ?? 'default'
}

export const INDUSTRY_THEMES: Record<IndustrySlug, IndustryTheme> = {
  fnb: {
    slug: 'fnb',
    primaryColor: '#E85D04',
    accentColor: '#FAA307',
    bgColor: '#FFFBF5',
    cardStyle: 'landscape',
    showCategories: true,
    showHero: true,
    showRatings: true,
    showBadges: true,
    productLabel: 'Menu',
    searchPlaceholder: 'Search dishes…',
    emptyIcon: '🍽️',
    emptyLabel: 'No items available right now',
  },
  grocery: {
    slug: 'grocery',
    primaryColor: '#2D6A4F',
    accentColor: '#52B788',
    bgColor: '#F0FDF4',
    cardStyle: 'grid',
    showCategories: true,
    showHero: false,
    showRatings: false,
    showBadges: true,
    productLabel: 'Products',
    searchPlaceholder: 'Search products…',
    emptyIcon: '🛒',
    emptyLabel: 'No products available',
  },
  pharmacy: {
    slug: 'pharmacy',
    primaryColor: '#0077B6',
    accentColor: '#00B4D8',
    bgColor: '#F0F9FF',
    cardStyle: 'grid',
    showCategories: true,
    showHero: false,
    showRatings: false,
    showBadges: false,
    productLabel: 'Products',
    searchPlaceholder: 'Search medicines…',
    emptyIcon: '💊',
    emptyLabel: 'No products available',
  },
  fashion: {
    slug: 'fashion',
    primaryColor: '#1A1A2E',
    accentColor: '#E94560',
    bgColor: '#FAFAFA',
    cardStyle: 'portrait',
    showCategories: true,
    showHero: true,
    showRatings: true,
    showBadges: true,
    productLabel: 'Collection',
    searchPlaceholder: 'Search styles…',
    emptyIcon: '👗',
    emptyLabel: 'No items in collection',
  },
  electronics: {
    slug: 'electronics',
    primaryColor: '#2B2D42',
    accentColor: '#EF233C',
    bgColor: '#F8F9FA',
    cardStyle: 'grid',
    showCategories: true,
    showHero: false,
    showRatings: true,
    showBadges: false,
    productLabel: 'Products',
    searchPlaceholder: 'Search products…',
    emptyIcon: '📱',
    emptyLabel: 'No products available',
  },
  beauty: {
    slug: 'beauty',
    primaryColor: '#C9184A',
    accentColor: '#FF758F',
    bgColor: '#FFF0F3',
    cardStyle: 'portrait',
    showCategories: true,
    showHero: true,
    showRatings: true,
    showBadges: true,
    productLabel: 'Products',
    searchPlaceholder: 'Search products…',
    emptyIcon: '💄',
    emptyLabel: 'No products available',
  },
  default: {
    slug: 'default',
    primaryColor: '#6366F1',
    accentColor: '#818CF8',
    bgColor: '#F8FAFC',
    cardStyle: 'grid',
    showCategories: false,
    showHero: false,
    showRatings: false,
    showBadges: false,
    productLabel: 'Products',
    searchPlaceholder: 'Search…',
    emptyIcon: '🛍️',
    emptyLabel: 'No products available',
  },
}

export function getIndustryTheme(category: string | null): IndustryTheme {
  return INDUSTRY_THEMES[resolveIndustry(category)]
}

export function isStoreOpen(hours: Record<string, { open: string; close: string; closed?: boolean }> | null): {
  isOpen: boolean; label: string; nextChange: string
} {
  if (!hours) return { isOpen: true, label: 'Open', nextChange: '' }

  const now = new Date()
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const today = days[now.getDay()]
  const todayHours = hours[today]

  if (!todayHours || todayHours.closed) {
    return { isOpen: false, label: 'Closed today', nextChange: '' }
  }

  const [openH, openM] = todayHours.open.split(':').map(Number)
  const [closeH, closeM] = todayHours.close.split(':').map(Number)
  const currentMin = now.getHours() * 60 + now.getMinutes()
  const openMin = openH * 60 + openM
  const closeMin = closeH * 60 + closeM

  if (currentMin >= openMin && currentMin < closeMin) {
    return { isOpen: true, label: 'Open now', nextChange: `Closes ${todayHours.close}` }
  }
  if (currentMin < openMin) {
    return { isOpen: false, label: 'Closed', nextChange: `Opens ${todayHours.open}` }
  }
  return { isOpen: false, label: 'Closed', nextChange: 'Reopens tomorrow' }
}
