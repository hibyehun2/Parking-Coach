import type { ParkingResult } from './parkingEvaluation.ts'
import type { ReplayEvent } from './sessionReplay.ts'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../types/practice.ts'
import { FIRST_SUCCESS_KEY, isScenarioAvailable, markFirstSuccess } from '../data/scenarios.ts'
import type { JudgmentSkill } from './judgmentScenarios.ts'

export const PRACTICE_HISTORY_KEY = 'parking-coach:practice-history:v5'
export const MAX_PRACTICE_SESSIONS = 30
export const MAX_BOOKMARKED_SESSIONS = 5
export const PRACTICE_HISTORY_RETENTION_DAYS = 7
const PRACTICE_HISTORY_RETENTION_MS = PRACTICE_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000

export type MistakeType = 'collision'

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
}

export type PracticeHistory = { version: 5; sessions: PracticeSession[] }
export type PracticeTrend = 'insufficient' | 'improving' | 'steady' | 'needs-focus'

const EMPTY_HISTORY: PracticeHistory = { version: 5, sessions: [] }
const SCENARIO_IDS: ScenarioId[] = ['both-sides', 'narrow-aisle', 'one-side', 'wall-side', 'tight-entry']
const PRACTICE_MODES: PracticeMode[] = ['learning', 'practice']

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function persist(storage: Storage | null, history: PracticeHistory) {
  if (!storage) return
  try { storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(history)) } catch { /* 결과 화면은 계속 사용 */ }
}

function migratedScenario(value: unknown): ScenarioId | null {
  if (value === 'left-side' || value === 'right-side') return 'one-side'
  if (value === 'pillar-side') return 'wall-side'
  return SCENARIO_IDS.includes(value as ScenarioId) ? value as ScenarioId : null
}

function parseSession(value: unknown): PracticeSession | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const scenarioId = migratedScenario(item.scenarioId)
  if (!scenarioId || typeof item.id !== 'string' || typeof item.completedAt !== 'string'
    || Number.isNaN(Date.parse(item.completedAt)) || !PRACTICE_MODES.includes(item.mode as PracticeMode)
    || typeof item.success !== 'boolean' || !Number.isInteger(item.collisionCount)
    || (item.collisionCount as number) < 0) return null
  const collisionTargets = Array.isArray(item.collisionTargets)
    ? item.collisionTargets.filter((target): target is string => typeof target === 'string')
    : []
  const collisionZones = Array.isArray(item.collisionZones)
    ? item.collisionZones.filter((zone): zone is string => typeof zone === 'string')
    : []
  return {
    id: item.id,
    completedAt: item.completedAt,
    scenarioId,
    mode: item.mode as PracticeMode,
    success: item.success,
    collisionCount: item.collisionCount as number,
    collisionTargets,
    collisionZones,
    mistakes: (item.collisionCount as number) > 0 ? ['collision'] : [],
    seed: typeof item.seed === 'number' ? item.seed : undefined,
    variant: item.variant === 'left' || item.variant === 'right' || item.variant === 'fixed' ? item.variant : undefined,
    runtime: item.runtime && typeof item.runtime === 'object' ? item.runtime as ScenarioRuntime : undefined,
    moments: Array.isArray(item.moments)
      ? item.moments.filter((event): event is ReplayEvent => Boolean(event && typeof event === 'object' && typeof (event as ReplayEvent).id === 'string'))
      : undefined,
    quizScore: typeof item.quizScore === 'number' ? item.quizScore : undefined,
    quizTotal: typeof item.quizTotal === 'number' ? item.quizTotal : undefined,
    correctionAttempts: Array.isArray(item.correctionAttempts)
      ? item.correctionAttempts.filter((attempt): attempt is CorrectionAttempt => {
        if (!attempt || typeof attempt !== 'object') return false
        const value = attempt as Record<string, unknown>
        return typeof value.drillId === 'string'
          && typeof value.drillTitle === 'string'
          && typeof value.stepId === 'string'
          && typeof value.stepTitle === 'string'
          && typeof value.firstTryCorrect === 'boolean'
          && typeof value.firstChoiceLabel === 'string'
          && typeof value.correctChoiceLabel === 'string'
          && typeof value.takeaway === 'string'
      })
      : undefined,
    bookmarked: item.bookmarked === true,
    bookmarkedAt: typeof item.bookmarkedAt === 'string' && !Number.isNaN(Date.parse(item.bookmarkedAt)) ? item.bookmarkedAt : undefined,
  }
}

function retainSessions(sessions: PracticeSession[], now = new Date()) {
  const cutoff = now.getTime() - PRACTICE_HISTORY_RETENTION_MS
  const bookmarked = sessions
    .filter((session) => session.bookmarked)
    .sort((left, right) => Date.parse(right.bookmarkedAt ?? right.completedAt) - Date.parse(left.bookmarkedAt ?? left.completedAt))
    .slice(0, MAX_BOOKMARKED_SESSIONS)
  const recent = sessions
    .filter((session) => !session.bookmarked && Date.parse(session.completedAt) >= cutoff)
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
    .slice(0, MAX_PRACTICE_SESSIONS)
  return [...bookmarked, ...recent].sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
}

