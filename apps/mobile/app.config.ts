import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => {
  const brandSubpath = process.env.BRAND ?? 'default'
  // Note: We use the copied 'current-brand' directory created by switch-brand.sh at build time
  // But for local typing/config we try to read from the brands folder
  
  let brand: any
  try {
    brand = require(`./brands/${brandSubpath}/brand.config`)
  } catch (e) {
    brand = require('./brands/default/brand.config')
  }

  return {
    ...config,
    name: brand.appName,
    slug: brand.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: brand.icon || './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: brand.splash || './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: brand.bundleId,
    },
    android: {
      package: brand.bundleId,
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      brand,
      eas: {
        projectId: "your-project-id" // replace with real ID if using EAS
      }
    },
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: `Allow ${brand.appName} to use your location to find nearby stores.`,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: brand.primaryColor,
        },
      ],
      'expo-secure-store',
      'expo-font',
    ],
    experiments: {
      typedRoutes: true,
    },
  }
}
