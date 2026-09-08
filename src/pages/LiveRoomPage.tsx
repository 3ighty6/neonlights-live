import { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import Hls from 'hls.js'
import { supabase } from '../supabaseClient'
import { TOKEN_PACKAGES, createTokenCheckout } from '../lib/payments'
import { Heart, HeartOff, Users, Share2, ArrowLeft, ShoppingCart, Flag, X } from 'lucide-react'
import RoomChat from '../components/RoomChat'

interface LiveRoomPageProps {
  session: Session
  roomId: string
  onBack?: () => void
  onOpenCreator?: (creatorId: string) => void
}

interface RoomInfo {
  id: string
  title: string
  streamer_id: string
  hls_url: string | null
  is_live: boolean
  viewer_count: number
  users?: { username: string; is_ai_creator?: boolean; price_per_minute_tokens?: number | null }
}

export default function LiveRoomPage({ session, roomId, onBack, onOpenCreator }: LiveRoomPageProps) {
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [tips, setTips] = useState<{ amount: number }[]>([])
  const [tipError, setTipError] = useState('')
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)
  const [tipping, setTipping] = useState(false)
  const [customTipAmount, setCustomTipAmount] = useState('')
  const [showPrivateShowModal, setShowPrivateShowModal] = useState(false)
  const [privateShowOffer, setPrivateShowOffer] = useState('200')
  const [privateShowRequestSent, setPrivateShowRequestSent] = useState(false)
  const [privateShowError, setPrivateShowError] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showBuyPrompt, setShowBuyPrompt] = useState(false)
  const [buyLoading, setBuyLoading] = useState<number | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [tipMenu, setTipMenu] = useState<{ amount: number; emoji: string; label: string }[]>([
    { amount: 1, emoji: '💬', label: 'Say Hi' },
    { amount: 5, emoji: '👋', label: 'Wave' },
    { amount: 10, emoji: '🎁', label: 'Gift' },
    { amount: 25, emoji: '❤️', label: 'Love' },
    { amount: 50, emoji: '🔥', label: 'Fire' },
  ])

  useEffect(() => {
    const loadBalance = async () => {
      const { data } = await supabase.from('users').select('token_balance').eq('id', session.user.id).single()
      setTokenBalance(data?.token_balance ?? 0)
    }
    loadBalance()
  }, [session.user.id])

  // Load room info
  useEffect(() => {
    const loadRoom = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('id, title, streamer_id, hls_url, is_live, viewer_count, users:streamer_id(username, is_ai_creator, price_per_minute_tokens)')
        .eq('id', roomId)
        .single()
      if (data) {
        setRoom(data as unknown as RoomInfo)
        const { data: followRow } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('streamer_id', data.streamer_id)
          .maybeSingle()
        setIsFollowing(!!followRow)

        const { data: menuItems } = await supabase
          .from('tip_menu_items')
          .select('amount_tokens, emoji, label')
          .eq('user_id', data.streamer_id)
          .order('sort_order')
        if (menuItems && menuItems.length > 0) {
          setTipMenu(menuItems.map((m) => ({ amount: m.amount_tokens, emoji: m.emoji, label: m.label })))
        }
      }
    }
    loadRoom()
  }, [roomId, session.user.id])

  const toggleFollow = async () => {
    if (!room) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('streamer_id', room.streamer_id)
      setIsFollowing(false)
    } else {
      await supabase
        .from('followers')
        .insert({ follower_id: session.user.id, streamer_id: room.streamer_id })
      setIsFollowing(true)
    }
    setFollowLoading(false)
  }

  const submitReport = async () => {
    if (!room || !reportReason) return
    setReportSubmitting(true)
    const { error: reportError } = await supabase.from('reports').insert({
      reporter_id: session.user.id,
      reported_user_id: room.streamer_id,
      room_id: roomId,
      reason: reportReason,
      details: reportDetails.trim() || null,
    })
    setReportSubmitting(false)
    if (!reportError) {
      setReportSubmitted(true)
      setTimeout(() => {
        setShowReportModal(false)
        setReportSubmitted(false)
        setReportReason('')
        setReportDetails('')
      }, 1500)
    }
  }

  const requestPrivateShow = async () => {
    setPrivateShowError('')
    if (!room) return
    const amt = parseInt(privateShowOffer, 10)
    if (!amt || amt <= 0) {
      setPrivateShowError('Enter a token amount')
      return
    }
    const { error: insertError } = await supabase.from('private_show_requests').insert({
      room_id: roomId,
      requester_id: session.user.id,
      streamer_id: room.streamer_id,
      offered_tokens: amt,
    })
    if (insertError) {
      setPrivateShowError(insertError.message)
      return
    }
    setPrivateShowRequestSent(true)
    setShowPrivateShowModal(false)
  }

  const handleBuyTokens = async (packageIndex: number) => {
    setBuyLoading(packageIndex)
    try {
      const { url } = await createTokenCheckout(session.user.id, packageIndex, roomId)
      if (url) window.location.href = url
    } catch (err) {
      setTipError(err instanceof Error ? err.message : 'Failed to start checkout')
      setBuyLoading(null)
    }
  }

  // Wire up HLS playback once we know the playback URL
  useEffect(() => {
    const video = videoRef.current
    if (!video || !room?.hls_url) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(room.hls_url)
      hls.attachMedia(video)
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari/iOS supports HLS natively
      video.src = room.hls_url
    }
  }, [room?.hls_url])

  // Real viewer count via Supabase Realtime Presence -- previously
  // rooms.viewer_count was read everywhere but written nowhere, so
  // it always showed 0. Every connected viewer tracks their own
  // presence; on sync, whoever's client processes it writes the
  // count via an RPC (RLS otherwise only lets the room owner write
  // to rooms, so a plain update from a viewer would be rejected).
  useEffect(() => {
    const presenceChannel = supabase.channel(`presence:room:${roomId}`, {
      config: { presence: { key: session.user.id } },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(presenceChannel.presenceState()).length
        setRoom((prev) => (prev ? { ...prev, viewer_count: count } : prev))
        supabase.rpc('update_room_viewer_count', { p_room_id: roomId, p_count: count })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [roomId, session.user.id])

  const sendTip = async (amount: number) => {
    setTipError('')
    if (!room) return
    if (room.streamer_id === session.user.id) {
      setTipError("You can't tip your own stream")
      return
    }
    if (tokenBalance !== null && tokenBalance < amount) {
      setShowBuyPrompt(true)
      return
    }

    setTipping(true)
    const { data, error } = await supabase.rpc('send_room_tip', {
      p_room_id: roomId,
      p_amount: amount,
    })
    setTipping(false)

    if (error) {
      if (error.message.includes('Insufficient token balance')) {
        setShowBuyPrompt(true)
        return
      }
      setTipError(error.message)
      return
    }

    setTokenBalance(data?.newBalance ?? tokenBalance)
    setTips((prev) => [...prev, { amount }])
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Video Player */}
      <div className="flex-1 bg-gray-900 relative overflow-hidden">
        {room?.hls_url ? (
          <video ref={videoRef} controls autoPlay muted className="w-full h-full object-contain bg-black" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎥</div>
              <div className="text-gray-400">
                {room?.is_live ? 'Waiting for stream to connect...' : 'Stream is offline'}
              </div>
            </div>
          </div>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 bg-black/70 hover:bg-black/90 p-2 rounded-lg text-white flex items-center gap-2 px-3"
          >
            <ArrowLeft size={18} /> Back
          </button>
        )}

        <div className="absolute top-4 right-4 flex gap-4 items-center">
          <div className="bg-black/70 px-4 py-2 rounded-lg flex gap-4">
            <div className="flex items-center gap-2 text-white">
              <Users size={16} />
              <span>{room?.viewer_count ?? 0} viewers</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-400">
              <Heart size={16} />
              <span>{tips.length} tips</span>
            </div>
          </div>
          {room && room.streamer_id !== session.user.id && (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 disabled:opacity-50 ${
                isFollowing
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-pink-500 text-white hover:bg-pink-600'
              }`}
            >
              {isFollowing ? <HeartOff size={16} /> : <Heart size={16} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
          <button className="bg-cyan-500/20 hover:bg-cyan-500/40 p-2 rounded-lg text-cyan-400">
            <Share2 size={20} />
          </button>
          {room && room.streamer_id !== session.user.id && (
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-red-500/20 hover:bg-red-500/40 p-2 rounded-lg text-red-400"
              title="Report this stream"
            >
              <Flag size={20} />
            </button>
          )}
        </div>

        {room?.title && (
          <div className="absolute bottom-4 left-4 bg-black/70 px-4 py-2 rounded-lg text-white">
            <div className="font-semibold">{room.title}</div>
            {room.users?.username && (
              <button
                onClick={() => onOpenCreator?.(room.streamer_id)}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1.5"
              >
                {room.users.username}
                {room.users.is_ai_creator && (
                  <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">AI</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat & Tips Section */}
      <div className="h-80 bg-gray-950 border-t border-cyan-500/20 flex flex-col md:flex-row">
        <div className="flex-1 border-r border-cyan-500/20">
          <RoomChat session={session} roomId={roomId} streamerId={room?.streamer_id} compact />
        </div>

        <div className="w-full md:w-48 p-3 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-gray-800">
          <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Quick Tips</div>
          {tokenBalance !== null && (
            <div className="text-xs text-cyan-400 mb-2">Balance: {tokenBalance} tokens</div>
          )}
          {tipError && <div className="text-xs text-red-400 mb-1">{tipError}</div>}
          {tipMenu.map((tip) => (
            <button
              key={tip.amount}
              onClick={() => sendTip(tip.amount)}
              disabled={tipping}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>{tip.emoji}</span>
              <span>{tip.amount} tokens</span>
            </button>
          ))}

          <div className="border-t border-gray-800 pt-2 mt-1">
            <div className="text-xs text-gray-500 mb-1.5">Custom amount</div>
            <div className="flex gap-1">
              <input
                type="number"
                min={1}
                value={customTipAmount}
                onChange={(e) => setCustomTipAmount(e.target.value)}
                placeholder="Tokens"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
              />
              <button
                onClick={() => {
                  const amt = parseInt(customTipAmount, 10)
                  if (amt > 0) {
                    sendTip(amt)
                    setCustomTipAmount('')
                  }
                }}
                disabled={tipping || !customTipAmount || parseInt(customTipAmount, 10) <= 0}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm font-semibold transition"
              >
                Send
              </button>
            </div>
          </div>

          {room && room.streamer_id !== session.user.id && !privateShowRequestSent && (
            <div className="border-t border-gray-800 pt-2 mt-1">
              <button
                onClick={() => setShowPrivateShowModal(true)}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white px-3 py-2 rounded text-sm font-semibold transition"
              >
                🔒 Request Private Show
              </button>
            </div>
          )}
          {privateShowRequestSent && (
            <div className="border-t border-gray-800 pt-2 mt-1 text-xs text-yellow-400 text-center">
              Request sent — waiting for response
            </div>
          )}
        </div>
      </div>

      {/* Buy Tokens popup — shown when a tip fails for insufficient balance */}
      {showBuyPrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="text-cyan-400" size={22} />
              <h2 className="text-lg font-bold">Not enough tokens</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              You have {tokenBalance ?? 0} tokens. Grab a package to keep tipping.
            </p>

            <div className="space-y-2 mb-4">
              {TOKEN_PACKAGES.map((pkg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleBuyTokens(idx)}
                  disabled={buyLoading !== null}
                  className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 rounded px-4 py-3 transition"
                >
                  <span className="text-sm">
                    <span className="font-semibold text-cyan-400">{pkg.tokens} tokens</span>
                    {pkg.popular && <span className="ml-2 text-xs text-cyan-500">POPULAR</span>}
                  </span>
                  <span className="font-semibold">
                    {buyLoading === idx ? '...' : `$${pkg.priceUSD.toFixed(2)}`}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowBuyPrompt(false)}
              disabled={buyLoading !== null}
              className="w-full text-sm text-gray-400 hover:text-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showPrivateShowModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-pink-500/30 rounded-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-2">Request a Private Show</h2>
            <p className="text-sm text-gray-400 mb-4">
              Offer tokens for an exclusive session. The creator can accept or decline — you're only charged if they accept.
            </p>
            {room?.users?.price_per_minute_tokens && (
              <p className="text-xs text-pink-300 mb-4">
                Reference rate: {room.users.price_per_minute_tokens} tokens/min
              </p>
            )}
            {privateShowError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">{privateShowError}</div>
            )}
            <label className="text-sm text-gray-400 block mb-1">Offer (tokens)</label>
            <input
              type="number"
              min={1}
              value={privateShowOffer}
              onChange={(e) => setPrivateShowOffer(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPrivateShowModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 py-2 rounded font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={requestPrivateShow}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 py-2 rounded font-semibold transition"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="text-red-400" size={20} />
                <h2 className="text-lg font-bold">Report this stream</h2>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="text-center py-6 text-green-400">Report submitted. Thank you.</div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {['Underage concern', 'Non-consensual content', 'Harassment', 'Spam or scam', 'Other'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                        reportReason === reason
                          ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                          : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-4"
                />
                <button
                  onClick={submitReport}
                  disabled={!reportReason || reportSubmitting}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 shadow-lg shadow-red-500/20 disabled:opacity-50 text-white py-2 rounded font-semibold transition"
                >
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
