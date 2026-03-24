import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import theme from '@/lib/theme'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Sign In Failed', error.message)
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">{theme.appName}</Text>
          <Text className="text-gray-500 mb-8">Sign in to your account</Text>

          <Text className="text-gray-700 font-medium mb-1">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900"
            placeholder="ali@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text className="text-gray-700 font-medium mb-1">Password</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button title="Sign In" loading={loading} onPress={signIn} />

          <TouchableOpacity className="mt-6 items-center" onPress={() => router.replace('/(auth)/register')}>
            <Text className="text-gray-500">
              Don't have an account?{' '}
              <Text style={{ color: theme.primary }} className="font-semibold">Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
