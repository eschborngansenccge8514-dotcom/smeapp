import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import type { Order } from '@repo/lib/types'
import theme from '@/lib/theme'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',     color: '#F59E0B' },
  confirmed:  { label: 'Confirmed',   color: '#3B82F6' },
  preparing:  { label: 'Preparing',   color: '#8B5CF6' },
  ready:      { label: 'Ready',       color: '#06B6D4' },
  dispatched: { label: 'On the Way',  color: '#6366F1' },
  delivered:  { label: 'Delivered',   color: '#10B981' },
  cancelled:  { label: 'Cancelled',   color: '#EF4444' },
}

export function OrderCard({ order }: { order: Order & { stores?: { name: string } } }) {
  const router = useRouter()
  const status = STATUS_LABELS[order.status] ?? { label: order.status, color: '#6B7280' }

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl shadow-sm p-4 mb-3"
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-bold text-gray-900">{order.stores?.name ?? 'Order'}</Text>
        <View className="px-2 py-1 rounded-full" style={{ backgroundColor: `${status.color}20` }}>
          <Text className="text-xs font-semibold" style={{ color: status.color }}>{status.label}</Text>
        </View>
      </View>
      <Text className="text-gray-500 text-sm">
        RM {order.total_amount.toFixed(2)} · {new Date(order.created_at).toLocaleDateString('en-MY')}
      </Text>
    </TouchableOpacity>
  )
}
