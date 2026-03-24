import { useEffect, useState } from 'react'
import { View, Text, FlatList, Image, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { ProductCard } from '@/components/ProductCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Store, Product } from '@repo/lib/types'
import theme from '@/lib/theme'

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStore() {
      const [{ data: storeData }, { data: productData }] = await Promise.all([
        supabase.from('stores').select('*').eq('id', id).single(),
        supabase.from('products').select('*').eq('store_id', id).eq('is_available', true).order('name'),
      ])
      setStore(storeData)
      setProducts(productData ?? [])
      setLoading(false)
    }
    if (id) fetchStore()
  }, [id])

  if (loading) return <LoadingSpinner />
  if (!store) return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-gray-500">Store not found</Text>
    </View>
  )

  return (
    <>
      <Stack.Screen options={{ title: store.name, headerBackTitle: 'Back' }} />
      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard product={item} storeId={store.id} storeName={store.name} />
          )}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            <View className="mb-4">
              {store.logo_url && (
                <Image source={{ uri: store.logo_url }} className="w-full h-40 rounded-2xl mb-4" resizeMode="cover" />
              )}
              <Text className="text-2xl font-bold text-gray-900">{store.name}</Text>
              {store.description && (
                <Text className="text-gray-500 mt-2">{store.description}</Text>
              )}
              {store.address && (
                <Text className="text-gray-400 text-sm mt-1">📍 {store.address}</Text>
              )}
              <Text className="text-lg font-bold text-gray-900 mt-6 mb-2">Menu</Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">🍽️</Text>
              <Text className="text-gray-500">No products available</Text>
            </View>
          }
        />
      </SafeAreaView>
    </>
  )
}
