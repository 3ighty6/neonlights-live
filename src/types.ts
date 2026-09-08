import { Session } from '@supabase/supabase-js'

export interface User {
  id: string
  username: string
  email: string
  avatar_url: string | null
  bio: string | null
  is_streamer: boolean
  token_balance: number
  total_earnings: number
  is_verified: boolean
  is_admin: boolean
  followers_count: number
  following_count: number
  view_count: number
  last_login: string | null
  is_ai_creator?: boolean
  price_per_minute_tokens?: number | null
  id_verification_status?: string | null
  ai_disclosure?: string | null
  referral_code?: string | null
  referred_by?: string | null
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  streamer_id: string
  title: string
  description: string | null
  is_live: boolean
  viewer_count: number
  category_id: string | null
  rtmp_key: string | null
  hls_url: string | null
  thumbnail_url: string | null
  total_tips: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
  user?: User
}

export interface Tip {
  id: string
  room_id: string | null
  sender_id: string
  receiver_id: string
  amount: number
  message: string | null
  created_at: string
}

export interface AppSession extends Session {
  user: Session['user']
}
