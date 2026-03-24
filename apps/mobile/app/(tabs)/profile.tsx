import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import theme from '@/lib/theme'

export default function ProfileScreen() {
  const { profile, loading, signOut } = useAuth()

  if (loading) return <LoadingSpinner />

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="items-center pt-12 pb-8">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: `${theme.primary}20` }}
        >
          <Text className="text-3xl font-bold" style={{ color: theme.primary }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text className="text-xl font-bold text-gray-900">{profile?.full_name ?? 'Customer'}</Text>
        <Text className="text-gray-500 mt-1 capitalize">{profile?.role}</Text>
      </View>

      <View className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <ProfileRow label="Phone" value={profile?.phone ?? 'Not set'} />
        <ProfileRow label="Account Type" value={profile?.role?.toUpperCase() ?? '—'} last />
      </View>

      <View className="mx-4">
        <Button title="Sign Out" variant="outline" onPress={handleSignOut} />
      </View>
    </SafeAreaView>
  )
}

function ProfileRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row justify-between px-4 py-4 ${!last ? 'border-b border-gray-100' : ''}`}>
      <Text className="text-gray-500">{label}</Text>
      <Text className="text-gray-900 font-medium">{value}</Text>
    </View>
  )
}
