import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import { useCartStore } from '../stores/cartStore'
import { formatPrice } from '../utils/formatPrice'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../lib/theme'

export default function CartScreen() {
  const { items, storeName, removeItem, updateQuantity, getTotal, clearCart } = useCartStore()
  const subtotal = getTotal()
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center p-6">
        <Stack.Screen options={{ title: 'Cart' }} />
        <Text className="text-6xl mb-4">🛒</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2">Cart is empty</Text>
        <Text className="text-gray-500 text-center mb-6">Add items from a store to get started</Text>
        <TouchableOpacity onPress={() => router.back()}
          style={{ backgroundColor: theme.primary }}
          className="px-8 py-3 rounded-2xl">
          <Text className="text-white font-bold">Browse Stores</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Stack.Screen
        options={{
          title: `Cart (${itemCount})`,
          headerRight: () => (
            <TouchableOpacity onPress={clearCart} className="mr-2">
              <Text className="text-red-500 text-sm">Clear</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {storeName && (
          <View className="flex-row items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2 mb-4">
            <Ionicons name="storefront-outline" size={16} color={theme.primary} />
            <Text className="text-sm text-indigo-700">Ordering from <Text className="font-bold">{storeName}</Text></Text>
          </View>
        )}

        {items.map((item) => (
          <View key={`${item.id}_${item.variant_id ?? 'base'}`}
            className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 flex-row gap-3">
            <View className="w-18 h-18 rounded-xl bg-gray-100 overflow-hidden">
              {item.image_urls?.[0]
                ? <Image source={{ uri: item.image_urls[0] }} className="w-full h-full" resizeMode="cover" />
                : <View className="w-full h-full items-center justify-center"><Text className="text-3xl">📦</Text></View>
              }
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900 leading-snug" numberOfLines={2}>{item.name}</Text>
              <Text style={{ color: theme.primary }} className="font-bold mt-0.5">{formatPrice(item.price)}</Text>
              <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center border border-gray-200 rounded-xl overflow-hidden">
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.id, item.variant_id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-9 h-9 items-center justify-center">
                    <Ionicons name="remove" size={16} color={item.quantity <= 1 ? '#d1d5db' : '#374151'} />
                  </TouchableOpacity>
                  <Text className="w-8 text-center font-bold text-gray-900">{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.id, item.variant_id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock_qty}
                    className="w-9 h-9 items-center justify-center">
                    <Ionicons name="add" size={16} color={item.quantity >= item.stock_qty ? '#d1d5db' : '#374151'} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id, item.variant_id)}
                  className="p-2 bg-red-50 rounded-lg">
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View className="h-32" />
      </ScrollView>

      {/* Sticky footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-3 pb-8">
        <View className="flex-row justify-between mb-3">
          <Text className="text-gray-500">Subtotal</Text>
          <Text className="font-bold text-gray-900">{formatPrice(subtotal)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/checkout')}
          style={{ backgroundColor: theme.primary }}
          className="rounded-2xl py-4 items-center flex-row justify-center gap-2">
          <Text className="text-white font-bold text-base">Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
