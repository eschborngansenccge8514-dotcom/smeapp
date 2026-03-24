import { View, Text, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { useCartStore } from '../../stores/cartStore'
import { formatPrice } from '../../utils/formatPrice'

export function CartItemRow({ item }: { item: any }) {
  const { updateQuantity, removeItem } = useCartStore()

  return (
    <View className="flex-row items-center bg-white rounded-2xl p-3 mb-2 shadow-sm">
      <Image
        source={item.image_url ?? 'https://via.placeholder.com/60'}
        style={{ width: 60, height: 60, borderRadius: 10 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
        <Text className="text-primary font-bold mt-1">{formatPrice(item.price)}</Text>
      </View>
      <View className="flex-row items-center">
        <TouchableOpacity
          className="w-8 h-8 border border-gray-200 rounded-full items-center justify-center"
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Text className="text-gray-600 font-bold">−</Text>
        </TouchableOpacity>
        <Text className="mx-3 font-semibold text-base">{item.quantity}</Text>
        <TouchableOpacity
          className="w-8 h-8 bg-primary rounded-full items-center justify-center"
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Text className="text-white font-bold">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
