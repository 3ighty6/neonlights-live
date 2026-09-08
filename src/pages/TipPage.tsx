import { useState, useEffect } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { TOKEN_PACKAGES, calculateTokens, createTokenCheckout } from '../lib/payments'
import { supabase } from '../supabaseClient'

export default function TipPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('users').select('token_balance').eq('id', user.id).single()
      setBalance(data?.token_balance ?? 0)
    }
    load()
  }, [])

  const handleTokenPurchase = async (packageIndex: number) => {
    if (!userId) {
      setError('You need to be signed in to buy tokens')
      return
    }
    setError('')
    setLoading(`token-${packageIndex}`)
    try {
      const { url } = await createTokenCheckout(userId, packageIndex)
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
          Get Tokens
        </h1>
        <p className="text-gray-400 mb-2">Buy tokens to tip creators during their streams</p>
        {balance !== null && (
          <p className="text-cyan-400 font-semibold mb-8">Your balance: {balance} tokens</p>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-900 border border-cyan-500/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" size={28} />
            Token Packages
          </h2>
          <p className="text-gray-400 mb-6">
            Tokens are spent tipping creators live, from inside their stream.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {TOKEN_PACKAGES.map((pkg, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-lg border transition ${
                  pkg.popular
                    ? 'bg-cyan-500/10 border-cyan-500/50 ring-2 ring-cyan-500/30'
                    : 'bg-gray-800 border-gray-700 hover:border-cyan-500/30'
                }`}
              >
                {pkg.popular && (
                  <div className="inline-block bg-cyan-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
                    POPULAR
                  </div>
                )}

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-3xl font-bold text-cyan-400">{pkg.tokens}</div>
                    <div className="text-sm text-gray-400">tokens</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${pkg.priceUSD.toFixed(2)}</div>
                  </div>
                </div>

                {pkg.bonusPercent > 0 && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded px-3 py-2 text-sm text-green-300 mb-4">
                    {pkg.bonusPercent}% bonus vs. base rate! 🎁
                  </div>
                )}

                <div className="text-sm text-gray-400 mb-4">
                  <strong>Total:</strong> {calculateTokens(idx)} tokens
                </div>

                <button
                  onClick={() => handleTokenPurchase(idx)}
                  disabled={loading === `token-${idx}`}
                  className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 disabled:opacity-50 text-white py-2 rounded font-semibold transition flex items-center justify-center gap-2"
                >
                  {loading === `token-${idx}` ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Processing...
                    </>
                  ) : (
                    'Buy Now'
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-gray-300">
            <strong>🔒 Secure:</strong> Payments are processed via NOWPayments (Bitcoin/USDC). Wallet details never touch our servers.
          </div>
        </div>
      </div>
    </div>
  )
}
