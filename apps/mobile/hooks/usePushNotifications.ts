import { useEffect, useRef, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export function usePushNotifications(userId: string | null) {
  const router = useRouter()
  const notificationListener = useRef<Notifications.Subscription>()
  const responseListener = useRef<Notifications.Subscription>()

  const registerToken = useCallback(async () => {
    if (!userId) return
    if (!Device.isDevice) return // Push doesn't work on simulators

    // Create Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied')
      return
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })).data

      // Save token to Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId)

      if (error) console.error('Failed to save push token:', error.message)
      else console.log('Push token registered:', token.slice(0, 20) + '…')
    } catch (err) {
      console.error('Push token registration failed:', err)
    }
  }, [userId])

  useEffect(() => {
    registerToken()

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification.request.content.title)
      }
    )

    // Tap notification response — deep link to order
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>
        if (data?.orderId) {
          router.push(`/order/${data.orderId}`)
        } else if (data?.type === 'new_order') {
          router.push('/merchant/orders')
        }
      }
    )

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [userId, registerToken])
}
