import { getScenario } from '../data/scenarios.ts'
import type { PracticeHistory, PracticeSession } from './practiceHistory.ts'
import { fetchPracticeHistory, updatePracticeShareStateDb } from './practiceHistory.ts'
import { loadPracticeAutoShareConsent, type PracticeAutoShareConsent } from './userPreferences.ts'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient.ts'
import type { ScenarioRuntime } from '../types/practice.ts'
import type { VehicleState } from './vehiclePhysics.ts'

export type PublicLearningCasePayload = {
  clientShareId: string
  nickname: string
  completedDate: string
  consent: PracticeAutoShareConsent
  scenarioId: PracticeSession['scenarioId']
  scenarioTitle: string
  practiceType: '직접 연습' | '판단 연습'
  outcome: '안전 완료' | '복기 필요'
  collisionCount: number
  collisionZones: string[]
  quiz?: { score: number; total: number }
  learningPoints: string[]
  runtime?: ScenarioRuntime
  vehicleSnapshot?: VehicleState
}

export interface PracticeSharingGateway {
  publish(payload: PublicLearningCasePayload): Promise<{ publicCaseId: string }>
  unpublish(clientShareId: string, publicCaseId?: string): Promise<void>
  unpublishAll(): Promise<void>
  updateNickname(nickname: string): Promise<void>
}

export function buildPublicLearningCase(
  session: PracticeSession,
  nickname: string,
  consent: PracticeAutoShareConsent,
): PublicLearningCasePayload {
  if (!session.shareClientId) throw new Error('practice-sharing:missing-client-share-id')
  return {
    clientShareId: session.shareClientId,
    nickname: nickname.trim().slice(0, 40),
    completedDate: session.completedAt.slice(0, 10),
    consent,
    scenarioId: session.scenarioId,
    scenarioTitle: getScenario(session.scenarioId).title,
    practiceType: session.mode === 'practice' ? '판단 연습' : '직접 연습',
    outcome: session.success && session.collisionCount === 0 ? '안전 완료' : '복기 필요',
    collisionCount: session.collisionCount,
    collisionZones: session.collisionZones,
    quiz: typeof session.quizScore === 'number' && typeof session.quizTotal === 'number'
      ? { score: session.quizScore, total: session.quizTotal }
      : undefined,
    learningPoints: [...new Set(session.correctionAttempts?.map((attempt) => attempt.takeaway) ?? [])].slice(0, 5),
    runtime: session.runtime,
    vehicleSnapshot: session.moments?.at(-1)?.vehicle ?? session.correctionAttempts?.at(-1)?.reviewSnapshot?.firstChoice?.previewStates?.at(-1),
  }
}

export function createHttpPracticeSharingGateway({
  baseUrl,
  getAccessToken,
  request = fetch,
}: {
  baseUrl: string
  getAccessToken?: () => string | null | Promise<string | null>
  request?: typeof fetch
}): PracticeSharingGateway {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const parsedBaseUrl = new URL(normalizedBaseUrl, typeof location === 'undefined' ? 'https://localhost' : location.origin)
  const isLocal = parsedBaseUrl.hostname === 'localhost' || parsedBaseUrl.hostname === '127.0.0.1'
  if (parsedBaseUrl.protocol !== 'https:' && !isLocal) throw new Error('practice-sharing:https-required')
  let anonymousCsrfToken: Promise<string> | null = null

  const anonymousSession = () => {
    anonymousCsrfToken ??= request(`${normalizedBaseUrl}/learning-cases/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`practice-sharing:session:${response.status}`)
        const body = await response.json() as { csrfToken?: unknown }
        if (typeof body.csrfToken !== 'string' || body.csrfToken.length < 16) throw new Error('practice-sharing:invalid-csrf-token')
        return body.csrfToken
      })
      .catch((error) => {
        anonymousCsrfToken = null
        throw error
      })
    return anonymousCsrfToken
  }

  const call = async (path: string, init: RequestInit) => {
    const token = await getAccessToken?.()
    const csrfToken = token ? null : await anonymousSession()
    const response = await request(`${normalizedBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...init.headers,
      },
    })
    if (!response.ok) {
      if (!token && (response.status === 401 || response.status === 403)) anonymousCsrfToken = null
      throw new Error(`practice-sharing:${response.status}`)
    }
    return response
  }

  return {
    async publish(payload) {
      const response = await call('/learning-cases', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotency-Key': payload.clientShareId },
      })
      const body = await response.json() as { id?: unknown }
      if (typeof body.id !== 'string') throw new Error('practice-sharing:invalid-response')
      return { publicCaseId: body.id }
    },
    async unpublish(clientShareId, publicCaseId) {
      const target = publicCaseId
        ? `/learning-cases/${encodeURIComponent(publicCaseId)}`
        : `/learning-cases/by-client-id/${encodeURIComponent(clientShareId)}`
      await call(target, { method: 'DELETE' })
    },
    async unpublishAll() {
      await call('/learning-cases', { method: 'DELETE' })
    },
    async updateNickname(nickname) {
      await call('/learning-cases/profile', { method: 'PATCH', body: JSON.stringify({ nickname }) })
    },
  }
}

