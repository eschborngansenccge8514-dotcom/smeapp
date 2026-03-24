import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={s <= Math.round(rating) ? '#f59e0b' : '#e5e7eb'}
        />
      ))}
    </View>
  )
}
