import { useState, useEffect } from 'react'
import { DollarSign, ArrowDownToLine, Loader2, CheckCircle, Save } from 'lucide-react'
import { supabase } from '../supabaseClient'

interface PayoutRow {
  id: string
  amount_usd: number
  status: string
  created_at: string
}

export default function EarningsPayouts({ userId }: { userId: string }) {
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [paxumEmail, setPaxumEmail] = useState('')
  const [paxumInput, setPaxumInput] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cashingOut, setCashingOut] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const [{ data: user }, { data: payoutRows }] = await Promise.all([
      supabase.from('users').select('total_earnings, paxum_email').eq('id', userId).single(),
      supabase.from('payouts').select('id, amount_usd, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    ])
    setTotalEarnings(Number(user?.total_earnings || 0))
    setPayouts(payoutRows || [])
    setPaxumEmail(user?.paxum_email || '')
    setPaxumInput(user?.paxum_email || '')
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [userId])

  const alreadyPaidOut = payouts
    .filter((p) => p.status === 'pending' || p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount_usd), 0)
  const available = Math.max(0, totalEarnings - alreadyPaidOut)

  const savePaxumEmail = async () => {
    setError('')
    setSavingEmail(true)
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ paxum_email: paxumInput.trim() })
        .eq('id', userId)
      if (updateError) throw updateError
      setPaxumEmail(paxumInput.trim())
      setMessage('Paxum email saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingEmail(false)
    }
  }

  const cashOut = async () => {
    setError('')
    setMessage('')
    setCashingOut(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/request-payout', {
        method: 'POST',
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payout failed')
      setMessage(`✅ $${data.amount.toFixed(2)} queued for Paxum payout — an admin sends it by hand, usually within a few business days.`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCashingOut(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-cyan-500/20 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <DollarSign size={18} className="text-green-400" />
        Earnings & Payouts
      </h2>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}
      {message && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-300 text-sm">{message}</div>}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : (
        <>
          <div className="mb-4">
            <label className="text-xs text-gray-400 block mb-1">Paxum email (where payouts are sent)</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={paxumInput}
                onChange={(e) => setPaxumInput(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
              />
              <button
                onClick={savePaxumEmail}
                disabled={savingEmail || !paxumInput.trim() || paxumInput.trim() === paxumEmail}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1.5"
              >
                {savingEmail ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Save
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-400">Available to cash out</div>
              <div className="text-2xl font-bold text-green-400">${available.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Lifetime earnings</div>
              <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            </div>
          </div>

          <button
            onClick={cashOut}
            disabled={cashingOut || available < 10 || !paxumEmail}
            className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 shadow-lg shadow-green-500/20 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition flex items-center gap-2"
          >
            {cashingOut ? <Loader2 className="animate-spin" size={18} /> : <ArrowDownToLine size={18} />}
            {cashingOut ? 'Processing...' : 'Cash Out'}
          </button>
          {!paxumEmail && (
            <p className="text-xs text-gray-500 mt-2">Add your Paxum email above before cashing out.</p>
          )}
          {available < 10 && (
            <p className="text-xs text-gray-500 mt-2">$10 minimum to cash out.</p>
          )}

          {payouts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Payout History</h3>
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-sm bg-gray-800 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.status === 'completed' && <CheckCircle size={14} className="text-green-400" />}
                      <span>{new Date(p.created_at).toLocaleDateString()} — {p.status}</span>
                    </div>
                    <span className="font-semibold">${Number(p.amount_usd).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
