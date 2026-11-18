// Signs the desktop app in from the web app, in one click (no second email code).
// The signed-in web app calls this; it returns a fresh single-use sign-in token for the same
// account, which the web app hands to the desktop app through a stint:// link. The desktop app
// redeems it for its own session (supabase.auth.verifyOtp), so web and desktop never share one.
// See prototype/lib/desktopLink.ts.
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

  // Who is asking: the caller's own session.
  const jwt = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  const { data: caller } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
  const email = caller.user?.email
  if (!email) return reply(401, { error: 'Not signed in' })

  // A magic-link token for that same account (nothing is emailed).
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data.properties?.hashed_token) return reply(500, { error: error?.message ?? 'No token' })
  return reply(200, { token_hash: data.properties.hashed_token })
})
