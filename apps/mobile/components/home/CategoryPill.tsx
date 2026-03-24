import { TouchableOpacity, Text } from 'react-native'

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  pharmacy: '💊',
  hardware: '🔧',
  convenience: '🏪',
  grocery: '🛒',
  all: '🗂️',
}

interface CategoryPillProps {
  label: string
  selected: boolean
  onPress: () => void
}

export function CategoryPill({ label, selected, onPress }: CategoryPillProps) {
  const icon = CATEGORY_ICONS[label.toLowerCase()] ?? '🏬'
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-2 rounded-full mr-2 border
        ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className="mr-1">{icon}</Text>
      <Text className={`text-sm font-medium capitalize
        ${selected ? 'text-white' : 'text-gray-700'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}
