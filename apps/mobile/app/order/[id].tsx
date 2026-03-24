import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useOrder } from '@/hooks/useOrder'
import theme from '@/lib/theme'

const STEPS = ['pending','confirmed','preparing','ready','dispatched','delivered'] as const
const STEP_INFO: Record<string, { icon: string; label: string; desc: string }> = {
  pending:    { icon: '⏳', label: 'Order Placed',   desc: 'Waiting for store to confirm' },
  confirmed:  { icon: '✅', label: 'Confirmed',      desc: 'Your order has been accepted' },
  preparing:  { icon: '👨‍🍳', label: 'Preparing',     desc: 'Your order is being made' },
  ready:      { icon: '📦', label: 'Ready',          desc: 'Waiting for driver pickup' },
  dispatched: { icon: '🛵', label: 'On the Way',     desc: 'Driver is heading to you' },
  delivered:  { icon: '🎉', label: 'Delivered',      desc: 'Enjoy your order!' },
}
const STATUS_COLOUR: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', preparing: '#8B5CF6',
  ready: '#06B6D4', dispatched: theme.primary, delivered: '#10B981', cancelled: '#EF4444',
}

export default function OrderStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { order, loading } = useOrder(id ?? null)

  if (loading) return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={theme.primary} />
    </SafeAreaView>
  )

  if (!order) return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white">
      <Text className="text-gray-400">Order not found</Text>
    </SafeAreaView>
  )

  const currentStepIdx = STEPS.indexOf(order.status as typeof STEPS[number])
  const statusInfo = STEP_INFO[order.status] ?? { icon: '📋', label: order.status, desc: '' }
  const statusColor = STATUS_COLOUR[order.status] ?? '#6B7280'
  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 h-14 flex-row items-center border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-gray-500 text-base">←</Text>
        </Pressable>
        <Text className="font-bold text-gray-900 text-base">Order Status</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Live Status Hero */}
        <View className="rounded-2xl p-6 items-center" style={{ backgroundColor: `${statusColor}15` }}>
          <Text className="text-5xl mb-3">{statusInfo.icon}</Text>
          <Text className="text-2xl font-bold mb-1" style={{ color: statusColor }}>
            {statusInfo.label}
          </Text>
          <Text className="text-gray-500 text-center">{statusInfo.desc}</Text>
          <View className="mt-3 px-3 py-1 rounded-full" style={{ backgroundColor: `${statusColor}25` }}>
            <Text className="text-xs font-semibold" style={{ color: statusColor }}>LIVE</Text>
          </View>
        </View>

        {/* Progress Timeline */}
        {!isCancelled && (
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="font-bold text-gray-900 mb-4">Order Progress</Text>
            {STEPS.map((step, idx) => {
              const done   = idx <= currentStepIdx
              const active = idx === currentStepIdx
              const last   = idx === STEPS.length - 1

              return (
                <View key={step} className="flex-row gap-3">
                  {/* Timeline dot + line */}
                  <View className="items-center" style={{ width: 24 }}>
                    <View className={`w-6 h-6 rounded-full items-center justify-center ${
                      done ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} style={done ? { backgroundColor: theme.primary } : {}}>
                      <Text className={`text-xs font-bold ${done ? 'text-white' : 'text-gray-400'}`}>
                        {done ? '✓' : String(idx + 1)}
                      </Text>
                    </View>
                    {!last && (
                      <View className={`w-0.5 flex-1 my-1 ${done ? 'bg-indigo-400' : 'bg-gray-200'}`}
                        style={{ backgroundColor: done ? theme.primary + '60' : '#E5E7EB', minHeight: 20 }} />
                    )}
                  </View>

                  {/* Label */}
                  <View className="flex-1 pb-4">
                    <Text className={`text-sm font-semibold ${
                      active ? 'text-indigo-600' : done ? 'text-gray-800' : 'text-gray-400'
                    }`} style={active ? { color: theme.primary } : {}}>
                      {STEP_INFO[step]?.label}
                    </Text>
                    {active && (
                      <Text className="text-xs text-gray-500 mt-0.5">{STEP_INFO[step]?.desc}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Tracking Number — EasyParcel */}
        {order.tracking_number && (
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="font-bold text-gray-900 mb-2">📦 Tracking</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center justify-between">
              <View>
                {order.courier_name && (
                  <Text className="text-xs text-gray-500 mb-0.5">{order.courier_name}</Text>
                )}
                <Text className="font-mono font-bold text-gray-900">{order.tracking_number}</Text>
              </View>
              <Pressable
                onPress={() => {
                  const url = `https://www.tracking.my/track?id=${order.tracking_number}`
                  Linking.openURL(url)
                }}
                className="bg-indigo-600 px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: theme.primary }}
              >
                <Text className="text-white text-xs font-semibold">Track</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Store Info */}
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="font-bold text-gray-900 mb-1">🏪 Store</Text>
          <Text className="text-gray-700">{(order.stores as any)?.name}</Text>
          {(order.stores as any)?.address && (
            <Text className="text-gray-400 text-sm mt-0.5">{(order.stores as any).address}</Text>
          )}
        </View>

        {/* Order Items */}
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">🧾 Order Summary</Text>
          {(order.order_items as any[])?.map((item: any) => (
            <View key={item.id} className="flex-row justify-between py-2 border-b border-gray-50">
              <Text className="text-gray-700 flex-1 mr-4">
                {item.quantity}× {item.products?.name}
              </Text>
              <Text className="font-medium text-gray-900">
                RM {(item.unit_price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500 text-sm">Subtotal</Text>
            <Text className="text-gray-700">
              RM {(order.total_amount - (order.delivery_fee ?? 0)).toFixed(2)}
            </Text>
          </View>
          {order.delivery_fee != null && (
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-500 text-sm">Delivery fee</Text>
              <Text className="text-gray-700">RM {Number(order.delivery_fee).toFixed(2)}</Text>
            </View>
          )}
          <View className="flex-row justify-between pt-3">
            <Text className="font-bold text-gray-900">Total</Text>
            <Text className="font-bold text-lg" style={{ color: theme.primary }}>
              RM {order.total_amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Rate Order after delivery */}
        {isDelivered && (
          <Pressable
            className="rounded-2xl p-5 items-center"
            style={{ backgroundColor: theme.primary }}
            onPress={() => router.push(`/rate/${order.id}`)}
          >
            <Text className="text-white font-bold text-base">⭐ Rate Your Order</Text>
            <Text className="text-white/80 text-sm mt-1">Help other customers discover great stores</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
