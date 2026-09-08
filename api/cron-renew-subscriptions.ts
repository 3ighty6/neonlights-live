/**
 * Vercel API Route: /api/cron-renew-subscriptions
 * Runs daily (see vercel.json crons, 3am UTC) and charges every active
 * viewer VIP / creator subscription that's due for renewal against the
 * buyer's token wallet. Insufficient balance = immediate expiry, no
 * grace period — this is what creates refill pressure by design.
 *
 * Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on
 * scheduled invocations when CRON_SECRET is set in the environment —
 * this checks that so the endpoint can't be triggered by anyone else.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!CRON_SECRET || req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('cron-renew-subscriptions missing Supabase service credentials')
    return res.status(500).json({ error: 'Not configured' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { data, error } = await supabase.rpc('renew_subscriptions_from_wallet')
    if (error) {
      console.error('renew_subscriptions_from_wallet error:', error)
      return res.status(500).json({ error: error.message })
    }
    return res.json({ success: true, result: data })
  } catch (err) {
    console.error('cron-renew-subscriptions error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
