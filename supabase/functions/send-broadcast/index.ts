import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN')

serve(async (req) => {
  const { title, body, target_role } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Fetch tokens based on target role
  let query = supabase.from('profiles').select('expo_push_token').not('expo_push_token', 'is', null)
  if (target_role) query = query.eq('role', target_role)

  const { data: profiles } = await query
  const tokens = profiles?.map(p => p.expo_push_token) || []

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ message: 'No recipients' }), { status: 200 })
  }

  // 2. Batch send to Expo
  const chunks = []
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100))
  }

  const results = await Promise.all(chunks.map(chunk => 
    fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}`
      },
      body: JSON.stringify(chunk.map(token => ({
        to: token,
        title,
        body,
        sound: 'default'
      })))
    })
  ))

  return new Response(JSON.stringify({ 
    message: `Notifications queued for ${tokens.length} users`,
    chunks: results.length 
  }), { 
    headers: { 'Content-Type': 'application/json' } 
  })
})
