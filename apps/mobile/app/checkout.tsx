import { useState } from 'react'
import {
  View, Text, ScrollView, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import RazorpayCheckout from 'react-native-razorpay'
import { useAuth } from '@repo/lib/mobile'
import { useCreatePaymentOrder } from '@repo/lib/mobile'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../stores/cartStore'
import { useLocationStore } from '../stores/locationStore'
import { useStore } from '../hooks/useStores'
import { getDistanceKm } from '../utils/distance'
import { formatPrice } from '../utils/formatPrice'
import { theme } from '../lib/theme'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

type CheckoutStep = 'address' | 'delivery' | 'payment'

export default function CheckoutScreen() {
  const { user, profile } = useAuth()
  const { items, storeId, getTotal, clearCart } = useCartStore()
  const { lat, lng } = useLocationStore()
  const { store } = useStore(storeId ?? '')
  const { createPaymentOrder, verifyPayment, loading: paymentLoading } = useCreatePaymentOrder()

  const [step, setStep] = useState<CheckoutStep>('address')
  const [address, setAddress] = useState('')
  const [postcode, setPostcode] = useState('')
  const [unitState, setUnitState] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const subtotal = getTotal()
  const serviceFee = parseFloat((subtotal * 0.02).toFixed(2))
  const totalBeforeDelivery = subtotal + serviceFee

  function getDeliveryType() {
    if (!store || !lat || !lng) return 'lalamove'
    const km = getDistanceKm(store.lat, store.lng, lat, lng)
    return km <= 30 ? 'lalamove' : 'easyparcel'
  }

  function validateAddress(): boolean {
    const e: Record<string, string> = {}
    if (address.trim().length < 5) e.address = 'Enter a full delivery address'
    if (!/^\d{5}$/.test(postcode.trim())) e.postcode = 'Enter a valid 5-digit postcode'
    if (unitState.trim().length < 2) e.state = 'Enter your state'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Step 1: Save order to Supabase, get back orderId
  async function handleCreateOrder(): Promise<string | null> {
    if (!user || !storeId) return null
    setIsSubmitting(true)
    try {
      const deliveryType = getDeliveryType()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          store_id: storeId,
          status: 'pending',
          total_amount: totalBeforeDelivery,
          delivery_address: address,
          delivery_postcode: postcode,
          delivery_state: unitState,
          delivery_lat: lat ?? 0,
          delivery_lng: lng ?? 0,
          delivery_type: deliveryType,
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(
          items.map((item) => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
          }))
        )

      if (itemsError) throw itemsError

      // Create pending payment record
      const { error: payErr } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          razorpay_order_id: `pending_${order.id}`,  // placeholder, replaced by Edge Fn
          status: 'pending',
          amount: totalBeforeDelivery,
        })

      if (payErr) throw payErr

      return order.id
    } catch (err: any) {
      Alert.alert('Order Error', err.message)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2: Open Razorpay Checkout Sheet
  async function handleProceedToPayment() {
    if (!validateAddress()) return

    // Create the order in Supabase first
    const orderId = await handleCreateOrder()
    if (!orderId) return
    setCreatedOrderId(orderId)

    // Get Curlec payment order from Edge Function
    const paymentData = await createPaymentOrder(orderId)
    if (!paymentData) {
      Alert.alert('Payment Error', 'Could not initiate payment. Please try again.')
      return
    }

    const options = {
      key: paymentData.key_id,
      order_id: paymentData.razorpay_order_id,
      amount: paymentData.amount.toString(),
      currency: 'MYR',
      name: store?.name ?? 'MyMarketplace',
      description: `Order from ${store?.name ?? 'store'}`,
      image: store?.logo_url ?? '',
      prefill: {
        name: profile?.full_name ?? '',
        email: user?.email ?? '',
        contact: profile?.phone ?? '',
      },
      notes: {
        order_id: orderId,
      },
      theme: {
        color: theme.primary,
      },
      // FPX requires redirect mode — handled natively by the SDK
    }

    try {
      const result = await RazorpayCheckout.open(options)
      // result = { razorpay_payment_id, razorpay_order_id, razorpay_signature }

      // Verify signature on our server before redirecting
      const verified = await verifyPayment({
        ...result,
        order_id: orderId,
      })

      if (verified) {
        clearCart()
        router.replace(`/order/${orderId}`)
      } else {
        Alert.alert(
          'Verification Failed',
          'Payment was received but verification failed. Please contact support with your order ID: ' + orderId
        )
      }
    } catch (error: any) {
      // error.code = 0 means user dismissed checkout
      // error.code = 2 means payment failed
      if (error.code === 2) {
        Alert.alert(
          'Payment Failed',
          error.description ?? 'Your payment was not completed.',
          [
            { text: 'Try Again', onPress: () => handleRetryPayment(orderId, paymentData) },
            {
              text: 'Cancel Order',
              style: 'destructive',
              onPress: () => handleCancelOrder(orderId),
            },
          ]
        )
      }
      // code 0 = user closed — do nothing, order stays 'pending'
    }
  }

  async function handleRetryPayment(orderId: string, paymentData: any) {
    const options = {
      key: paymentData.key_id,
      order_id: paymentData.razorpay_order_id,
      amount: paymentData.amount.toString(),
      currency: 'MYR',
      name: store?.name ?? 'MyMarketplace',
      description: `Retry payment for order`,
      prefill: {
        name: profile?.full_name ?? '',
        email: user?.email ?? '',
        contact: profile?.phone ?? '',
      },
      theme: { color: theme.primary },
    }

    try {
      const result = await RazorpayCheckout.open(options)
      const verified = await verifyPayment({ ...result, order_id: orderId })
      if (verified) {
        clearCart()
        router.replace(`/order/${orderId}`)
      }
    } catch (_) {
      // user dismissed again — do nothing
    }
  }

  async function handleCancelOrder(orderId: string) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', orderId)
    router.replace('/(tabs)/cart')
  }

  const deliveryType = getDeliveryType()

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <Stack.Screen options={{ title: 'Checkout' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <Text className="text-2xl font-bold text-gray-900 mt-2 mb-6">Checkout</Text>

          {/* ── Delivery Address ── */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="font-bold text-base mb-3">📍 Delivery Address</Text>

            <Input
              label="Full Address"
              value={address}
              onChangeText={setAddress}
              placeholder="No. 12, Jalan Harmoni 3/1, Taman Harmoni"
              error={errors.address}
              multiline
              numberOfLines={2}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Postcode"
                  value={postcode}
                  onChangeText={(t) => setPostcode(t.replace(/\D/g, '').slice(0, 5))}
                  keyboardType="number-pad"
                  maxLength={5}
                  error={errors.postcode}
                  placeholder="47810"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="State"
                  value={unitState}
                  onChangeText={setUnitState}
                  placeholder="Selangor"
                  error={errors.state}
                />
              </View>
            </View>
            <Input
              label="Order Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Leave at door, no spicy..."
              multiline
              numberOfLines={2}
            />
          </View>

          {/* ── Delivery Method ── */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="font-bold text-base mb-3">🚚 Delivery Method</Text>
            <View className={`flex-row items-center p-3 rounded-xl border
              ${deliveryType === 'lalamove'
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-amber-50 border-amber-200'}`}
            >
              <Text className="text-2xl mr-3">
                {deliveryType === 'lalamove' ? '🛵' : '📦'}
              </Text>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">
                  {deliveryType === 'lalamove' ? 'Lalamove (Same Day)' : 'EasyParcel Courier'}
                </Text>
                <Text className="text-xs text-muted mt-0.5">
                  {deliveryType === 'lalamove'
                    ? 'On-demand delivery · typically 1–2 hours'
                    : 'Next-day or 2–3 day courier delivery'}
                </Text>
              </View>
              <Text className="text-xs text-secondary font-semibold ml-2">
                Quoted after order
              </Text>
            </View>
          </View>

          {/* ── Order Items ── */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="font-bold text-base mb-3">🛍️ Your Items</Text>
            {items.map((item) => (
              <View key={item.id} className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-700 flex-1" numberOfLines={1}>{item.name}</Text>
                <Text className="text-muted mx-2">× {item.quantity}</Text>
                <Text className="font-medium">{formatPrice(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          {/* ── Payment Summary ── */}
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
            <Text className="font-bold text-base mb-3">💳 Payment Summary</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Subtotal ({items.length} items)</Text>
              <Text className="text-gray-800">{formatPrice(subtotal)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Service Fee (2%)</Text>
              <Text className="text-gray-800">{formatPrice(serviceFee)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Delivery Fee</Text>
              <Text className="text-amber-500 font-medium">Quoted after placement</Text>
            </View>
            <View className="border-t border-gray-100 mt-2 pt-3 flex-row justify-between">
              <Text className="font-bold text-base">Total (excl. delivery)</Text>
              <Text className="font-bold text-primary text-lg">
                {formatPrice(totalBeforeDelivery)}
              </Text>
            </View>
          </View>

          {/* ── Accepted Payment Methods ── */}
          <View className="bg-blue-50 rounded-xl p-3 mb-6 flex-row flex-wrap gap-2">
            {['FPX', 'Visa', 'Mastercard', 'Touch\'n Go', 'Boost', 'GrabPay'].map((method) => (
              <View key={method} className="bg-white px-3 py-1 rounded-full border border-blue-100">
                <Text className="text-xs text-blue-700 font-medium">{method}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* ── Pay Button ── */}
        <View className="px-5 pb-6 pt-3 bg-white border-t border-gray-100">
          <Button
            label={`Pay ${formatPrice(totalBeforeDelivery)} Securely`}
            onPress={handleProceedToPayment}
            loading={isSubmitting || paymentLoading}
            disabled={items.length === 0}
          />
          <View className="flex-row items-center justify-center mt-2 gap-1">
            <Text className="text-xs text-muted">🔒 Secured by</Text>
            <Text className="text-xs font-semibold text-muted">Razorpay Curlec</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
