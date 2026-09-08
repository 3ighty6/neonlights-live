/**
 * AI CREATOR SYSTEM
 * - Detect and label AI-generated content
 * - Full disclosure to viewers
 * - AI creators can still earn and interact normally
 * - Viewers understand they're engaging with AI but can still tip/support
 * - Platform neutral stance: Enable both human and AI creators
 */

import { supabase } from '../supabaseClient'

// ============================================
// AI CREATOR TYPES
// ============================================

export type AICreatorType =
  | 'deepfake_face_swap'
  | 'text_to_avatar'
  | 'vtuber_generated'
  | 'voice_synthesis'
  | 'full_ai_generated'
  | 'hybrid_human_ai'
  | 'unknown'

export interface AICreatorProfile {
  userId: string
  isAiCreated: boolean
  aiCreatorType: AICreatorType
  aiModelsUsed: string[] // e.g., ['Synthesia', 'Descript', 'D-ID']
  trainingDataSource?: string
  humanPartner?: string // If hybrid, who's behind the AI
  disclosureText: string
  verifiedAI: boolean // Platform verified this is truly AI
  createdAt: Date
  updatedAt: Date
}

// ============================================
// AI CREATOR REGISTRATION
// ============================================

export async function registerAICreator(
  userId: string,
  profile: {
    aiCreatorType: AICreatorType
    aiModelsUsed: string[]
    trainingDataSource?: string
    humanPartner?: string
    disclosureText: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    // Create AI creator profile
    const { error: createError } = await supabase
      .from('ai_creator_profiles')
      .insert({
        user_id: userId,
        is_ai_created: true,
        ai_creator_type: profile.aiCreatorType,
        ai_models_used: profile.aiModelsUsed,
        training_data_source: profile.trainingDataSource,
        human_partner: profile.humanPartner,
        disclosure_text: profile.disclosureText,
        verified_ai: false, // Requires manual verification
      })

    if (createError) throw createError

    // Update user profile with AI badge
    await supabase
      .from('users')
      .update({ is_ai_creator: true })
      .eq('id', userId)

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ============================================
// AI VERIFICATION SYSTEM (Admin)
// ============================================

export async function verifyAICreator(
  userId: string,
  verified: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('ai_creator_profiles')
      .update({
        verified_ai: verified,
        verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ============================================
// AI CONTENT DETECTION (User-Declared)
// ============================================

export interface AIDeclaredContent {
  contentId: string
  contentType: 'video' | 'stream' | 'image' | 'audio'
  creatorId: string
  isAiGenerated: boolean
  aiGenerationMethod?: string
  humanInputPercentage?: number // 0-100%
  disclosureShown: boolean
  createdAt: Date
}

export async function declareAIContent(
  contentId: string,
  contentType: 'video' | 'stream' | 'image' | 'audio',
  creatorId: string,
  details: {
    isAiGenerated: boolean
    aiGenerationMethod?: string
    humanInputPercentage?: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('ai_content_declarations')
      .insert({
        content_id: contentId,
        content_type: contentType,
        creator_id: creatorId,
        is_ai_generated: details.isAiGenerated,
        ai_generation_method: details.aiGenerationMethod,
        human_input_percentage: details.humanInputPercentage,
        disclosure_shown: true,
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ============================================
// VIEWER-FACING AI DISCLOSURE BADGE
// ============================================

export interface AIDisclosureProps {
  isAI: boolean
  aiType?: AICreatorType
  disclosure?: string
  className?: string
}

/**
 * Component to show in React:
 *
 * export function AIDisclosure({ isAI, aiType, disclosure }: AIDisclosureProps) {
 *   if (!isAI) return null;
 *   
 *   return (
 *     <div className="bg-purple-900 border-2 border-purple-500 rounded-lg p-4 mb-4">
 *       <div className="flex items-center gap-2 mb-2">
 *         <span className="text-2xl">🤖</span>
 *         <h3 className="text-xl font-bold text-white">AI-Generated Creator</h3>
 *       </div>
 *       
 *       <p className="text-gray-300 mb-3">
 *         This is an AI-generated creator. While this model isn't real, you can still
 *         tip, subscribe, and interact normally. Enjoy the experience!
 *       </p>
 *       
 *       {aiType && (
 *         <p className="text-sm text-purple-300 mb-2">
 *           <strong>Type:</strong> {aiType.replace(/_/g, ' ').toUpperCase()}
 *         </p>
 *       )}
 *       
 *       {disclosure && (
 *         <div className="text-sm text-gray-400 bg-black bg-opacity-30 p-2 rounded">
 *           {disclosure}
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 */

// ============================================
// EARNINGS FOR AI CREATORS
// ============================================

/**
 * AI CREATORS CAN EARN FROM:
 * 1. Tips (cash or tokens) - Full amount goes to AI creator account
 * 2. Subscriptions - Recurring revenue
 * 3. Video sales - VOD monetization
 * 4. PPV live events - Premium content
 * 5. Referral bonuses - If their content drives signups
 *
 * Payouts handled same as human creators via Paxum
 * (If AI creator is partnered with human operator)
 */

export async function setupAICreatorPayouts(
  userId: string,
  paxumEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Link Paxum payout email to AI creator account
    const { error } = await supabase
      .from('users')
      .update({ paxum_email: paxumEmail })
      .eq('id', userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ============================================
// PLATFORM POLICY ON AI CREATORS
// ============================================

/*
NEONLIGHTS.CAM AI CREATOR POLICY:

✅ ALLOWED:
- AI-generated avatars (VTubers, Synthesia, D-ID, etc.)
- Deepfake/Face-swap content (with disclosure)
- Voice synthesis/AI voices
- AI video generation
- Hybrid human+AI creators
- AI operators controlling AI models

❌ PROHIBITED:
- Non-disclosed AI content (must disclose)
- Impersonation of real people (without consent)
- CSAM or illegal content (applies to all creators)
- Deceptive misrepresentation

📋 REQUIREMENTS FOR AI CREATORS:
1. Must declare content is AI-generated
2. Must explain AI type/method
3. Badge shown on profile automatically
4. Viewers see clear AI disclosure
5. Cannot claim to be human
6. Must comply with consent laws (if based on real person)

💰 AI CREATORS EARN EQUALLY:
- Same tip split as human creators (15% model tokens)
- Same subscription rates
- Same VOD revenue share
- Same referral bonuses
- Same platform fees apply

🎯 NEONLIGHTS PHILOSOPHY:
We believe in creator freedom. If you're AI, be honest about it.
Viewers WANT to support AI creators - they're interested in the tech,
the creativity of the operator, and the entertainment value.
Full transparency builds trust and long-term success.
*/

// ============================================
// DATABASE SCHEMA
// ============================================

/*
Run in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS ai_creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_ai_created BOOLEAN DEFAULT FALSE,
  ai_creator_type VARCHAR(50),
  ai_models_used TEXT[],
  training_data_source TEXT,
  human_partner UUID REFERENCES users(id),
  disclosure_text TEXT,
  verified_ai BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_content_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type VARCHAR(50),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_ai_generated BOOLEAN,
  ai_generation_method TEXT,
  human_input_percentage INTEGER,
  disclosure_shown BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add to users table:
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ai_creator BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_disclosure TEXT;

CREATE INDEX idx_ai_creators ON users(is_ai_creator);
CREATE INDEX idx_ai_profiles ON ai_creator_profiles(user_id);
*/

export default {
  registerAICreator,
  verifyAICreator,
  declareAIContent,
  setupAICreatorPayouts,
}
