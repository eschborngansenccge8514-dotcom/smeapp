import { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNearbyStores } from '@/hooks/useNearbyStores'
import { useLocationStore } from '@/stores/useLocationStore'
import { StoreCard } from '@/components/StoreCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import theme from '@/lib/theme'

export default function HomeScreen() {
  const router = useRouter()
  const { lat, lng, address, loading: locLoading, requestLocation } = useLocationStore()
  const { stores, loading: storesLoading, refetch } = useNearbyStores(lat, lng)

  // Single-store mode: skip marketplace, go straight to that store
  useEffect(() => {
    if (theme.isSingleStore && theme.storeId) {
      router.replace(`/store/${theme.storeId}`)
    }
  }, [])

  useEffect(() => {
    if (!lat || !lng) requestLocation()
  }, [])

  if (theme.isSingleStore) return null

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Location Bar */}
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100"
        onPress={requestLocation}
      >
        <Ionicons name="location" size={16} color={theme.primary} />
        <Text className="ml-2 flex-1 text-gray-700 text-sm" numberOfLines={1}>
          {locLoading ? 'Getting location…' : address ?? 'Tap to set location'}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
      </TouchableOpacity>

      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StoreCard store={item} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="text-xl font-bold text-gray-900 mb-4">Nearby Stores</Text>
        }
        ListEmptyComponent={
          !storesLoading ? (
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">🏪</Text>
              <Text className="text-gray-500 text-center">
                {!lat ? 'Enable location to find nearby stores' : 'No stores found nearby'}
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={storesLoading}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      />

      {storesLoading && stores.length === 0 && <LoadingSpinner />}
    </SafeAreaView>
  )
}
