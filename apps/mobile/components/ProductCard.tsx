import { View, Text, Image, TouchableOpacity, Alert } from 'react-native'
import { useCartStore } from '@/stores/useCartStore'
import type { Product } from '@repo/lib/types'
import theme from '@/lib/theme'

interface ProductCardProps {
  product: Product
  storeId: string
  storeName: string
}

export function ProductCard({ product, storeId, storeName }: ProductCardProps) {
  const { addItem, clearCart } = useCartStore()

  function handleAdd() {
    const result = addItem(
      { productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.image_url },
      storeId,
      storeName
    )

    if (result === 'cross_store') {
      Alert.alert(
        'Different Store',
        'Your cart has items from another store. Clear cart and add this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Add',
            style: 'destructive',
            onPress: () => {
              clearCart()
              addItem(
                { productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.image_url },
                storeId,
                storeName
              )
            },
          },
        ]
      )
    }
  }

  return (
    <View className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
      {product.image_url && (
        <Image source={{ uri: product.image_url }} className="w-full h-40" resizeMode="cover" />
      )}
      <View className="p-3 flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-semibold text-gray-900" numberOfLines={2}>{product.name}</Text>
          {product.description && (
            <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>{product.description}</Text>
          )}
          <Text className="font-bold text-base mt-2" style={{ color: theme.primary }}>
            RM {product.price.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.primary }}
          onPress={handleAdd}
          disabled={!product.is_available || product.stock_qty <= 0}
        >
          <Text className="text-white text-xl font-bold">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
