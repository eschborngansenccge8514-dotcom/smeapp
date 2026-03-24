import { useState } from 'react'
import { View, ScrollView, Dimensions, Text } from 'react-native'
import { Image } from 'expo-image'

const { width } = Dimensions.get('window')

export function ProductImageCarousel({ images }: { images: string[] }) {
  const [active, setActive] = useState(0)
  const all = images.length > 0 ? images : []

  return (
    <View className="relative bg-gray-50">
      <ScrollView
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActive(Math.round(e.nativeEvent.contentOffset.x / width))
        }}
      >
        {all.length > 0 ? all.map((img, i) => (
          <Image
            key={i}
            source={{ uri: img }}
            style={{ width, height: 300 }}
            contentFit="contain"
          />
        )) : (
          <View style={{ width, height: 300 }} className="items-center justify-center bg-gray-100">
            <Text className="text-6xl">📦</Text>
          </View>
        )}
      </ScrollView>

      {/* Dots */}
      {all.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
          {all.map((_, i) => (
            <View key={i}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'bg-indigo-600 w-4' : 'bg-gray-300 w-1.5'}`}
            />
          ))}
        </View>
      )}

      {/* Counter badge */}
      {all.length > 1 && (
        <View className="absolute top-3 right-3 bg-black/40 rounded-full px-2 py-0.5 backdrop-blur">
          <Text className="text-white text-xs">{active + 1}/{all.length}</Text>
        </View>
      )}
    </View>
  )
}
