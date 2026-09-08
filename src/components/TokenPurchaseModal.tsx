import { useEffect, useState } from 'react'
import { X, Zap, Gift } from 'lucide-react'
import { TOKEN_PACKAGES, createTokenCheckout, cheapestPackageCovering } from '../lib/payments'
import { supabase } from '../supabaseClient'

interface TokenPurchaseModalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  /** Tokens still needed to complete whatever the user was trying to do. */
  shortfallTokens?: number
  /** Short reason shown at the top, e.g. "You need 40 more tokens to send that tip." */
  reason?: string
  returnRoomId?: string
  /** Cost of the subscription/renewal this purchase is feeding, if any — used to suggest a multi-cycle reserve bundle. */
  renewalCostTokens?: number
}

export default function TokenPurchaseModal({
  userId,
  isOpen,
  onClose,
  shortfallTokens,
  reason,
  returnRoomId,
  renewalCostTokens,
}: TokenPurchaseModalProps) {
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePromo, setActivePromo] = useState<{ title: string; bonus_percent: number } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const loadPromo = async () => {
      const nowIso = new Date().toISOString()
      const { data } = await supabase
        .from('token_promotions')
        .select('title, bonus_percent')
        .eq('active', true)
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso)
        .order('bonus_percent', { ascending: false })
        .limit(1)
      setActivePromo(data?.[0] || null)
    }
    loadPromo()
  }, [isOpen])

  if (!isOpen) return null

  const suggestedIdx = shortfallTokens ? cheapestPackageCovering(shortfallTokens) : null
  const reserveIdx = renewalCostTokens ? cheapestPackageCovering(renewalCostTokens * 3) : null

  const handleBuy = async (idx: number) => {
    setError(null)
    setLoadingIdx(idx)
    try {
      const { url } = await createTokenCheckout(userId, idx, returnRoomId)
      if (url) window.location.href = url
      else throw new Error('No checkout URL returned')
    } catch (e: any) {
      setError(e.message || 'Something went wrong starting checkout')
      setLoadingIdx(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0d0a1a] border border-pink-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-400" size={22} />
            <h2 className="text-xl font-bold text-white">Get Tokens</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {reason && (
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-pink-200">
            {reason}
          </div>
        )}

        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-4 py-3 mb-5 text-sm text-cyan-200 flex items-center gap-2">
          <Gift size={16} className="shrink-0" />
          {activePromo
            ? `${activePromo.title}: +${activePromo.bonus_percent}% extra tokens on every bundle right now.`
            : 'Bigger bundles carry a bigger bonus — up to 40% more tokens free on our largest pack.'}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOKEN_PACKAGES.map((pkg, idx) => {
            const isSuggested = suggestedIdx === idx
            const isReserve = !isSuggested && reserveIdx === idx
            const isPopular = pkg.popular
            return (
              <button
                key={idx}
                onClick={() => handleBuy(idx)}
                disabled={loadingIdx !== null}
                className={`relative text-left p-4 rounded-xl border transition disabled:opacity-50 ${
                  isSuggested
                    ? 'bg-pink-500/10 border-pink-500 ring-2 ring-pink-500/40'
                    : isReserve
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/40'
                    : isPopular
                    ? 'bg-cyan-500/10 border-cyan-500/50 ring-2 ring-cyan-500/30'
                    : 'bg-white/5 border-white/10 hover:border-cyan-400/40'
                }`}
              >
                {(isSuggested || isReserve || isPopular) && (
                  <div
                    className={`absolute -top-2 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSuggested ? 'bg-pink-500 text-white' : isReserve ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black'
                    }`}
                  >
                    {isSuggested ? 'COVERS IT' : isReserve ? '3 CYCLES' : 'MOST POPULAR'}
                  </div>
                )}
                <div className="text-2xl font-bold text-white">{pkg.tokens.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mb-2">tokens</div>
                <div className="text-lg font-semibold text-cyan-300">${pkg.priceUSD.toFixed(2)}</div>
                {pkg.bonusPercent > 0 && (
                  <div className="text-xs text-green-400 mt-1">+{pkg.bonusPercent}% bonus</div>
                )}
                {loadingIdx === idx && <div className="text-xs text-gray-400 mt-2">Redirecting…</div>}
              </button>
            )
          })}
        </div>

        <p className="text-xs text-gray-500 mt-5 text-center">
          Tokens never expire. Secure checkout via Bitcoin or USDC.
        </p>
      </div>
    </div>
  )
}
