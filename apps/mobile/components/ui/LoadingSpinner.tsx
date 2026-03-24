import { View, ActivityIndicator } from 'react-native'
import theme from '@/lib/theme'

export function LoadingSpinner() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  )
}
