import type { ParkingResult } from './parkingEvaluation.ts'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../types/practice.ts'
import { FIRST_SUCCESS_KEY, markFirstSuccess } from '../data/scenarios.ts'

export const PRACTICE_HISTORY_KEY = 'parking-coach:practice-history:v2'
export const MAX_PRACTICE_SESSIONS = 10

export type MistakeType = 'collision'

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
}

export type PracticeHistory = { version: 2; sessions: PracticeSession[] }
export type PracticeTrend = 'insufficient' | 'improving' | 'steady' | 'needs-focus'

const EMPTY_HISTORY: PracticeHistory = { version: 2, sessions: [] }
const SCENARIO_IDS: ScenarioId[] = ['both-sides', 'one-side', 'wall-side', 'tight-entry']
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
  }
}

export function loadPracticeHistory(storage: Storage | null = defaultStorage()): PracticeHistory {
  if (!storage) return { version: 2, sessions: [] }
  try {
    const raw = storage.getItem(PRACTICE_HISTORY_KEY) ?? storage.getItem('parking-coach:practice-history:v1')
    if (!raw) return { version: 2, sessions: [] }
    const parsed = JSON.parse(raw) as { sessions?: unknown[] }
    if (!Array.isArray(parsed.sessions)) throw new Error('invalid')
    const sessions = parsed.sessions.map(parseSession).filter((item): item is PracticeSession => Boolean(item)).slice(0, MAX_PRACTICE_SESSIONS)
    const history = { version: 2 as const, sessions }
    persist(storage, history)
    return history
  } catch {
    persist(storage, EMPTY_HISTORY)
    return { version: 2, sessions: [] }
  }
}

export function recordPracticeSession(
  result: ParkingResult,
  scenarioId: ScenarioId,
  mode: PracticeMode,
  storage: Storage | null = defaultStorage(),
  completedAt = new Date(),
  runtime?: ScenarioRuntime,
) {
  const history = loadPracticeHistory(storage)
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
  }
  const next = { version: 2 as const, sessions: [session, ...history.sessions].slice(0, MAX_PRACTICE_SESSIONS) }
  persist(storage, next)
  if (result.success) markFirstSuccess(scenarioId, storage)
  return next
}

export function clearPracticeHistory(storage: Storage | null = defaultStorage()) {
  persist(storage, EMPTY_HISTORY)
  storage?.removeItem(FIRST_SUCCESS_KEY)
  return { version: 2 as const, sessions: [] }
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
  if (!sessions.length) return { scenarioId: 'both-sides' as const, reason: '기본 좌우 간격부터 익혀보세요.' }
  const collisions = sessions.filter((item) => item.collisionCount > 0)
  if (!collisions.length) return { scenarioId: 'one-side' as const, reason: '충돌 없이 안정적입니다. 무작위 한쪽 차량에 도전해보세요.' }
  if (collisions.some((item) => item.collisionTargets.some((id) => id.includes('wall')))) {
    return { scenarioId: 'wall-side' as const, reason: '벽 충돌 기록이 있어 벽면 쪽 수정 동작을 추천합니다.' }
  }
  return { scenarioId: 'tight-entry' as const, reason: '차량 충돌 전에 멈추고 전진 수정하는 연습을 추천합니다.' }
}
