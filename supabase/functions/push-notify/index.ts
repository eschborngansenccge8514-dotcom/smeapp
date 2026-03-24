import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { user_id, title, body, data } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get all registered tokens for user
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', user_id)

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'No tokens found' }))
  }

  const messages = tokens.map(t => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data: data || {},
  }))

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })

  return new Response(await res.text(), {
    headers: { 'Content-Type': 'application/json' }
  })
})
