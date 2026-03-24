import { TouchableOpacity, View, Text } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { formatDistance } from '../../utils/distance'

interface StoreCardProps {
  id: string
  name: string
  category: string
  address: string
  logo_url: string | null
  distance_km: number
}

export function StoreCard({ id, name, category, address, logo_url, distance_km }: StoreCardProps) {
  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mb-3 shadow-sm overflow-hidden"
      onPress={() => router.push(`/store/${id}`)}
      activeOpacity={0.9}
    >
      <Image
        source={logo_url ?? 'https://via.placeholder.com/400x160?text=Store'}
        style={{ width: '100%', height: 140 }}
        contentFit="cover"
        transition={200}
      />
      <View className="p-3">
        <Text className="font-bold text-base text-gray-900">{name}</Text>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm text-muted capitalize">{category}</Text>
          <Text className="text-sm text-primary font-medium">
            📍 {formatDistance(distance_km)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