export function isPracticeSessionExpired(session: PracticeSession, now = new Date()) {
  return now.getTime() - Date.parse(session.completedAt) >= PRACTICE_HISTORY_RETENTION_MS
}

export function loadPracticeHistory(storage: Storage | null = defaultStorage(), now = new Date()): PracticeHistory {
  if (!storage) return { version: 5, sessions: [] }
  try {
    const raw = storage.getItem(PRACTICE_HISTORY_KEY)
      ?? storage.getItem('parking-coach:practice-history:v4')
      ?? storage.getItem('parking-coach:practice-history:v3')
      ?? storage.getItem('parking-coach:practice-history:v2')
      ?? storage.getItem('parking-coach:practice-history:v1')
    if (!raw) return { version: 5, sessions: [] }
    const parsed = JSON.parse(raw) as { sessions?: unknown[] }
    if (!Array.isArray(parsed.sessions)) throw new Error('invalid')
    const sessions = retainSessions(parsed.sessions.map(parseSession).filter((item): item is PracticeSession => Boolean(item)), now)
    const history = { version: 5 as const, sessions }
    persist(storage, history)
    return history
  } catch {
    persist(storage, EMPTY_HISTORY)
    return { version: 5, sessions: [] }
  }
}

export function recordPracticeSession(
  result: ParkingResult,
  scenarioId: ScenarioId,
  mode: PracticeMode,
  storage: Storage | null = defaultStorage(),
  completedAt = new Date(),
  runtime?: ScenarioRuntime,
  replay: ReplayEvent[] = [],
) {
  const history = loadPracticeHistory(storage, completedAt)
  const collisionTargets = result.collisions.map((collision) => collision.obstacleId)
  const collisionZones = result.collisions.flatMap((collision) => collision.contactZone ? [collision.contactZone] : [])
  const session: PracticeSession = {
    id: `${completedAt.getTime()}-${scenarioId}`,
    completedAt: completedAt.toISOString(),
    scenarioId,
    mode,
    success: result.success,
    collisionCount: result.collisionCount,
    collisionTargets,
    collisionZones,
    mistakes: result.collisionCount ? ['collision'] : [],
    seed: runtime?.seed,
    variant: runtime?.variant,
    runtime,
    moments: replay
      .filter((event) => event.type === 'collision' || (event.type === 'finish' && result.success))
      .slice(-4)
      .map((event) => ({
        ...event,
        clip: event.clip && event.clip.length > 24
          ? event.clip.filter((_, index) => index % Math.ceil(event.clip!.length / 24) === 0).slice(-24)
          : event.clip,
      })),
    bookmarked: false,
  }
  const next = { version: 5 as const, sessions: retainSessions([session, ...history.sessions], completedAt) }
  persist(storage, next)
  if (result.success) markFirstSuccess(scenarioId, storage)
  return next
}

export function clearPracticeHistory(storage: Storage | null = defaultStorage()) {
  persist(storage, EMPTY_HISTORY)
  storage?.removeItem(FIRST_SUCCESS_KEY)
  return { version: 5 as const, sessions: [] }
}

export function recordCorrectionSession(
  score: number,
  total: number,
  runtime: ScenarioRuntime,
  storage: Storage | null = defaultStorage(),
  completedAt = new Date(),
  correctionAttempts: CorrectionAttempt[] = [],
) {
  const history = loadPracticeHistory(storage, completedAt)
  const session: PracticeSession = {
    id: `${completedAt.getTime()}-correction`,
    completedAt: completedAt.toISOString(),
    scenarioId: runtime.scenarioId,
    mode: 'practice',
    success: score === total,
    collisionCount: 0,
    collisionTargets: [],
    collisionZones: [],
    mistakes: [],
    seed: runtime.seed,
    variant: runtime.variant,
    runtime,
    quizScore: score,
    quizTotal: total,
    correctionAttempts,
    bookmarked: false,
  }
  const next = { version: 5 as const, sessions: retainSessions([session, ...history.sessions], completedAt) }
  persist(storage, next)
  return next
}

export function togglePracticeBookmark(
  sessionId: string,
  storage: Storage | null = defaultStorage(),
  now = new Date(),
) {
  const history = loadPracticeHistory(storage, now)
  const target = history.sessions.find((session) => session.id === sessionId)
  if (!target) return { history, status: 'not-found' as const }
  if (!target.bookmarked && history.sessions.filter((session) => session.bookmarked).length >= MAX_BOOKMARKED_SESSIONS) {
    return { history, status: 'limit' as const }
  }
  const sessions = history.sessions.map((session) => session.id === sessionId
    ? { ...session, bookmarked: !session.bookmarked, bookmarkedAt: session.bookmarked ? undefined : now.toISOString() }
    : session)
  const next = { version: 5 as const, sessions: retainSessions(sessions, now) }
  persist(storage, next)
  return { history: next, status: target.bookmarked ? 'removed' as const : 'added' as const }
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
