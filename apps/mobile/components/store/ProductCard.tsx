import { TouchableOpacity, View, Text } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useCartStore } from '../../stores/cartStore'
import { formatPrice } from '../../utils/formatPrice'

export function ProductCard({ product, store }: { product: any; store: any }) {
  const { addItem, getItemById } = useCartStore()
  const cartItem = getItemById(product.id)

  return (
    <TouchableOpacity
      className="flex-row bg-white rounded-2xl p-3 mb-3 shadow-sm"
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.9}
    >
      <Image
        source={product.image_url ?? 'https://via.placeholder.com/90'}
        style={{ width: 90, height: 90, borderRadius: 12 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-3 justify-between">
        <View>
          <Text className="font-semibold text-gray-900" numberOfLines={2}>
            {product.name}
          </Text>
          {product.description && (
            <Text className="text-xs text-muted mt-1" numberOfLines={2}>
              {product.description}
            </Text>
          )}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-primary font-bold text-base">
            {formatPrice(product.price)}
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-full w-8 h-8 items-center justify-center"
            onPress={() => addItem({
              id: product.id,
              store_id: store.id,
              store_name: store.name,
              name: product.name,
              price: product.price,
              image_url: product.image_url,
              quantity: 1,
            })}
          >
            <Text className="text-white font-bold text-lg">
              {cartItem ? cartItem.quantity : '+'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}
