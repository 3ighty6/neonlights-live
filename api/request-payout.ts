/**
 * Vercel API Route: /api/request-payout
 * Queues a creator's available balance (total_earnings minus anything
 * already paid out) for a manual Paxum payout. Nothing is transferred
 * automatically here — this inserts a `pending` row that an admin pays
 * by hand from the Paxum dashboard, then marks completed.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

const MINIMUM_PAYOUT_USD = 10

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Payouts not configured' })
  }

  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  try {
    // Verify the caller's identity against their own session token first
    // (anon-scoped client), then do the actual work with the service
    // role so it isn't limited by the payouts table's read-only RLS.
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: authUser, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authUser?.user) {
      return res.status(401).json({ error: 'Invalid session' })
    }
    const userId = authUser.user.id

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: user } = await supabase
      .from('users')
      .select('total_earnings, paxum_email')
      .eq('id', userId)
      .single()

    if (!user?.paxum_email) {
      return res.status(400).json({ error: 'Add your Paxum email in settings before cashing out' })
    }

    const { data: priorPayouts } = await supabase
      .from('payouts')
      .select('amount_usd')
      .eq('user_id', userId)
      .in('status', ['pending', 'completed'])

    const alreadyPaidOut = (priorPayouts || []).reduce((sum, p) => sum + Number(p.amount_usd), 0)
    const available = Number(user.total_earnings || 0) - alreadyPaidOut

    if (available < MINIMUM_PAYOUT_USD) {
      return res.status(400).json({
        error: `Minimum payout is $${MINIMUM_PAYOUT_USD}. Your available balance is $${available.toFixed(2)}.`,
      })
    }

    // Queue it -- an admin pays this by hand via Paxum, then flips the
    // row to completed. No money moves automatically from this endpoint.
    await supabase.from('payouts').insert({
      user_id: userId,
      amount_usd: available,
      status: 'pending',
      payout_method: 'paxum',
      payout_destination: user.paxum_email,
    })

    res.json({ success: true, amount: available, queued: true })
  } catch (error) {
    console.error('Payout error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Payout failed' })
  }
}
