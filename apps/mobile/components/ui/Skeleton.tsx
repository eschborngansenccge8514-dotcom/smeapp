import { View } from 'react-native'

export function Skeleton({ className }: { className?: string }) {
  return <View className={`bg-gray-200 rounded-lg animate-pulse ${className ?? ''}`} />
}

export function StoreCardSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-3 mb-3 shadow-sm">
      <Skeleton className="h-36 w-full rounded-xl mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </View>
  )
}
