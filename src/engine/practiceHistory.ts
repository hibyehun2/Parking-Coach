import type { ParkingResult } from './parkingEvaluation.ts'
import type { PracticeMode, ScenarioId } from '../types/practice.ts'

export const PRACTICE_HISTORY_KEY = 'parking-coach:practice-history:v1'
export const MAX_PRACTICE_SESSIONS = 10

export type MistakeType = 'collision' | 'off-center' | 'angle'

export type PracticeSession = {
  id: string
  completedAt: string
  scenarioId: ScenarioId
  mode: PracticeMode
  success: boolean
  centerError: number
  angleErrorDegrees: number
  collisionCount: number
  mistakes: MistakeType[]
}

export type PracticeHistory = {
  version: 1
  sessions: PracticeSession[]
}

export type PracticeTrend = 'insufficient' | 'improving' | 'steady' | 'needs-focus'

const EMPTY_HISTORY: PracticeHistory = { version: 1, sessions: [] }
const SCENARIO_IDS: ScenarioId[] = ['both-sides', 'left-side', 'right-side', 'pillar-side']
const PRACTICE_MODES: PracticeMode[] = ['learning', 'practice']

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPracticeSession(value: unknown): value is PracticeSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<PracticeSession>
  return typeof session.id === 'string'
    && typeof session.completedAt === 'string'
    && !Number.isNaN(Date.parse(session.completedAt))
    && SCENARIO_IDS.includes(session.scenarioId as ScenarioId)
    && PRACTICE_MODES.includes(session.mode as PracticeMode)
    && typeof session.success === 'boolean'
    && isFiniteNonNegative(session.centerError)
    && isFiniteNonNegative(session.angleErrorDegrees)
    && Number.isInteger(session.collisionCount)
    && isFiniteNonNegative(session.collisionCount)
    && Array.isArray(session.mistakes)
    && session.mistakes.every((mistake) => ['collision', 'off-center', 'angle'].includes(mistake))
}

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function persist(storage: Storage | null, history: PracticeHistory) {
  if (!storage) return
  try {
    storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(history))
  } catch {
    // 저장 공간이 차 있어도 현재 연습 결과 화면은 계속 사용할 수 있어야 합니다.
  }
}

export function loadPracticeHistory(storage: Storage | null = defaultStorage()): PracticeHistory {
  if (!storage) return { ...EMPTY_HISTORY, sessions: [] }
  try {
    const raw = storage.getItem(PRACTICE_HISTORY_KEY)
    if (!raw) return { ...EMPTY_HISTORY, sessions: [] }
    const parsed = JSON.parse(raw) as Partial<PracticeHistory>
    if (parsed.version !== 1 || !Array.isArray(parsed.sessions) || !parsed.sessions.every(isPracticeSession)) {
      persist(storage, EMPTY_HISTORY)
      return { ...EMPTY_HISTORY, sessions: [] }
    }
    const sessions = parsed.sessions
      .slice(0, MAX_PRACTICE_SESSIONS)
      .map((session) => ({ ...session, mistakes: [...session.mistakes] }))
    if (sessions.length !== parsed.sessions.length) persist(storage, { version: 1, sessions })
    return { version: 1, sessions }
  } catch {
    persist(storage, EMPTY_HISTORY)
    return { ...EMPTY_HISTORY, sessions: [] }
  }
}

export function classifyMistakes(result: Pick<ParkingResult, 'centerError' | 'angleErrorDegrees' | 'collisionCount'>) {
  const mistakes: MistakeType[] = []
  if (result.collisionCount > 0) mistakes.push('collision')
  if (result.centerError > 0.35) mistakes.push('off-center')
  if (result.angleErrorDegrees > 5) mistakes.push('angle')
  return mistakes
}

export function recordPracticeSession(
  result: ParkingResult,
  scenarioId: ScenarioId,
  mode: PracticeMode,
  storage: Storage | null = defaultStorage(),
  completedAt = new Date(),
) {
  const history = loadPracticeHistory(storage)
  const session: PracticeSession = {
    id: `${completedAt.getTime()}-${scenarioId}`,
    completedAt: completedAt.toISOString(),
    scenarioId,
    mode,
    success: result.success,
    centerError: result.centerError,
    angleErrorDegrees: result.angleErrorDegrees,
    collisionCount: result.collisionCount,
    mistakes: classifyMistakes(result),
  }
  const next = { version: 1 as const, sessions: [session, ...history.sessions].slice(0, MAX_PRACTICE_SESSIONS) }
  persist(storage, next)
  return next
}

