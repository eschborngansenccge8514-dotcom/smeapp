import { View, Text, FlatList, TouchableOpacity, Image, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useCartStore } from '@/stores/useCartStore'
import { Button } from '@/components/ui/Button'
import theme from '@/lib/theme'

export default function CartScreen() {
  const router = useRouter()
  const { items, storeName, removeItem, updateQuantity, clearCart, getTotal } = useCartStore()

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={['top']}>
        <Text className="text-6xl mb-4">🛒</Text>
        <Text className="text-xl font-bold text-gray-900">Your cart is empty</Text>
        <Text className="text-gray-500 mt-2">Add items to get started</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
      {storeName && (
        <View className="px-4 py-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
          <Text className="text-gray-700 font-medium">From: {storeName}</Text>
          <TouchableOpacity onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: clearCart },
          ])}>
            <Text className="text-red-500 text-sm">Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl shadow-sm mb-3 p-4 flex-row items-center">
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} className="w-16 h-16 rounded-xl" resizeMode="cover" />
            ) : (
              <View className="w-16 h-16 rounded-xl bg-gray-100 items-center justify-center">
                <Text className="text-2xl">🛍️</Text>
              </View>
            )}
            <View className="flex-1 ml-3">
              <Text className="font-semibold text-gray-900" numberOfLines={2}>{item.name}</Text>
              <Text className="font-bold mt-1" style={{ color: theme.primary }}>
                RM {item.price.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row items-center gap-3 ml-3">
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                onPress={() => updateQuantity(item.productId, item.quantity - 1)}
              >
                <Text className="text-gray-700 font-bold">−</Text>
              </TouchableOpacity>
              <Text className="font-bold text-gray-900 w-6 text-center">{item.quantity}</Text>
              <TouchableOpacity
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.primary }}
                onPress={() => updateQuantity(item.productId, item.quantity + 1)}
              >
                <Text className="text-white font-bold">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View className="bg-white border-t border-gray-100 px-4 py-4">
        <View className="flex-row justify-between mb-4">
          <Text className="text-gray-700 text-base">Subtotal</Text>
          <Text className="font-bold text-lg text-gray-900">RM {getTotal().toFixed(2)}</Text>
        </View>
        <Button title="Proceed to Checkout" onPress={() => router.push('/checkout')} />
      </View>
    </SafeAreaView>
  )
}
