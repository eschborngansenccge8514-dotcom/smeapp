import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Dimensions, Share, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useCartStore } from '../../stores/cartStore'
import { theme } from '../../lib/theme'
import { formatPrice } from '../../utils/formatPrice'
import { ProductImageCarousel } from '../../components/products/ProductImageCarousel'
import { VariantPills } from '../../components/products/VariantPills'
import { StarRating } from '../../components/ui/StarRating'
import { QuantitySelector } from '../../components/ui/QuantitySelector'
import { Ionicons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { addItem, storeId: cartStoreId, clearCart } = useCartStore()
  const [product, setProduct] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)

  useEffect(() => {
    fetchProduct()
    supabase.rpc('increment_product_views', { p_product_id: id }).then(() => {})
  }, [id])

  async function fetchProduct() {
    setLoading(true)
    const { data: p } = await supabase
        .from('products')
        .select('*, stores(id, name, logo_url, rating, reviews_count), categories(name, icon), product_variants(*)')
        .eq('id', id)
        .single()
    
    if (!p) {
        setLoading(false)
        return
    }

    const [{ data: r }, { data: rel }] = await Promise.all([
      supabase
        .from('product_reviews')
        .select('*, profiles(full_name)')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('products')
        .select('id, name, price, image_urls, avg_rating')
        .eq('store_id', p.store_id)
        .eq('is_available', true)
        .neq('id', id)
        .limit(6),
    ])
    setProduct(p)
    setReviews(r ?? [])
    setRelated(rel ?? [])
    const activeVariants = p.product_variants?.filter((v: any) => v.is_active)
    if (activeVariants?.length > 0) setSelectedVariant(activeVariants[0])
    setLoading(false)
  }

  const activePrice = selectedVariant?.price ?? product?.price ?? 0
  const activeStock = selectedVariant?.stock_qty ?? product?.stock_qty ?? 0
  const isOutOfStock = activeStock === 0

  function handleAddToCart() {
    if (!product) return
    if (cartStoreId && cartStoreId !== product.store_id) {
      Alert.alert(
        'Different Store',
        'Your cart has items from another store. Clear cart and add this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Add',
            style: 'destructive',
            onPress: () => { clearCart(); doAddToCart() },
          },
        ]
      )
      return
    }
    doAddToCart()
  }

  function doAddToCart() {
    addItem({
      ...product,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      price: activePrice,
      variant_id: selectedVariant?.id ?? null,
      quantity,
    }, product.store_id, product.stores?.name)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleBuyNow() {
    handleAddToCart()
    router.push('/cart' as any)
  }

  async function handleShare() {
    await Share.share({
      message: `Check out ${product?.name} at ${formatPrice(activePrice)}`,
      url: `https://yourdomain.com/store/${product?.store_id}/product/${id}`,
    })
  }

  if (loading || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <Stack.Screen options={{ title: '' }} />
        {/* Skeleton */}
        <ScrollView>
          <View className="h-72 bg-gray-200 animate-pulse" />
          <View className="p-5 space-y-3">
            <View className="h-6 bg-gray-200 rounded-xl w-3/4 animate-pulse" />
            <View className="h-5 bg-gray-200 rounded-xl w-1/2 animate-pulse" />
            <View className="h-8 bg-gray-200 rounded-xl w-1/3 animate-pulse" />
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerRight: () => (
            <View className="flex-row gap-3 mr-2">
              <TouchableOpacity onPress={() => setWishlisted(!wishlisted)}>
                <Ionicons
                  name={wishlisted ? 'heart' : 'heart-outline'}
                  size={24}
                  color={wishlisted ? '#ef4444' : '#6b7280'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare}>
                <Ionicons name="share-outline" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Image Carousel */}
        <ProductImageCarousel images={product.image_urls ?? []} />

        <View className="px-5 pt-4 pb-6 space-y-4">

          {/* Category tag */}
          {product.categories && (
            <View className="flex-row">
              <View className="bg-indigo-50 px-3 py-1 rounded-full">
                <Text className="text-xs text-indigo-600 font-medium font-bold">
                  {product.categories.icon} {product.categories.name}
                </Text>
              </View>
            </View>
          )}

          {/* Name + Rating */}
          <View>
            <Text className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</Text>
            {product.avg_rating > 0 && (
              <View className="flex-row items-center gap-2 mt-2">
                <StarRating rating={product.avg_rating} size={14} />
                <Text className="text-sm font-semibold text-gray-700">
                  {Number(product.avg_rating).toFixed(1)}
                </Text>
                <Text className="text-sm text-gray-400">({product.review_count} reviews)</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <Text style={{ color: theme.primary }} className="text-3xl font-bold">
            {formatPrice(activePrice)}
          </Text>

          {/* Stock */}
          {isOutOfStock ? (
            <View className="bg-red-50 rounded-xl px-3 py-2 self-start">
              <Text className="text-red-600 text-sm font-medium">Out of Stock</Text>
            </View>
          ) : activeStock <= 5 ? (
            <View className="bg-amber-50 rounded-xl px-3 py-2 self-start">
              <Text className="text-amber-600 text-sm font-medium">Only {activeStock} left!</Text>
            </View>
          ) : (
            <View className="bg-green-50 rounded-xl px-3 py-2 self-start">
              <Text className="text-green-600 text-sm font-medium">✓ In Stock</Text>
            </View>
          )}

          {/* Variants */}
          {product.product_variants?.filter((v: any) => v.is_active).length > 0 && (
            <VariantPills
              variants={product.product_variants.filter((v: any) => v.is_active)}
              selected={selectedVariant}
              onSelect={(v) => { setSelectedVariant(v); setQuantity(1) }}
              basePrice={product.price}
            />
          )}

          {/* Quantity */}
          {!isOutOfStock && (
            <QuantitySelector
              value={quantity}
              min={1}
              max={activeStock}
              onChange={setQuantity}
            />
          )}

          {/* Total */}
          {quantity > 1 && (
            <View className="bg-indigo-50 rounded-xl px-4 py-3">
              <Text className="text-indigo-700 text-sm">
                {quantity} × {formatPrice(activePrice)} = <Text className="font-bold">{formatPrice(activePrice * quantity)}</Text>
              </Text>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View className="bg-white rounded-2xl p-4 border border-gray-100">
              <Text className="font-bold text-gray-900 mb-2">Description</Text>
              <Text className="text-gray-600 leading-relaxed">{product.description}</Text>
              {product.sku && (
                <Text className="text-xs text-gray-400 mt-2">SKU: {product.sku}</Text>
              )}
            </View>
          )}

          {/* Store info */}
          <TouchableOpacity
            onPress={() => router.push(`/store/${product.store_id}` as any)}
            className="flex-row items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100"
          >
            <View className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden items-center justify-center">
              {product.stores?.logo_url ? (
                <View className="w-12 h-12 rounded-xl bg-gray-200" />
              ) : (
                <Text className="text-2xl">🏪</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{product.stores?.name}</Text>
              {product.stores?.rating > 0 && (
                <Text className="text-xs text-gray-500">
                  ⭐ {Number(product.stores.rating).toFixed(1)} store rating
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6b7280" />
          </TouchableOpacity>

          {/* Reviews summary */}
          {reviews.length > 0 && (
            <View className="bg-white rounded-2xl p-4 border border-gray-100">
              <Text className="font-bold text-gray-900 mb-3">
                Reviews ({product.review_count})
              </Text>
              {reviews.slice(0, 3).map((review) => (
                <View key={review.id} className="mb-3 last:mb-0">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-medium text-sm text-gray-800">{review.profiles?.full_name}</Text>
                    <StarRating rating={review.rating} size={12} />
                  </View>
                  {review.comment && (
                    <Text className="text-sm text-gray-600" numberOfLines={2}>{review.comment}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Related products */}
          {related.length > 0 && (
            <View>
              <Text className="font-bold text-gray-900 mb-3">More from {product.stores?.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                {related.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => router.push(`/product/${p.id}` as any)}
                    className="w-36 mr-3 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
                  >
                    <View className="h-28 bg-gray-100 items-center justify-center">
                      {p.image_urls && p.image_urls[0] ? (
                        <View className="w-full h-full bg-gray-200" />
                      ) : (
                        <Text className="text-3xl">📦</Text>
                      )}
                    </View>
                    <View className="p-2">
                      <Text className="text-xs font-medium text-gray-800" numberOfLines={2}>{p.name}</Text>
                      <Text className="text-xs font-bold mt-1" style={{ color: theme.primary }}>
                        {formatPrice(p.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View className="h-24" />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-3 pb-8">
        {isOutOfStock ? (
          <View className="bg-gray-100 rounded-2xl py-4 items-center">
            <Text className="text-gray-500 font-semibold">Out of Stock</Text>
          </View>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleAddToCart}
              style={{ borderColor: added ? '#22c55e' : theme.primary }}
              className="flex-1 border-2 rounded-2xl py-3.5 items-center"
            >
              <Text style={{ color: added ? '#22c55e' : theme.primary }} className="font-bold text-sm">
                {added ? '✓ Added!' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBuyNow}
              style={{ backgroundColor: theme.primary }}
              className="flex-1 rounded-2xl py-3.5 items-center"
            >
              <Text className="text-white font-bold text-sm">Buy Now →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
