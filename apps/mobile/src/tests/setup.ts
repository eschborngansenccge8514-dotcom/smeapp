// Mock Expo modules
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn().mockReturnValue({}),
  router:               { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack:                { Screen: ({ children }: any) => children ?? null },
  Link:                 ({ children, href }: any) => children,
}))

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync:  jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync:    jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationHandler:   jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}))

jest.mock('expo-image', () => ({
  Image: ({ source, ...props }: any) => null,
}))

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => null,
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// Mock Supabase from lib
jest.mock('@repo/lib', () => ({ 
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  }
}))
