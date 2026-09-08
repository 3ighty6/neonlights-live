import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { Star, Plus, Trash2, Lock, Unlock, X, ShoppingCart } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { TOKEN_PACKAGES, createTokenCheckout } from '../lib/payments'

interface Perk {
  id: string
  title: string
  description: string | null
  price_tokens: number
  user_id: string
  is_active: boolean
}

export default function CreatorPerks({
  session,
  creatorId,
  isOwnProfile,
}: {
  session: Session
  creatorId: string
  isOwnProfile: boolean
}) {
  const [perks, setPerks] = useState<Perk[]>([])
  const [unlockedIds, setUnlockedIds] = useState<Record<string, string>>({}) // perkId -> reveal text
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [viewingReveal, setViewingReveal] = useState<{ perk: Perk; reveal: string } | null>(null)
  const [buyPromptFor, setBuyPromptFor] = useState<Perk | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('creator_perks')
      .select('id, title, description, price_tokens, user_id, is_active')
      .eq('user_id', creatorId)
      .eq('is_active', true)
      .order('price_tokens')
    setPerks(data || [])

    const { data: unlocks } = await supabase
      .from('perk_unlocks')
      .select('perk_id')
      .eq('user_id', session.user.id)
    setUnlockedIds(
      (unlocks || []).reduce((acc, u) => ({ ...acc, [u.perk_id]: '' }), {} as Record<string, string>)
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [creatorId])

  const openPerk = async (perk: Perk) => {
    setError('')
    setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('unlock_perk', { p_perk_id: perk.id })
    setLoading(false)

    if (rpcError) {
      if (rpcError.message.includes('Insufficient token balance')) {
        setBuyPromptFor(perk)
        return
      }
      setError(rpcError.message)
      return
    }

    setUnlockedIds((prev) => ({ ...prev, [perk.id]: data.reveal }))
    setViewingReveal({ perk, reveal: data.reveal })
  }

  const deletePerk = async (id: string) => {
    if (!confirm('Delete this perk?')) return
    await supabase.from('creator_perks').update({ is_active: false }).eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="text-yellow-400" size={24} />
          <h2 className="text-xl font-bold">Perks & Extras</h2>
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
          >
            <Plus size={16} /> New Perk
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : perks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {isOwnProfile
            ? 'No perks yet. Offer something like your Snapchat, a monthly subscription, or custom content requests for a flat token price.'
            : 'No perks available yet.'}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {perks.map((perk) => {
            const unlocked = perk.user_id === session.user.id || perk.id in unlockedIds
            return (
              <div key={perk.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{perk.title}</h3>
                  <span className="text-yellow-400 font-bold text-sm whitespace-nowrap ml-2">
                    {perk.price_tokens} tokens
                  </span>
                </div>
                {perk.description && <p className="text-sm text-gray-400 mb-3">{perk.description}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => openPerk(perk)}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white py-1.5 rounded text-sm font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    {unlocked ? <Unlock size={14} /> : <Lock size={14} />}
                    {unlocked ? 'View' : 'Unlock'}
                  </button>
                  {isOwnProfile && (
                    <button onClick={() => deletePerk(perk.id)} className="bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-red-400 px-3 rounded transition">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddPerkModal userId={creatorId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load() }} />
      )}

      {viewingReveal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{viewingReveal.perk.title}</h2>
              <button onClick={() => setViewingReveal(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="bg-gray-800 rounded p-4 text-gray-200 whitespace-pre-wrap">{viewingReveal.reveal}</div>
          </div>
        </div>
      )}

      {buyPromptFor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="text-cyan-400" size={22} />
              <h2 className="text-lg font-bold">Not enough tokens</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              "{buyPromptFor.title}" needs {buyPromptFor.price_tokens} tokens.
            </p>
            <div className="space-y-2 mb-4">
              {TOKEN_PACKAGES.map((pkg, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    const { url } = await createTokenCheckout(session.user.id, idx)
                    if (url) window.location.href = url
                  }}
                  className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-4 py-3 transition"
                >
                  <span className="text-sm font-semibold text-cyan-400">{pkg.tokens} tokens</span>
                  <span className="font-semibold">${pkg.priceUSD.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setBuyPromptFor(null)} className="w-full text-sm text-gray-400 hover:text-gray-300 transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddPerkModal({ userId, onClose, onAdded }: { userId: string; onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(50)
  const [reveal, setReveal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    if (!title.trim() || !reveal.trim() || price <= 0) {
      setError('Fill in title, price, and what unlocking reveals')
      return
    }
    setSaving(true)
    const { error: insertError } = await supabase.from('creator_perks').insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      price_tokens: price,
      reveal_content: reveal.trim(),
    })
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onAdded()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Perk</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Snapchat, Monthly Subscription"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description (shown before unlock)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Price (tokens)</label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">What unlocking reveals</label>
            <textarea
              value={reveal}
              onChange={(e) => setReveal(e.target.value)}
              placeholder="e.g. your Snapchat username, subscription instructions, a link"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Only shown to whoever pays for it.</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 disabled:opacity-50 text-white py-2 rounded font-semibold transition"
          >
            {saving ? 'Saving...' : 'Create Perk'}
          </button>
        </div>
      </div>
    </div>
  )
}
