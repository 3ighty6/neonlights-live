import { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { ShoppingBag, Lock, Upload, X, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { TOKEN_PACKAGES, createTokenCheckout } from '../lib/payments'
import ContentReviews from './ContentReviews'

interface Bundle {
  id: string
  title: string
  description: string | null
  price_tokens: number
  cover_path: string | null
  user_id: string
}

export default function PhotoBundleShop({
  session,
  creatorId,
  isOwnProfile,
}: {
  session: Session
  creatorId: string
  isOwnProfile: boolean
}) {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({})
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [unlockTarget, setUnlockTarget] = useState<Bundle | null>(null)
  const [buyPromptFor, setBuyPromptFor] = useState<Bundle | null>(null)
  const [viewingBundle, setViewingBundle] = useState<{ bundle: Bundle; urls: string[] } | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: bundleData }, { data: unlocks }] = await Promise.all([
      supabase.from('photo_bundles').select('*').eq('user_id', creatorId).is('posted_as_ai_profile_id', null).order('created_at', { ascending: false }),
      supabase.from('bundle_unlocks').select('bundle_id').eq('user_id', session.user.id),
    ])
    setBundles(bundleData || [])
    setUnlockedIds(new Set((unlocks || []).map((u) => u.bundle_id)))

    // Resolve cover thumbnails for whichever bundles are already accessible
    const covers: Record<string, string> = {}
    for (const b of bundleData || []) {
      if (!b.cover_path) continue
      const owned = b.user_id === session.user.id || b.price_tokens === 0 || (unlocks || []).some((u) => u.bundle_id === b.id)
      if (owned) {
        const { data } = await supabase.storage.from('paid-photos').createSignedUrl(b.cover_path, 3600)
        if (data) covers[b.id] = data.signedUrl
      }
    }
    setCoverUrls(covers)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [creatorId])

  const canAccess = (b: Bundle) => b.user_id === session.user.id || b.price_tokens === 0 || unlockedIds.has(b.id)

  const openBundle = async (b: Bundle) => {
    setError('')
    if (!canAccess(b)) {
      setUnlockTarget(b)
      return
    }
    const { data: photos } = await supabase.from('bundle_photos').select('storage_path').eq('bundle_id', b.id).order('sort_order')
    const urls: string[] = []
    for (const p of photos || []) {
      const { data } = await supabase.storage.from('paid-photos').createSignedUrl(p.storage_path, 3600)
      if (data) urls.push(data.signedUrl)
    }
    setViewingBundle({ bundle: b, urls })
  }

  const confirmUnlock = async () => {
    if (!unlockTarget) return
    const { error: rpcError } = await supabase.rpc('unlock_bundle', { p_bundle_id: unlockTarget.id })
    if (rpcError) {
      if (rpcError.message.includes('Insufficient token balance')) {
        setBuyPromptFor(unlockTarget)
        setUnlockTarget(null)
        return
      }
      setError(rpcError.message)
      setUnlockTarget(null)
      return
    }
    const bundle = unlockTarget
    setUnlockTarget(null)
    setUnlockedIds((prev) => new Set(prev).add(bundle.id))
    load()
    openBundle(bundle)
  }

  const deleteBundle = async (b: Bundle) => {
    if (!confirm(`Delete "${b.title}"? This can't be undone.`)) return
    const { data: photos } = await supabase.from('bundle_photos').select('storage_path').eq('bundle_id', b.id)
    if (photos?.length) {
      await supabase.storage.from('paid-photos').remove(photos.map((p) => p.storage_path))
    }
    await supabase.from('photo_bundles').delete().eq('id', b.id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-cyan-400" size={24} />
          <h2 className="text-xl font-bold">Photo Bundles</h2>
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
          >
            <Upload size={16} /> New Bundle
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No bundles yet</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bundles.map((b) => {
            const locked = !canAccess(b)
            return (
              <div
                key={b.id}
                className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-cyan-500/50 rounded-lg p-6 transition group"
              >
                <div
                  onClick={() => openBundle(b)}
                  className="relative mb-4 rounded overflow-hidden h-40 bg-black cursor-pointer flex items-center justify-center"
                >
                  {coverUrls[b.id] ? (
                    <img src={coverUrls[b.id]} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <Lock className="text-gray-600" size={32} />
                  )}
                  {locked && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Lock className="text-white" size={28} /></div>}
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{b.title}</h3>
                {b.description && <p className="text-sm text-gray-400 mb-3">{b.description}</p>}

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold text-cyan-400">
                    {b.price_tokens > 0 ? `${b.price_tokens} tokens` : 'Free'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openBundle(b)}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {locked ? <Lock size={16} /> : <ShoppingBag size={16} />}
                    {locked ? 'Unlock' : 'View'}
                  </button>
                  {isOwnProfile && (
                    <button onClick={() => deleteBundle(b)} className="bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-400 px-3 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showUpload && (
        <UploadBundleModal
          userId={creatorId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false)
            load()
          }}
        />
      )}

      {viewingBundle && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">{viewingBundle.bundle.title}</h3>
              <button onClick={() => setViewingBundle(null)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {viewingBundle.urls.map((url, i) => (
                <img key={i} src={url} className="w-full aspect-square object-cover rounded" alt="" />
              ))}
            </div>
            <ContentReviews
              contentType="bundle"
              contentId={viewingBundle.bundle.id}
              userId={session.user.id}
              canReview={viewingBundle.bundle.user_id === session.user.id || unlockedIds.has(viewingBundle.bundle.id)}
            />
          </div>
        </div>
      )}

      {unlockTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2">Unlock this bundle?</h2>
            <p className="text-sm text-gray-400 mb-4">
              "{unlockTarget.title}" costs <span className="text-cyan-400 font-semibold">{unlockTarget.price_tokens} tokens</span>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setUnlockTarget(null)} className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 py-2 rounded font-semibold transition">
                Cancel
              </button>
              <button onClick={confirmUnlock} className="flex-1 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 py-2 rounded font-semibold transition">
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {buyPromptFor && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Not enough tokens</h2>
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

function UploadBundleModal({ userId, onClose, onUploaded }: { userId: string; onClose: () => void; onUploaded: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceTokens, setPriceTokens] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    setError('')
    if (!title.trim()) return setError('Give your bundle a title')
    if (files.length === 0) return setError('Choose at least one photo')
    if (files.length > 50) return setError('Max 50 photos per bundle')

    setUploading(true)
    try {
      const { data: bundle, error: insertError } = await supabase
        .from('photo_bundles')
        .insert({ user_id: userId, title: title.trim(), description: description.trim() || null, price_tokens: priceTokens })
        .select()
        .single()
      if (insertError) throw insertError

      const photoRows: { bundle_id: string; storage_path: string; sort_order: number }[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `${bundle.id}/${i}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('paid-photos').upload(path, file)
        if (uploadError) throw uploadError
        photoRows.push({ bundle_id: bundle.id, storage_path: path, sort_order: i })
      }

      const { error: photoInsertError } = await supabase.from('bundle_photos').insert(photoRows)
      if (photoInsertError) throw photoInsertError

      await supabase.from('photo_bundles').update({ cover_path: photoRows[0].storage_path }).eq('id', bundle.id)

      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Photo Bundle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Price (tokens — 0 = free)</label>
            <input
              type="number"
              min={0}
              value={priceTokens}
              onChange={(e) => setPriceTokens(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Photos (up to 50)</label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-800 border border-gray-700 hover:border-cyan-500 rounded px-3 py-2 text-left text-sm text-gray-300 transition"
            >
              {files.length > 0 ? `${files.length} photo(s) selected` : 'Choose photos'}
            </button>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 disabled:opacity-50 text-white py-2 rounded font-semibold transition flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : null}
            {uploading ? 'Uploading...' : 'Create Bundle'}
          </button>
        </div>
      </div>
    </div>
  )
}