export function createSupabasePracticeSharingGateway(client: SupabaseClient): PracticeSharingGateway {
  const requireUser = async () => {
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) throw new Error('practice-sharing:login-required')
    return data.user
  }

  return {
    async publish(payload) {
      await requireUser()
      const record = {
        client_share_id: payload.clientShareId,
        nickname: payload.nickname,
        completed_date: payload.completedDate,
        consent_version: payload.consent.version,
        consent_accepted_at: payload.consent.acceptedAt,
        scenario_id: payload.scenarioId,
        scenario_title: payload.scenarioTitle,
        practice_type: payload.practiceType,
        outcome: payload.outcome,
        collision_count: payload.collisionCount,
        collision_zones: payload.collisionZones,
        quiz_score: payload.quiz?.score,
        quiz_total: payload.quiz?.total,
        learning_points: payload.learningPoints,
      }
      const rpcResult = await client.rpc('publish_learning_case', { payload: record })
      if (!rpcResult.error && typeof rpcResult.data === 'string') {
        return { publicCaseId: rpcResult.data }
      }
      if (!['PGRST202', '42883'].includes(rpcResult.error?.code ?? '')) {
        throw new Error(`practice-sharing:supabase:${rpcResult.error?.code ?? 'invalid-response'}`)
      }

      const { data, error } = await client
        .from('learning_cases')
        .insert(record)
        .select('id')
        .single()
      if (error || typeof data?.id !== 'string') throw new Error(`practice-sharing:supabase:${error?.code ?? 'invalid-response'}`)
      return { publicCaseId: data.id }
    },
    async unpublish(clientShareId, publicCaseId) {
      await requireUser()
      const query = client.from('learning_cases').delete()
      const { error } = publicCaseId
        ? await query.eq('id', publicCaseId)
        : await query.eq('client_share_id', clientShareId)
      if (error) throw new Error(`practice-sharing:supabase:${error.code}`)
    },
    async unpublishAll() {
      await requireUser()
      const { error } = await client.from('learning_cases').delete().not('id', 'is', null)
      if (error) throw new Error(`practice-sharing:supabase:${error.code}`)
    },
    async updateNickname(nickname) {
      await requireUser()
      const { error } = await client.from('learning_cases').update({ nickname: nickname.trim().slice(0, 40) }).not('id', 'is', null)
      if (error) throw new Error(`practice-sharing:supabase:${error.code}`)
    },
  }
}

const configuredSharingBaseUrl = typeof import.meta.env === 'object'
  ? import.meta.env.VITE_PRACTICE_SHARING_API_URL as string | undefined
  : undefined

export const configuredPracticeSharingGateway = configuredSharingBaseUrl
  ? createHttpPracticeSharingGateway({ baseUrl: configuredSharingBaseUrl })
  : supabase
    ? createSupabasePracticeSharingGateway(supabase)
    : null

export async function syncPracticeSharing(
  history: PracticeHistory,
  nickname: string,
  gateway: PracticeSharingGateway,
  storage?: Storage | null,
) {
  const consent = loadPracticeAutoShareConsent(storage)
  for (const session of history.sessions) {
    try {
      if (session.shareStatus === 'pending') {
        if (!consent) throw new Error('practice-sharing:consent-required')
        const { publicCaseId } = await gateway.publish(buildPublicLearningCase(session, nickname, consent))
        await updatePracticeShareStateDb(session.id, { shareStatus: 'shared', publicCaseId })
      } else if (session.shareStatus === 'unpublishing') {
        if (!session.shareClientId) throw new Error('practice-sharing:missing-client-share-id')
        await gateway.unpublish(session.shareClientId, session.publicCaseId)
        await updatePracticeShareStateDb(session.id, { shareStatus: 'private' })
      }
    } catch (error) {
      await updatePracticeShareStateDb(session.id, {
        shareStatus: session.bookmarked ? 'publish-failed' : 'unpublish-failed',
        shareError: error instanceof Error ? error.message : 'practice-sharing:unknown',
      })
    }
  }
  return await fetchPracticeHistory()
}

export async function unpublishAllPracticeCases(gateway: PracticeSharingGateway) {
  await gateway.unpublishAll()
}
