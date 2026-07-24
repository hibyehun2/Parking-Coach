import { createClient, type Session, type User } from '@supabase/supabase-js'

const viteEnv: Partial<ImportMetaEnv> = typeof import.meta.env === 'object' ? import.meta.env : {}
const supabaseUrl = viteEnv.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function isSupabaseConfigured() {
  return Boolean(supabase)
}

export async function loadSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function subscribeSupabaseAuth(listener: (user: User | null) => void) {
  if (!supabase) return () => undefined
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session?.user ?? null))
  return () => data.subscription.unsubscribe()
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('supabase:not-configured')
  const redirectTo = new URL(viteEnv.BASE_URL ?? '/', window.location.origin).toString()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })
  if (error) throw error
}

export async function signOutSupabase() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
}

export async function completeSupabaseProfile(nickname: string) {
  if (!supabase) throw new Error('supabase:not-configured')
  const normalized = nickname.trim().slice(0, 40)
  if (!normalized) throw new Error('supabase:invalid-nickname')
  const { data, error } = await supabase.auth.updateUser({
    data: {
      parking_coach_nickname: normalized,
      parking_coach_onboarded: true,
    },
  })
  if (error) throw error
  return data.user
}

export function supabaseProfileNickname(user: User | null) {
  const nickname = user?.user_metadata?.parking_coach_nickname
  return typeof nickname === 'string' && nickname.trim() ? nickname.trim().slice(0, 40) : null
}

export function hasCompletedSupabaseProfile(user: User | null) {
  return user?.user_metadata?.parking_coach_onboarded === true && Boolean(supabaseProfileNickname(user))
}
