import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL 
  ?? ''

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY 
  ?? ''

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // must be false for React Native
  },
})
