import { useState, useEffect } from 'react'
import { Crown, Loader2, Check, Zap } from 'lucide-react'
import { supabase } from '../supabaseClient'
import TokenPurchaseModal from './TokenPurchaseModal'

const VIP_COST_TOKENS = 180

export default function ViewerVIP({ userId }: { userId: string }) {
  const [isVip, setIsVip] = useState(false)
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [showTopUp, setShowTopUp] = useState(false)

  const load = async () => {
    const [{ data: sub }, { data: user }] = await Promise.all([
      supabase
        .from('viewer_vip_subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('users').select('token_balance').eq('id', userId).single(),
    ])
    setIsVip(!!sub)
    setPeriodEnd(sub?.current_period_end || null)
    setBalance(user?.token_balance || 0)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [userId])

  const subscribe = async () => {
    setError('')
    setSubscribing(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('subscribe_with_tokens', { p_kind: 'viewer_vip' })
      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error === 'insufficient_tokens' ? 'Not enough tokens.' : data?.error || 'Failed to subscribe')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubscribing(false)
    }
  }

  const cancel = async () => {
    setError('')
    setCancelling(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('cancel_subscription', { p_kind: 'viewer_vip' })
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

  const short = balance < VIP_COST_TOKENS

  return (
    <div className="bg-gray-900 border border-amber-500/30 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Crown size={18} className="text-amber-400" />
          NeonLights VIP
        </h2>
        <div className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-full ${short ? 'bg-red-500/10 text-red-300' : 'bg-white/5 text-gray-300'}`}>
          <Zap size={14} />
          {balance.toLocaleString()}
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Animated stream previews on hover, a VIP badge in chat, and priority in future perks — {VIP_COST_TOKENS} tokens / 30 days.
      </p>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}

      {isVip ? (
        <div className="space-y-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-sm flex items-center gap-2">
            <Check size={16} />
            Active{periodEnd && ` — renews ${new Date(periodEnd).toLocaleDateString()}`}
          </div>
          {short && (
            <p className="text-xs text-red-300">Balance is below the {VIP_COST_TOKENS}-token renewal cost — top up before the next renewal or VIP will expire.</p>
          )}
          <button
            onClick={cancel}
            disabled={cancelling}
            className="text-xs text-gray-400 hover:text-gray-200 underline disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel VIP'}
          </button>
        </div>
      ) : short ? (
        <button
          onClick={() => setShowTopUp(true)}
          className="bg-white/10 border border-white/20 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2"
        >
          <Zap size={16} />
          Top Up to Subscribe ({VIP_COST_TOKENS - balance} more needed)
        </button>
      ) : (
        <button
          onClick={subscribe}
          disabled={subscribing}
          className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:opacity-90 disabled:opacity-50 text-black px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2"
        >
          {subscribing ? <Loader2 className="animate-spin" size={16} /> : <Crown size={16} />}
          {subscribing ? 'Processing...' : `Become VIP (${VIP_COST_TOKENS} tokens)`}
        </button>
      )}

      <TokenPurchaseModal
        userId={userId}
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        shortfallTokens={VIP_COST_TOKENS - balance}
        renewalCostTokens={VIP_COST_TOKENS}
        reason={`You need ${VIP_COST_TOKENS - balance} more tokens to become VIP.`}
      />
    </div>
  )
}
