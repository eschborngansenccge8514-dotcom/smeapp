export const CacheKeys = {
  // Store
  store:         (slug: string)                => `store:${slug}`,
  storeById:     (id: string)                  => `store:id:${id}`,
  storeProducts: (storeId: string, page = 1)   => `store:${storeId}:products:p${page}`,
  storeCategories:(storeId: string)            => `store:${storeId}:categories`,
  storeHours:    (storeId: string)             => `store:${storeId}:hours`,

  // Products
  product:       (id: string)                  => `product:${id}`,
  productSearch: (storeId: string, q: string)  => `search:${storeId}:${q}`,
  productsByCategory:(storeId: string, cat: string, page = 1) =>
    `store:${storeId}:cat:${cat}:p${page}`,
  featuredProducts: (storeId: string)          => `store:${storeId}:featured`,

  // Orders
  ordersByStore: (storeId: string, page = 1)   => `orders:store:${storeId}:p${page}`,
  orderById:     (id: string)                  => `order:${id}`,

  // Dashboard stats
  dashboardStats: (storeId: string)            => `dashboard:stats:${storeId}`,
  revenueChart:  (storeId: string, period: string) => `dashboard:revenue:${storeId}:${period}`,

  // CRM
  crmContacts:   (storeId: string)             => `crm:contacts:${storeId}`,
  crmStats:      (storeId: string)             => `crm:stats:${storeId}`,

  // Geo
  nearbyStores:  (lat: number, lng: number, radius: number) =>
    `geo:stores:${lat.toFixed(3)}:${lng.toFixed(3)}:r${radius}`,
} as const

export const CacheTTL = {
  // Hot data — changes frequently
  dashboardStats:  30,        // 30 seconds
  ordersByStore:   15,        // 15 seconds (real-time feel)

  // Warm data — changes sometimes
  storeProducts:   60 * 5,    // 5 minutes
  productDetail:   60 * 10,   // 10 minutes
  crmContacts:     60 * 2,    // 2 minutes

  // Cold data — rarely changes
  storeInfo:       60 * 60,   // 1 hour
  storeCategories: 60 * 60,   // 1 hour
  nearbyStores:    60 * 15,   // 15 minutes
  revenueChart:    60 * 30,   // 30 minutes
} as const

export const CacheTags = {
  store:    (id: string) => `store-${id}`,
  products: (storeId: string) => `products-${storeId}`,
  orders:   (storeId: string) => `orders-${storeId}`,
  crm:      (storeId: string) => `crm-${storeId}`,
}
