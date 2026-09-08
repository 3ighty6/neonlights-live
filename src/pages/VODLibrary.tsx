import { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import Hls from 'hls.js'
import { Play, Trash2, Eye, Lock, Upload, X, Loader2, ShoppingCart } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { TOKEN_PACKAGES, createTokenCheckout } from '../lib/payments'
import TagAndEarn from '../components/TagAndEarn'
import ContentReviews from '../components/ContentReviews'

interface VideoRow {
  id: string
  user_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  video_path: string | null
  mux_playback_id: string | null
  is_private_show_recording?: boolean
  duration_seconds: number | null
  view_count: number
  is_public: boolean
  price_tokens: number
  created_at: string
  users?: { username: string }
  ai_profile?: { username: string } | null
}

export default function VODLibrary({ session, userId }: { session: Session; userId: string }) {
  const [tab, setTab] = useState<'all' | 'mine' | 'tag'>('all')
  const [allVideos, setAllVideos] = useState<VideoRow[]>([])
  const [myVideos, setMyVideos] = useState<VideoRow[]>([])
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [playingVideo, setPlayingVideo] = useState<{ row: VideoRow; url: string } | null>(null)
  const [unlockTarget, setUnlockTarget] = useState<VideoRow | null>(null)
  const [buyPromptFor, setUnlockOutOfTokens] = useState<VideoRow | null>(null)
  const [error, setError] = useState('')

  const loadVideos = async () => {
    setLoading(true)
    const [{ data: all }, { data: mine }, { data: unlocks }] = await Promise.all([
      supabase
        .from('vod_library')
        .select('*, users:user_id(username), ai_profile:posted_as_ai_profile_id(username)')
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('vod_library')
        .select('*, users:user_id(username), ai_profile:posted_as_ai_profile_id(username)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('video_unlocks').select('video_id').eq('user_id', userId),
    ])
    setAllVideos(all || [])
    setMyVideos(mine || [])
    setUnlockedIds(new Set((unlocks || []).map((u) => u.video_id)))
    setLoading(false)
  }

  useEffect(() => {
    loadVideos()
    supabase
      .from('users')
      .select('is_streamer')
      .eq('id', userId)
      .single()
      .then(({ data }) => setIsCreator(!!data?.is_streamer))
  }, [userId])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const canWatchFree = (video: VideoRow) =>
    video.user_id === userId || video.price_tokens === 0 || unlockedIds.has(video.id)

  const handleCardClick = async (video: VideoRow) => {
    setError('')
    if (!video.video_path && !video.mux_playback_id) {
      setError('This video has no file attached yet.')
      return
    }
    if (!canWatchFree(video)) {
      setUnlockTarget(video)
      return
    }
    if (video.mux_playback_id) {
      setPlayingVideo({ row: video, url: `https://stream.mux.com/${video.mux_playback_id}.m3u8` })
      return
    }
    const { data, error: signError } = await supabase.storage
      .from('paid-videos')
      .createSignedUrl(video.video_path!, 3600)
    if (signError || !data) {
      setError(signError?.message || 'Could not load this video')
      return
    }
    setPlayingVideo({ row: video, url: data.signedUrl })
  }

  const confirmUnlock = async () => {
    if (!unlockTarget) return
    setError('')
    const rpcName = unlockTarget.is_private_show_recording ? 'unlock_private_recording' : 'unlock_video'
    const { data, error: rpcError } = await supabase.rpc(rpcName, { p_video_id: unlockTarget.id })

    if (rpcError) {
      if (rpcError.message.includes('Insufficient token balance')) {
        setUnlockOutOfTokens(unlockTarget)
        setUnlockTarget(null)
        return
      }
      setError(rpcError.message)
      setUnlockTarget(null)
      return
    }

    setUnlockedIds((prev) => new Set(prev).add(unlockTarget.id))
    const video = unlockTarget
    setUnlockTarget(null)

    if (video.mux_playback_id) {
      setPlayingVideo({ row: video, url: `https://stream.mux.com/${video.mux_playback_id}.m3u8` })
      return
    }
    const { data: signed } = await supabase.storage.from('paid-videos').createSignedUrl(video.video_path!, 3600)
    if (signed) setPlayingVideo({ row: video, url: signed.signedUrl })
  }

  const deleteVideo = async (video: VideoRow) => {
    if (!confirm(`Delete "${video.title}"? This can't be undone.`)) return
    if (video.video_path) {
      await supabase.storage.from('paid-videos').remove([video.video_path])
    }
    await supabase.from('vod_library').delete().eq('id', video.id)
    loadVideos()
  }

  const videos = tab === 'all' ? allVideos : myVideos

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Video Library
          </h1>
          {isCreator && (
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white px-4 py-2 rounded font-semibold flex items-center gap-2 transition"
            >
              <Upload size={18} /> Upload Video
            </button>
          )}
        </div>
        <p className="text-gray-400 mb-6">Browse videos or manage your own uploads</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>
        )}

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('all')}
            className={`px-5 py-2 rounded-full font-semibold transition ${
              tab === 'all' ? 'bg-gradient-to-r from-pink-600 to-cyan-600 text-white' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            All Videos
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-5 py-2 rounded-full font-semibold transition ${
              tab === 'mine' ? 'bg-gradient-to-r from-pink-600 to-cyan-600 text-white' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            My Videos
          </button>
          <button
            onClick={() => setTab('tag')}
            className={`px-5 py-2 rounded-full font-semibold transition ${
              tab === 'tag' ? 'bg-gradient-to-r from-pink-600 to-cyan-600 text-white' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            💰 Tag & Earn
          </button>
        </div>

        {tab === 'tag' ? (
          <TagAndEarn userId={userId} />
        ) : loading ? (
          <div className="text-center py-12 text-gray-400">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">No videos yet</div>
            <p className="text-sm text-gray-500">
              {tab === 'mine' ? 'Upload your first video to get started' : 'Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => {
              const locked = !canWatchFree(video)
              return (
                <div
                  key={video.id}
                  className="bg-gray-900 border border-gray-800 hover:border-cyan-500/50 rounded-lg overflow-hidden group transition"
                >
                  <div
                    onClick={() => handleCardClick(video)}
                    className="relative bg-gray-800 aspect-video flex items-center justify-center cursor-pointer"
                  >
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="text-4xl opacity-50">📹</div>
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition flex items-center justify-center">
                      {locked ? (
                        <Lock size={40} className="text-white opacity-90" />
                      ) : (
                        <Play size={48} className="text-white opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </div>
                    {video.duration_seconds ? (
                      <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-semibold">
                        {formatDuration(video.duration_seconds)}
                      </div>
                    ) : null}
                    {video.price_tokens > 0 && (
                      <div className="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded text-xs font-bold">
                        {video.price_tokens} tokens
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold mb-1 group-hover:text-cyan-400 transition truncate">
                      {video.title}
                    </h3>
                    {tab === 'all' && (video.ai_profile?.username || video.users?.username) && (
                      <p className="text-xs text-gray-500 mb-2">
                        by {video.ai_profile?.username || video.users?.username}
                        {video.ai_profile && <span className="text-purple-400 ml-1">🤖 AI</span>}
                      </p>
                    )}
                    <div className="flex gap-3 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Eye size={14} />
                        <span>{video.view_count} purchased</span>
                      </div>
                      <div className="text-gray-600">{new Date(video.created_at).toLocaleDateString()}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCardClick(video)}
                        className="flex-1 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white px-3 py-2 rounded text-sm font-semibold flex items-center justify-center gap-1 transition"
                      >
                        {locked ? <Lock size={14} /> : <Play size={14} />}
                        {locked ? `Unlock ${video.price_tokens}` : 'Watch'}
                      </button>
                      {video.user_id === userId && (
                        <button
                          onClick={() => deleteVideo(video)}
                          className="bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-400 px-3 py-2 rounded transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false)
            loadVideos()
          }}
        />
      )}

      {playingVideo && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">{playingVideo.row.title}</h3>
              <button onClick={() => setPlayingVideo(null)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <VideoPlayer url={playingVideo.url} />
            <ContentReviews
              contentType="video"
              contentId={playingVideo.row.id}
              userId={userId}
              canReview={playingVideo.row.user_id === userId || unlockedIds.has(playingVideo.row.id)}
            />
          </div>
        </div>
      )}

      {unlockTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2">Unlock this video?</h2>
            <p className="text-sm text-gray-400 mb-4">
              "{unlockTarget.title}" costs <span className="text-cyan-400 font-semibold">{unlockTarget.price_tokens} tokens</span>.
              This unlocks it permanently for your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnlockTarget(null)}
                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 py-2 rounded font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnlock}
                className="flex-1 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 py-2 rounded font-semibold transition"
              >
                Unlock
              </button>
            </div>
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
              "{buyPromptFor.title}" needs {buyPromptFor.price_tokens} tokens. Grab a package to unlock it.
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
            <button
              onClick={() => setUnlockOutOfTokens(null)}
              className="w-full text-sm text-gray-400 hover:text-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadModal({
  userId,
  onClose,
  onUploaded,
}: {
  userId: string
  onClose: () => void
  onUploaded: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceTokens, setPriceTokens] = useState(0)
  const [isPublic, setIsPublic] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [aiProfile, setAiProfile] = useState<{ id: string; username: string } | null>(null)
  const [postAsAi, setPostAsAi] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('creator_ai_profiles')
      .select('id, username')
      .eq('parent_user_id', userId)
      .maybeSingle()
      .then(({ data }) => setAiProfile(data))
  }, [userId])

  const handleUpload = async () => {
    setError('')
    if (!title.trim()) {
      setError('Give your video a title')
      return
    }
    if (!file) {
      setError('Choose a video file')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('Video must be under 500MB')
      return
    }

    setUploading(true)
    try {
      // Create the row first so we have a stable id to namespace the
      // storage path under (storage RLS keys off this folder name).
      const { data: row, error: insertError } = await supabase
        .from('vod_library')
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          price_tokens: priceTokens,
          is_public: isPublic,
          posted_as_ai_profile_id: postAsAi && aiProfile ? aiProfile.id : null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const ext = file.name.split('.').pop()
      const path = `${row.id}/video.${ext}`

      const { error: uploadError } = await supabase.storage.from('paid-videos').upload(path, file)
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('vod_library')
        .update({ video_path: path })
        .eq('id', row.id)
      if (updateError) throw updateError

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
          <h2 className="text-xl font-bold">Upload Video</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
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
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Show in the public "All Videos" feed
          </label>
          {aiProfile && (
            <label className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded px-3 py-2">
              <input type="checkbox" checked={postAsAi} onChange={(e) => setPostAsAi(e.target.checked)} />
              Post as {aiProfile.username} (AI persona) instead of my own name
            </label>
          )}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Video file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-800 border border-gray-700 hover:border-cyan-500 rounded px-3 py-2 text-left text-sm text-gray-300 transition"
            >
              {file ? file.name : 'Choose file (max 500MB)'}
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 disabled:opacity-50 text-white py-2 rounded font-semibold transition flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : null}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VideoPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (url.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(video)
        return () => hls.destroy()
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url // Safari/iOS native HLS support
      }
    } else {
      video.src = url
    }
  }, [url])

  return <video ref={videoRef} controls autoPlay className="w-full rounded-lg bg-black" />
}
