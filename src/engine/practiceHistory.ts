import type { ParkingResult } from './parkingEvaluation.ts'
import type { ReplayEvent } from './sessionReplay.ts'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../types/practice.ts'
import { isScenarioAvailable } from '../data/scenarios.ts'
import type { JudgmentChoice, JudgmentScenario, JudgmentSkill } from './judgmentScenarios.ts'
import { supabase } from './supabaseClient.ts'

export const MAX_PRACTICE_SESSIONS = 20
export const MAX_BOOKMARKED_SESSIONS = 3

export type MistakeType = 'collision'
export type PracticeShareStatus = 'private' | 'pending' | 'shared' | 'publish-failed' | 'unpublishing' | 'unpublish-failed'

export type CorrectionAttempt = {
  drillId: string
  drillTitle: string
  stepId: string
  stepTitle: string
  firstTryCorrect: boolean
  firstChoiceLabel: string
  correctChoiceLabel: string
  takeaway: string
  skill?: JudgmentSkill
  reviewSnapshot?: {
    scenario: JudgmentScenario
    firstChoice: JudgmentChoice
    correctChoice: JudgmentChoice
  }
}

export type PracticeSession = {
  id: string
  completedAt: string
  scenarioId: ScenarioId
  mode: PracticeMode
  success: boolean
  collisionCount: number
  collisionTargets: string[]
  collisionZones: string[]
  mistakes: MistakeType[]
  seed?: number
  variant?: ScenarioRuntime['variant']
  runtime?: ScenarioRuntime
  moments?: ReplayEvent[]
  quizScore?: number
  quizTotal?: number
  correctionAttempts?: CorrectionAttempt[]
  bookmarked: boolean
  bookmarkedAt?: string
  shareStatus: PracticeShareStatus
  shareClientId?: string
  shareRequestedAt?: string
  publicCaseId?: string
  shareError?: string
}

export type PracticeHistory = { version: 5; sessions: PracticeSession[] }
export type PracticeTrend = 'insufficient' | 'improving' | 'steady' | 'needs-focus'

const EMPTY_HISTORY: PracticeHistory = { version: 5, sessions: [] }

