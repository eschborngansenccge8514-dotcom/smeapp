import { View, Text, TouchableOpacity } from 'react-native'
import { theme } from '../../lib/theme'
import { Ionicons } from '@expo/vector-icons'

interface Props { value: number; min: number; max: number; onChange: (v: number) => void }

export function QuantitySelector({ value, min, max, onChange }: Props) {
  return (
    <View className="flex-row items-center gap-4">
      <Text className="text-sm font-semibold text-gray-700">Quantity:</Text>
      <View className="flex-row items-center border border-gray-200 rounded-xl overflow-hidden">
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-11 h-11 items-center justify-center"
        >
          <Ionicons name="remove" size={18} color={value <= min ? '#d1d5db' : '#374151'} />
        </TouchableOpacity>
        <Text className="w-10 text-center font-bold text-gray-900 text-base">{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-11 h-11 items-center justify-center"
        >
          <Ionicons name="add" size={18} color={value >= max ? '#d1d5db' : '#374151'} />
        </TouchableOpacity>
      </View>
      <Text className="text-xs text-gray-400">{max} available</Text>
    </View>
  )
}
