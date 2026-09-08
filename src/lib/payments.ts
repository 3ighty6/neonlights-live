/**
 * Crypto checkout helpers for buying tokens (NOWPayments — Bitcoin +
 * USDC). Calls /api/crypto, which creates the invoice server-side —
 * nothing money-related is trusted from the browser beyond a package
 * index.
 *
 * Tips and subscriptions do NOT go through here — they spend straight
 * from the wallet via the send_room_tip / subscribe_with_tokens RPCs.
 */

// Token packages (display prices in USD). tokens is the TOTAL credited
// amount (bonus already included) -- bonusPercent is display-only, mirrors
// how Chaturbate-style sites market bundles: bigger bundle = bigger % off
// the $0.1099/token base rate set by the 100-token entry tier.
export const TOKEN_PACKAGES = [
  { tokens: 100, priceCents: 1099, bonusPercent: 0, popular: false, priceUSD: 10.99 },
  { tokens: 200, priceCents: 2099, bonusPercent: 5, popular: false, priceUSD: 20.99 },
  { tokens: 400, priceCents: 3999, bonusPercent: 10, popular: false, priceUSD: 39.99 },
  { tokens: 550, priceCents: 4999, bonusPercent: 21, popular: false, priceUSD: 49.99 },
  { tokens: 750, priceCents: 6299, bonusPercent: 31, popular: false, priceUSD: 62.99 },
  { tokens: 1000, priceCents: 7999, bonusPercent: 37, popular: false, priceUSD: 79.99 },
  { tokens: 1255, priceCents: 9999, bonusPercent: 38, popular: true, priceUSD: 99.99 },
  { tokens: 2025, priceCents: 15999, bonusPercent: 39, popular: false, priceUSD: 159.99 },
  { tokens: 4050, priceCents: 31998, bonusPercent: 39, popular: false, priceUSD: 319.98 },
  { tokens: 6350, priceCents: 49999, bonusPercent: 40, popular: false, priceUSD: 499.99 },
  { tokens: 12700, priceCents: 99998, bonusPercent: 40, popular: false, priceUSD: 999.98 },
]

/**
 * Create a NOWPayments invoice for a token package and return the
 * hosted checkout URL to redirect the browser to. returnRoomId is
 * accepted for call-site compatibility but not currently used server
 * side (crypto checkout returns to the homepage, not mid-room).
 */
export async function createTokenCheckout(
  userId: string,
  packageIndex: number,
  _returnRoomId?: string
): Promise<{ url: string | null }> {
  if (!TOKEN_PACKAGES[packageIndex]) throw new Error('Invalid package')

  const response = await fetch('/api/crypto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_invoice',
      userId,
      packageIndex,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to create checkout')
  }
  const data = await response.json()
  return { url: data.checkoutUrl }
}

/**
 * Calculate total tokens including bonus
 */
export function calculateTokens(packageIndex: number): number {
  const pkg = TOKEN_PACKAGES[packageIndex]
  return pkg ? pkg.tokens : 0
}

/**
 * Cheapest package whose total tokens covers a given shortfall --
 * used to pre-select a bundle in low-balance upsell prompts.
 */
export function cheapestPackageCovering(neededTokens: number): number {
  const idx = TOKEN_PACKAGES.findIndex((p) => p.tokens >= neededTokens)
  return idx === -1 ? TOKEN_PACKAGES.length - 1 : idx
}
