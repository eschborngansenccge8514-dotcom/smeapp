import { useEffect, useState } from 'react'
import { FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { OrderCard } from '@/components/OrderCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Order } from '@repo/lib/types'
import theme from '@/lib/theme'

type OrderWithStore = Order & { stores: { name: string } }

export default function OrdersScreen() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderWithStore[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchOrders() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, stores(name)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setOrders((data as OrderWithStore[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [user])

  if (loading) return <LoadingSpinner />

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text className="text-xl font-bold text-gray-900 mb-4">My Orders</Text>}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-gray-500">No orders yet</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchOrders} tintColor={theme.primary} />
        }
      />
    </SafeAreaView>
  )
}
