import { View, Text, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import type { NearbyStore } from '@/hooks/useNearbyStores'

export function StoreCard({ store }: { store: NearbyStore }) {
  const router = useRouter()
  return (
    <TouchableOpacity
      className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden flex-row"
      onPress={() => router.push(`/store/${store.id}`)}
      activeOpacity={0.8}
    >
      {store.logo_url ? (
        <Image source={{ uri: store.logo_url }} className="w-20 h-20" resizeMode="cover" />
      ) : (
        <View className="w-20 h-20 bg-gray-100 items-center justify-center">
          <Text className="text-2xl">🏪</Text>
        </View>
      )}
      <View className="flex-1 p-3 justify-center">
        <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>{store.name}</Text>
        {store.category && (
          <Text className="text-gray-500 text-sm mt-0.5">{store.category}</Text>
        )}
        <View className="flex-row items-center mt-1 gap-3">
          <Text className="text-gray-400 text-xs">📍 {store.distance_km.toFixed(1)} km</Text>
          {store.address && (
            <Text className="text-gray-400 text-xs flex-1" numberOfLines={1}>{store.address}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}
