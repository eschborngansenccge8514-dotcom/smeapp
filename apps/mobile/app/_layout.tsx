import '../global.css'
import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

import { usePushNotifications } from '@/hooks/usePushNotifications'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { session, loading, user } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  // Register push tokens and handle reception/taps
  usePushNotifications(user?.id ?? null)

  // Hide splash as soon as auth state is known
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync()
  }, [loading])

  // Safety fallback — force hide splash after 3s
  useEffect(() => {
    const timer = setTimeout(() => SplashScreen.hideAsync(), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) router.replace('/(auth)/login')
    else if (session && inAuthGroup) router.replace('/(tabs)')
  }, [session, loading, segments])


  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  )
}
