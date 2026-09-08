import { useState, useEffect } from 'react'
import { Rocket, Star, Crown, Loader2, Check, Zap } from 'lucide-react'
import { supabase } from '../supabaseClient'
import TokenPurchaseModal from './TokenPurchaseModal'

const TIERS = [
  { id: 'boost', label: 'Boost', cost: 90, icon: Rocket, description: 'Higher placement in the discovery feed.' },
  { id: 'featured', label: 'Featured', cost: 225, icon: Star, description: 'Top placement, plus rotating platform-wide special features as they come up.' },
  { id: 'elite', label: 'Elite', cost: 900, icon: Crown, description: 'Everything in Featured, plus first eligibility for every new promotional feature as it launches.' },
]

export default function CreatorBoost({ userId }: { userId: string }) {
  const [current, setCurrent] = useState<{ tier: string; status: string; current_period_end: string | null } | null>(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [topUpFor, setTopUpFor] = useState<{ id: string; cost: number } | null>(null)

  const load = async () => {
    const [{ data: sub }, { data: user }] = await Promise.all([
      supabase
        .from('creator_subscriptions')
        .select('tier, status, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('users').select('token_balance').eq('id', userId).single(),
    ])
    setCurrent(sub)
    setBalance(user?.token_balance || 0)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [userId])

  const subscribe = async (tier: string) => {
    setError('')
    setSubscribing(tier)
    try {
      const { data, error: rpcError } = await supabase.rpc('subscribe_with_tokens', {
        p_kind: 'creator_subscription',
        p_tier: tier,
      })
      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error === 'insufficient_tokens' ? 'Not enough tokens.' : data?.error || 'Failed to subscribe')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubscribing(null)
    }
  }

  const cancel = async () => {
    setError('')
    setCancelling(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('cancel_subscription', { p_kind: 'creator_subscription' })
      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Failed to cancel')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-cyan-500/20 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Rocket size={18} className="text-purple-400" />
          Promote Your Profile
        </h2>
        <div className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-full bg-white/5 text-gray-300">
          <Zap size={14} />
          {balance.toLocaleString()}
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-4">Monthly platform promotion — separate from tips and payouts.</p>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}

      {current && (
        <div className="mb-4 space-y-2">
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-green-300 text-sm flex items-center gap-2">
            <Check size={16} />
            Active: {TIERS.find((t) => t.id === current.tier)?.label || current.tier}
            {current.current_period_end && ` — renews ${new Date(current.current_period_end).toLocaleDateString()}`}
          </div>
          <button
            onClick={cancel}
            disabled={cancelling}
            className="text-xs text-gray-400 hover:text-gray-200 underline disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        {TIERS.map((t) => {
          const Icon = t.icon
          const isCurrent = current?.tier === t.id
          const short = balance < t.cost
          return (
            <div key={t.id} className={`border rounded-lg p-4 ${isCurrent ? 'border-green-500/50 bg-green-500/5' : 'border-gray-700 bg-gray-800'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={18} className={t.id === 'elite' ? 'text-amber-400' : t.id === 'featured' ? 'text-yellow-400' : 'text-cyan-400'} />
                <span className="font-semibold">{t.label}</span>
                <span className="ml-auto text-sm text-gray-400">{t.cost} tok</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t.description}</p>
              <button
                onClick={() => (short ? setTopUpFor({ id: t.id, cost: t.cost }) : subscribe(t.id))}
                disabled={isCurrent || subscribing !== null}
                className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 disabled:opacity-50 text-white py-1.5 rounded text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {subscribing === t.id ? <Loader2 className="animate-spin" size={14} /> : null}
                {isCurrent ? 'Active' : subscribing === t.id ? 'Processing...' : short ? 'Top Up' : 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>

      {topUpFor && (
        <TokenPurchaseModal
          userId={userId}
          isOpen={!!topUpFor}
          onClose={() => setTopUpFor(null)}
          shortfallTokens={topUpFor.cost - balance}
          renewalCostTokens={topUpFor.cost}
          reason={`You need ${topUpFor.cost - balance} more tokens for ${TIERS.find((t) => t.id === topUpFor.id)?.label}.`}
        />
      )}
    </div>
  )
}
