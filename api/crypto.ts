/**
 * Vercel API Route: /api/crypto
 * Does exactly one thing on the money side: sells token packages via
 * NOWPayments (Bitcoin + USDC). Tips and subscriptions spend from the
 * wallet directly (send_room_tip / subscribe_with_tokens RPCs) — they
 * never touch this route.
 *
 * Two entry points share this one function to stay under Vercel's
 * Hobby 12-function cap:
 *   POST { action: 'create_invoice', userId, packageIndex } -> returns
 *     a hosted NOWPayments invoice URL for the browser to redirect to.
 *   POST from NOWPayments itself (identified by the x-nowpayments-sig
 *     header) -> verifies the HMAC-SHA512 signature, then credits
 *     tokens via the credit_crypto_payment RPC once a payment reaches
 *     a finished/confirmed state. Idempotent — credit_crypto_payment
 *     no-ops on repeat IPN retries for the same payment id.
 *
 * Requires NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, and
 * SUPABASE_SERVICE_ROLE_KEY in the Vercel environment.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export const config = {
  api: { bodyParser: true },
}

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || ''
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SITE_URL = process.env.SITE_URL || 'https://neonlights.cam'

// Mirrors src/lib/payments.ts TOKEN_PACKAGES. Kept server-side too so a
// client can never dictate its own price — only an index is trusted.
const TOKEN_PACKAGES = [
  { tokens: 100, priceUSD: 10.99 },
  { tokens: 200, priceUSD: 20.99 },
  { tokens: 400, priceUSD: 39.99 },
  { tokens: 550, priceUSD: 49.99 },
  { tokens: 750, priceUSD: 62.99 },
  { tokens: 1000, priceUSD: 79.99 },
  { tokens: 1255, priceUSD: 99.99 },
  { tokens: 2025, priceUSD: 159.99 },
  { tokens: 4050, priceUSD: 319.98 },
  { tokens: 6350, priceUSD: 499.99 },
  { tokens: 12700, priceUSD: 999.98 },
]

// NOWPayments signs the IPN body as JSON with keys sorted
// alphabetically, HMAC-SHA512 with the IPN secret.
function verifyIpnSignature(body: any, sig: string | undefined): boolean {
  if (!sig || !NOWPAYMENTS_IPN_SECRET) return false
  const sorted = Object.keys(body)
    .sort()
    .reduce((acc: any, key) => {
      acc[key] = body[key]
      return acc
    }, {})
  const hmac = crypto
    .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    .update(JSON.stringify(sorted))
    .digest('hex')
  return hmac === sig
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('crypto route missing Supabase service credentials')
    return res.status(500).json({ error: 'Not configured' })
  }

  const ipnSig = req.headers['x-nowpayments-sig'] as string | undefined

  // --- Branch 1: NOWPayments IPN webhook ---
  if (ipnSig) {
    if (!verifyIpnSignature(req.body, ipnSig)) {
      console.error('crypto IPN signature mismatch')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const payload = req.body || {}
    const status = payload.payment_status
    const orderId: string = payload.order_id || ''

    // Only credit on a final, paid state. Other statuses (waiting,
    // confirming, partially_paid) just acknowledge and wait for the
    // next retry.
    if (status !== 'finished' && status !== 'confirmed') {
      return res.status(200).json({ received: true, status })
    }

    const [userId, tokensStr, amountUsdStr] = orderId.split(':')
    const tokens = parseInt(tokensStr, 10)
    const amountUsd = parseFloat(amountUsdStr)

    if (!userId || !Number.isFinite(tokens) || !Number.isFinite(amountUsd)) {
      console.error('crypto IPN: malformed order_id', orderId)
      return res.status(200).json({ received: true, error: 'malformed_order_id' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try {
      const { error } = await supabase.rpc('credit_crypto_payment', {
        p_nowpayments_payment_id: String(payload.payment_id),
        p_order_id: orderId,
        p_user_id: userId,
        p_tokens: tokens,
        p_amount_usd: amountUsd,
        p_pay_currency: payload.pay_currency || null,
        p_pay_amount: payload.pay_amount ?? null,
        p_raw_payload: payload,
      })
      if (error) {
        console.error('credit_crypto_payment error:', error)
        // Still 200 so NOWPayments doesn't hammer retries for a bug on
        // our end; the payment is visible/replayable from their dashboard.
      }
      return res.status(200).json({ received: true })
    } catch (err) {
      console.error('crypto IPN processing error:', err)
      return res.status(200).json({ received: true, processingError: String(err) })
    }
  }

  // --- Branch 2: create a checkout invoice ---
  const { action, userId, packageIndex } = req.body || {}

  if (action !== 'create_invoice') {
    return res.status(400).json({ error: 'Unknown action' })
  }
  if (!NOWPAYMENTS_API_KEY) {
    return res.status(500).json({ error: 'Crypto payments not configured yet' })
  }
  if (!userId || typeof packageIndex !== 'number' || !TOKEN_PACKAGES[packageIndex]) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  const pkg = TOKEN_PACKAGES[packageIndex]
  // order_id carries what the IPN needs to credit the right user —
  // NOWPayments echoes it back verbatim on every status callback.
  const orderId = `${userId}:${pkg.tokens}:${pkg.priceUSD}`

  try {
    const invoiceRes = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: pkg.priceUSD,
        price_currency: 'usd',
        order_id: orderId,
        order_description: `${pkg.tokens} NeonLights tokens`,
        ipn_callback_url: `${SITE_URL}/api/crypto`,
        success_url: `${SITE_URL}/?purchase=success`,
        cancel_url: `${SITE_URL}/?purchase=cancelled`,
      }),
    })

    if (!invoiceRes.ok) {
      const errText = await invoiceRes.text()
      console.error('NOWPayments invoice error:', invoiceRes.status, errText)
      return res.status(502).json({ error: 'Failed to create crypto invoice' })
    }

    const invoice = await invoiceRes.json()
    return res.json({ checkoutUrl: invoice.invoice_url })
  } catch (err) {
    console.error('crypto invoice creation error:', err)
    return res.status(500).json({ error: 'Failed to create crypto invoice' })
  }
}
