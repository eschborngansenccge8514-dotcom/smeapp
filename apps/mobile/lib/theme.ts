import Constants from 'expo-constants'

interface BrandConfig {
  appName: string
  slug: string
  bundleId: string
  primaryColor: string
  isSingleStore: boolean
  storeId: string | null
}

const brand: BrandConfig = Constants.expoConfig?.extra?.brand ?? {
  appName: 'My Marketplace',
  slug: 'my-marketplace',
  bundleId: 'com.mymarketplace.app',
  primaryColor: '#6366F1',
  isSingleStore: false,
  storeId: null,
}

export const theme = {
  primary: brand.primaryColor,
  isSingleStore: brand.isSingleStore,
  storeId: brand.storeId,
  appName: brand.appName,
}

export default theme