export function clearPracticeHistory(storage: Storage | null = defaultStorage()) {
  persist(storage, EMPTY_HISTORY)
  return { ...EMPTY_HISTORY, sessions: [] }
}

export function countMistakes(sessions: PracticeSession[]) {
  const counts: Record<MistakeType, number> = { collision: 0, 'off-center': 0, angle: 0 }
  for (const session of sessions) {
    for (const mistake of session.mistakes) counts[mistake] += 1
  }
  return counts
}

export function todayPracticeMessage(sessions: PracticeSession[]) {
  if (!sessions.length) return '천천히 움직이며 기본 주차 순서를 익혀보세요.'
  const counts = countMistakes(sessions)
  const priority: MistakeType[] = ['collision', 'angle', 'off-center']
  const mostFrequent = priority.reduce((selected, mistake) => (
    counts[mistake] > counts[selected] ? mistake : selected
  ), priority[0])
  if (counts[mostFrequent] === 0) return '안정적인 기본기로 기둥 옆 주차에 도전해보세요.'
  if (mostFrequent === 'collision') return '좌우 미러를 번갈아 보며 장애물과 간격을 확인하세요.'
  if (mostFrequent === 'angle') return '차체가 평행해지는 순간 핸들을 중앙으로 돌려보세요.'
  return '양쪽 주차선 간격을 비교하며 중앙을 맞춰보세요.'
}

function sessionErrorScore(session: PracticeSession) {
  return session.centerError * 100 + session.angleErrorDegrees * 5 + session.collisionCount * 40
}

export function calculatePracticeTrend(sessions: PracticeSession[]): PracticeTrend {
  if (sessions.length < 4) return 'insufficient'
  const sampleSize = Math.min(3, Math.floor(sessions.length / 2))
  const recent = sessions.slice(0, sampleSize)
  const previous = sessions.slice(sampleSize, sampleSize * 2)
  const average = (items: PracticeSession[]) => items.reduce((sum, item) => sum + sessionErrorScore(item), 0) / items.length
  const recentAverage = average(recent)
  const previousAverage = average(previous)
  if (recentAverage <= previousAverage * 0.85) return 'improving'
  if (recentAverage >= previousAverage * 1.15) return 'needs-focus'
  return 'steady'
}

export function recommendPractice(sessions: PracticeSession[]) {
  if (!sessions.length) return { scenarioId: 'both-sides' as const, reason: '첫 기록을 만들고 기본 좌우 간격부터 확인해보세요.' }
  const counts = countMistakes(sessions)
  const mostFrequent = (Object.entries(counts) as [MistakeType, number][])
    .sort((first, second) => second[1] - first[1])[0]
  if (!mostFrequent || mostFrequent[1] === 0) {
    return { scenarioId: 'pillar-side' as const, reason: '기본 정렬이 안정적입니다. 충전구역 옆 응용 연습에 도전해보세요.' }
  }
  if (mostFrequent[0] === 'collision') {
    const scenarioCounts = new Map<ScenarioId, number>()
    for (const session of sessions.filter((item) => item.mistakes.includes('collision'))) {
      scenarioCounts.set(session.scenarioId, (scenarioCounts.get(session.scenarioId) ?? 0) + 1)
    }
    const scenarioId = [...scenarioCounts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? 'both-sides'
    return { scenarioId, reason: '충돌 기록이 가장 많습니다. 같은 상황에서 미러 교차 확인을 집중 연습하세요.' }
  }
  if (mostFrequent[0] === 'angle') {
    return { scenarioId: 'both-sides' as const, reason: '각도 오차가 자주 발생합니다. 평행 시점과 핸들 중앙 복귀를 연습하세요.' }
  }
  return { scenarioId: 'both-sides' as const, reason: '중앙 정렬 오차가 자주 발생합니다. 양쪽 주차선 간격을 비교해보세요.' }
}