export function createPracticeShareId(randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  if (randomUUID) return randomUUID()
  return `share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export async function fetchPracticeHistory(): Promise<PracticeHistory> {
  if (!supabase) return EMPTY_HISTORY
  
  const { data: userResp } = await supabase.auth.getUser()
  if (!userResp?.user) return EMPTY_HISTORY

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch practice history:', error)
    return EMPTY_HISTORY
  }

  const sessions: PracticeSession[] = data.map(item => ({
    id: item.id,
    completedAt: item.completed_at,
    scenarioId: item.scenario_id as ScenarioId,
    mode: item.mode as PracticeMode,
    success: item.success,
    collisionCount: item.collision_count,
    collisionTargets: item.collision_targets || [],
    collisionZones: item.collision_zones || [],
    mistakes: item.mistakes || [],
    seed: item.seed,
    variant: item.variant,
    runtime: item.runtime,
    moments: item.moments,
    quizScore: item.quiz_score,
    quizTotal: item.quiz_total,
    correctionAttempts: item.correction_attempts,
    bookmarked: item.bookmarked,
    bookmarkedAt: item.bookmarked_at,
    shareStatus: item.share_status as PracticeShareStatus,
    shareClientId: item.share_client_id,
    shareRequestedAt: item.share_requested_at,
    publicCaseId: item.public_case_id,
    shareError: item.share_error,
  }))

  return { version: 5, sessions }
}

export async function recordPracticeSessionDb(
  result: ParkingResult,
  scenarioId: ScenarioId,
  mode: PracticeMode,
  completedAt = new Date(),
  runtime?: ScenarioRuntime,
  replay: ReplayEvent[] = [],
): Promise<PracticeSession | null> {
  if (!supabase) return null

  const { data: userResp } = await supabase.auth.getUser()
  if (!userResp?.user) return null

  const collisionTargets = result.collisions.map((collision) => collision.obstacleId)
  const collisionZones = result.collisions.flatMap((collision) => collision.contactZone ? [collision.contactZone] : [])
  const moments = replay
    .filter((event) => event.type === 'collision' || (event.type === 'finish' && result.success))
    .slice(-4)
    .map((event) => ({
      ...event,
      clip: event.clip && event.clip.length > 24
        ? event.clip.filter((_, index) => index % Math.ceil(event.clip!.length / 24) === 0).slice(-24)
        : event.clip,
    }))

  const sessionData = {
    id: `${completedAt.getTime()}-${scenarioId}`,
    owner_id: userResp.user.id,
    completed_at: completedAt.toISOString(),
    scenario_id: scenarioId,
    mode,
    success: result.success,
    collision_count: result.collisionCount,
    collision_targets: collisionTargets,
    collision_zones: collisionZones,
    mistakes: result.collisionCount ? ['collision'] : [],
    seed: runtime?.seed,
    variant: runtime?.variant,
    runtime,
    moments,
    bookmarked: false,
    share_status: 'private',
  }

  const { error } = await supabase.from('practice_sessions').insert(sessionData)
  if (error) {
    console.error('Failed to record practice session:', error)
    return null
  }
  
  return {
    ...sessionData,
    completedAt: sessionData.completed_at,
    scenarioId: sessionData.scenario_id as ScenarioId,
    collisionCount: sessionData.collision_count,
    collisionTargets: sessionData.collision_targets,
    collisionZones: sessionData.collision_zones,
    shareStatus: sessionData.share_status as PracticeShareStatus,
    shareClientId: undefined,
    shareRequestedAt: undefined,
    publicCaseId: undefined,
    shareError: undefined,
    bookmarkedAt: undefined,
  }
}

export async function clearPracticeHistoryDb(): Promise<PracticeHistory> {
  if (!supabase) return EMPTY_HISTORY
  
  const { data: userResp } = await supabase.auth.getUser()
  if (!userResp?.user) return EMPTY_HISTORY

  const { error } = await supabase
    .from('practice_sessions')
    .delete()
    .eq('owner_id', userResp.user.id)
    
  if (error) {
    console.error('Failed to clear practice history:', error)
  }
  
  return EMPTY_HISTORY
}

export async function recordCorrectionSessionDb(
  score: number,
  total: number,
  runtime: ScenarioRuntime,
  completedAt = new Date(),
  correctionAttempts: CorrectionAttempt[] = [],
): Promise<PracticeSession | null> {
  if (!supabase) return null

  const { data: userResp } = await supabase.auth.getUser()
  if (!userResp?.user) return null

  const sessionData = {
    id: `${completedAt.getTime()}-correction`,
    owner_id: userResp.user.id,
    completed_at: completedAt.toISOString(),
    scenario_id: runtime.scenarioId,
    mode: 'practice',
    success: score === total,
    collision_count: 0,
    collision_targets: [],
    collision_zones: [],
    mistakes: [],
    seed: runtime.seed,
    variant: runtime.variant,
    runtime,
    quiz_score: score,
    quiz_total: total,
    correction_attempts: correctionAttempts,
    bookmarked: false,
    share_status: 'private',
  }

  const { error } = await supabase.from('practice_sessions').insert(sessionData)
  
  if (error) {
    console.error('Failed to record correction session:', error)
    return null
  }
  
  return {
    ...sessionData,
    completedAt: sessionData.completed_at,
    scenarioId: sessionData.scenario_id as ScenarioId,
    collisionCount: sessionData.collision_count,
    collisionTargets: sessionData.collision_targets,
    collisionZones: sessionData.collision_zones,
    quizScore: sessionData.quiz_score,
    quizTotal: sessionData.quiz_total,
    correctionAttempts: sessionData.correction_attempts,
    shareStatus: sessionData.share_status as PracticeShareStatus,
    shareClientId: undefined,
    shareRequestedAt: undefined,
    publicCaseId: undefined,
    shareError: undefined,
    bookmarkedAt: undefined,
  }
}

export async function togglePracticeBookmarkDb(
  sessionId: string,
  now = new Date(),
  options: { shareWhenAdded?: boolean } = {},
) {
  if (!supabase) return { status: 'not-found' as const }
  
  const history = await fetchPracticeHistory()
  const target = history.sessions.find((session) => session.id === sessionId)
  
  if (!target) return { status: 'not-found' as const }
  
  if (!target.bookmarked && history.sessions.filter((session) => session.bookmarked).length >= MAX_BOOKMARKED_SESSIONS) {
    return { status: 'limit' as const }
  }
  
  const updateData: Record<string, unknown> = {
    bookmarked: !target.bookmarked,
    bookmarked_at: !target.bookmarked ? now.toISOString() : null,
  }
  
  if (!target.bookmarked) {
    updateData.share_status = options.shareWhenAdded ? 'pending' : 'private'
    updateData.share_client_id = options.shareWhenAdded ? target.shareClientId ?? createPracticeShareId() : target.shareClientId
    updateData.share_requested_at = options.shareWhenAdded ? now.toISOString() : null
    updateData.share_error = null
  } else {
    updateData.share_status = target.publicCaseId ? 'unpublishing' : 'private'
    updateData.share_requested_at = target.publicCaseId ? now.toISOString() : null
    updateData.share_error = null
    // share_client_id kept as is if publicCaseId exists
  }

  const { error } = await supabase
    .from('practice_sessions')
    .update(updateData)
    .eq('id', sessionId)
    
  if (error) {
    console.error('Failed to toggle bookmark:', error)
    return { status: 'not-found' as const }
  }
  
  return { status: target.bookmarked ? 'removed' as const : 'added' as const }
}

export async function queueBookmarkedSessionsForSharingDb(now = new Date()) {
  if (!supabase) return
  
  const history = await fetchPracticeHistory()
  const sessionsToUpdate = history.sessions.filter(s => s.bookmarked && s.shareStatus === 'private')
  
  for (const session of sessionsToUpdate) {
    await supabase.from('practice_sessions').update({
      share_status: 'pending',
      share_client_id: session.shareClientId ?? createPracticeShareId(),
      share_requested_at: now.toISOString(),
      share_error: null
    }).eq('id', session.id)
  }
}

export async function updatePracticeShareStateDb(
  sessionId: string,
  update: Pick<PracticeSession, 'shareStatus'> & Partial<Pick<PracticeSession, 'publicCaseId' | 'shareError'>>,
) {
  if (!supabase) return
  
  const { data: session } = await supabase.from('practice_sessions').select('public_case_id, share_client_id').eq('id', sessionId).single()
  if (!session) return
  
  const updateData: Record<string, unknown> = {
    share_status: update.shareStatus,
    public_case_id: update.shareStatus === 'private' ? null : update.publicCaseId ?? session.public_case_id,
    share_client_id: update.shareStatus === 'private' ? null : session.share_client_id,
    share_error: update.shareStatus === 'publish-failed' || update.shareStatus === 'unpublish-failed' ? update.shareError : null,
  }
  
  await supabase.from('practice_sessions').update(updateData).eq('id', sessionId)
}

export async function retryPracticeShareDb(
  sessionId: string,
  now = new Date(),
) {
  if (!supabase) return
  
  const { data: session } = await supabase.from('practice_sessions').select('share_status, bookmarked').eq('id', sessionId).single()
  if (!session) return
  
  if (session.share_status === 'publish-failed' && session.bookmarked) {
    await supabase.from('practice_sessions').update({
      share_status: 'pending',
      share_requested_at: now.toISOString(),
      share_error: null
    }).eq('id', sessionId)
  } else if (session.share_status === 'unpublish-failed' && !session.bookmarked) {
    await supabase.from('practice_sessions').update({
      share_status: 'unpublishing',
      share_requested_at: now.toISOString(),
      share_error: null
    }).eq('id', sessionId)
  }
}

export async function markAllPracticeSharesPrivateDb() {
  if (!supabase) return
  
  const { data: userResp } = await supabase.auth.getUser()
  if (!userResp?.user) return
  
  await supabase.from('practice_sessions').update({
    share_status: 'private',
    share_client_id: null,
    share_requested_at: null,
    public_case_id: null,
    share_error: null
  }).eq('owner_id', userResp.user.id)
}

export function countMistakes(sessions: PracticeSession[]) {
  return { collision: sessions.reduce((sum, session) => sum + session.collisionCount, 0) }
}

export function todayPracticeMessage(sessions: PracticeSession[]) {
  if (!sessions.length) return '천천히 움직이며 기본 주차 순서를 익혀보세요.'
  const collisions = countMistakes(sessions).collision
  if (!collisions) return '충돌 없이 안정적이에요. 무작위 출발에 도전해보세요.'
  const wallHits = sessions.flatMap((item) => item.collisionTargets).filter((id) => id.includes('wall')).length
  if (wallHits) return '벽면 쪽 간격을 먼저 확인하고 수정 주차를 연습하세요.'
  return '닿을 것 같으면 정지하고 짧게 전진해 간격을 다시 만드세요.'
}

export function calculatePracticeTrend(sessions: PracticeSession[]): PracticeTrend {
  if (sessions.length < 4) return 'insufficient'
  const size = Math.min(3, Math.floor(sessions.length / 2))
  const sum = (items: PracticeSession[]) => items.reduce((total, item) => total + item.collisionCount, 0)
  const recent = sum(sessions.slice(0, size))
  const previous = sum(sessions.slice(size, size * 2))
  if (recent < previous) return 'improving'
  if (recent > previous) return 'needs-focus'
  return 'steady'
}

export function recommendPractice(sessions: PracticeSession[]) {
  if (sessions.length < 2) return null
  const recent = sessions.slice(0, 6)
  const collision = recent.find((item) => item.collisionCount > 0)
  if (collision) {
    const collisionScenario = collision.scenarioId === 'narrow-aisle' ? 'narrow-aisle' as const : 'both-sides' as const
    const scenarioId = isScenarioAvailable(collisionScenario) ? collisionScenario : 'both-sides'
    const zone = collision.collisionZones[0]?.replace('front', '앞').replace('rear', '뒤').replace('left', '왼쪽').replace('right', '오른쪽')
    return {
      scenarioId,
      mode: 'practice' as const,
      label: '판단 연습 시작',
      reason: `${zone ? `${zone} 모서리` : '차량 모서리'} 위험이 기록됐어요. 충돌 전에 멈추고 간격을 회복하는 순서를 연습해보세요.`,
    }
  }
  const hasBothSidesSuccess = recent.some((item) => item.scenarioId === 'both-sides' && item.success)
  const narrowAisleAvailable = isScenarioAvailable('narrow-aisle')
  const recommendNarrowAisle = hasBothSidesSuccess && narrowAisleAvailable
  return {
    scenarioId: recommendNarrowAisle ? 'narrow-aisle' as const : 'both-sides' as const,
    mode: 'learning' as const,
    label: recommendNarrowAisle ? '좁은 통로 주차 시작' : '같은 상황 다시 연습',
    reason: recommendNarrowAisle
      ? '양옆 차량 주차를 안정적으로 마쳤어요. 앞쪽 회전 공간이 좁은 상황에 도전해보세요.'
      : '같은 상황을 반복해 진입 위치와 좌우 간격 확인을 익혀보세요.',
  }
}
