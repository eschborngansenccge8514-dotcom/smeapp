import { useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSearchProducts } from '@/hooks/useSearchProducts'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import theme from '@/lib/theme'

export default function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { results, loading } = useSearchProducts(query)

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
          <Text className="mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-gray-900"
            placeholder="Search products…"
            value={query}
            onChangeText={setQuery}
            autoFocus={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && query.length > 0 && <LoadingSpinner />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-2xl shadow-sm mb-3 flex-row overflow-hidden"
            onPress={() => router.push(`/store/${item.store_id}`)}
            activeOpacity={0.8}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} className="w-20 h-20" resizeMode="cover" />
            ) : (
              <View className="w-20 h-20 bg-gray-100 items-center justify-center">
                <Text className="text-2xl">🛍️</Text>
              </View>
            )}
            <View className="flex-1 p-3 justify-center">
              <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
              <Text className="text-gray-400 text-xs mt-0.5">{item.store_name}</Text>
              <Text className="font-bold mt-1" style={{ color: theme.primary }}>
                RM {item.price.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && query.length > 0 ? (
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">😔</Text>
              <Text className="text-gray-500">No products found for "{query}"</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
