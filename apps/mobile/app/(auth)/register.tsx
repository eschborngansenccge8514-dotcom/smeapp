import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import theme from '@/lib/theme'

export default function RegisterScreen() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) Alert.alert('Sign Up Failed', error.message)
    else Alert.alert('Check your email', 'Please confirm your email address.', [
      { text: 'OK', onPress: () => router.replace('/(auth)/login') },
    ])
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
          <Text className="text-gray-500 mb-8">Sign up to start shopping</Text>

          <Text className="text-gray-700 font-medium mb-1">Full Name</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900"
            placeholder="Ali bin Ahmad"
            value={fullName}
            onChangeText={setFullName}
          />

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
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button title="Create Account" loading={loading} onPress={signUp} />

          <TouchableOpacity className="mt-6 items-center" onPress={() => router.replace('/(auth)/login')}>
            <Text className="text-gray-500">
              Already have an account?{' '}
              <Text style={{ color: theme.primary }} className="font-semibold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
