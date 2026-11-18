// Deletes the caller's own account. Their data (projects, routines, items, running session,
// settings) goes with it: every table references auth.users with `on delete cascade`.
// See prototype/components/Settings.tsx (Danger zone).
import { createClient } from 'npm:@supabase/supabase-js@2'

const ORIGINS = ['https://stint-prototype.vercel.app', 'http://localhost:5174']

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const cors = {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Who is asking: the caller's own session. Only that account can be deleted.
  const jwt = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  const { data: caller } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
  const id = caller.user?.id
  if (!id) return reply(401, { error: 'Not signed in' })

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return reply(500, { error: error.message })
  return reply(200, { deleted: true })
})
