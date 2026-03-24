import { ScrollView, TouchableOpacity, Text, View } from 'react-native'
import { theme } from '../../lib/theme'
import { formatPrice } from '../../utils/formatPrice'

interface VariantPillsProps {
  variants: any[]
  selected: any
  onSelect: (v: any) => void
  basePrice: number
}

export function VariantPills({ variants, selected, onSelect, basePrice }: VariantPillsProps) {
  return (
    <View>
      <Text className="text-sm font-semibold text-gray-800 mb-2">
        Select: <Text style={{ color: theme.primary }}>{selected?.name}</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {variants.map((v) => {
            const isSelected = selected?.id === v.id
            const isUnavailable = v.stock_qty === 0
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => !isUnavailable && onSelect(v)}
                disabled={isUnavailable}
                style={isSelected ? { borderColor: theme.primary, backgroundColor: theme.primary + '15' } : {}}
                className={`px-4 py-2 rounded-xl border-2 items-center
                  ${isSelected ? 'border-primary' : isUnavailable ? 'border-gray-200 opacity-40' : 'border-gray-200'}`}
              >
                <Text
                  style={isSelected ? { color: theme.primary } : {}}
                  className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'} ${isUnavailable ? 'line-through' : ''}`}
                >
                  {v.name}
                </Text>
                {v.price && v.price !== basePrice && (
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {v.price > basePrice ? '+' : ''}{formatPrice(v.price - basePrice)}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
