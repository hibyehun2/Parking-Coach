import assert from 'node:assert/strict'
import test from 'node:test'
import type { ParkingResult } from '../src/engine/parkingEvaluation.ts'
import {
  MAX_PRACTICE_SESSIONS,
  PRACTICE_HISTORY_KEY,
  calculatePracticeTrend,
  clearPracticeHistory,
  countMistakes,
  loadPracticeHistory,
  recommendPractice,
  recordPracticeSession,
  todayPracticeMessage,
} from '../src/engine/practiceHistory.ts'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

function result(overrides: Partial<ParkingResult> = {}): ParkingResult {
  return {
    success: true,
    fullyInside: true,
    stopped: true,
    centerError: 0.1,
    angleErrorDegrees: 1,
    collisionCount: 0,
    collisions: [],
    ...overrides,
  }
}

test('저장한 연습 기록은 다시 불러와도 유지된다', () => {
  const storage = new MemoryStorage()
  recordPracticeSession(result(), 'both-sides', 'learning', storage, new Date('2026-07-22T10:00:00Z'))

  const reloaded = loadPracticeHistory(storage)
  assert.equal(reloaded.sessions.length, 1)
  assert.equal(reloaded.sessions[0].scenarioId, 'both-sides')
  assert.equal(reloaded.sessions[0].completedAt, '2026-07-22T10:00:00.000Z')
})

test('최근 기록은 최신순 10개까지만 저장한다', () => {
  const storage = new MemoryStorage()
  for (let index = 0; index < 13; index += 1) {
    recordPracticeSession(result({ centerError: index / 100 }), 'both-sides', 'practice', storage, new Date(1_700_000_000_000 + index * 1000))
  }

  const history = loadPracticeHistory(storage)
  assert.equal(history.sessions.length, MAX_PRACTICE_SESSIONS)
  assert.equal(history.sessions[0].centerError, 0.12)
  assert.equal(history.sessions.at(-1)?.centerError, 0.03)
})

test('충돌, 중앙 오차, 각도 오차 실수를 세션별로 정확히 집계한다', () => {
  const storage = new MemoryStorage()
  recordPracticeSession(result({ collisionCount: 2, centerError: 0.5 }), 'left-side', 'learning', storage)
  recordPracticeSession(result({ angleErrorDegrees: 8, centerError: 0.4 }), 'right-side', 'practice', storage)
  recordPracticeSession(result(), 'both-sides', 'learning', storage)

  assert.deepEqual(countMistakes(loadPracticeHistory(storage).sessions), {
    collision: 1,
    'off-center': 2,
    angle: 1,
  })
})

test('손상된 브라우저 데이터는 빈 기본값으로 복구한다', () => {
  const storage = new MemoryStorage()
  storage.setItem(PRACTICE_HISTORY_KEY, '{broken-json')

  assert.deepEqual(loadPracticeHistory(storage), { version: 1, sessions: [] })
  assert.deepEqual(JSON.parse(storage.getItem(PRACTICE_HISTORY_KEY) ?? ''), { version: 1, sessions: [] })
})

test('기록을 초기화할 수 있다', () => {
  const storage = new MemoryStorage()
  recordPracticeSession(result(), 'pillar-side', 'learning', storage)

  clearPracticeHistory(storage)
  assert.equal(loadPracticeHistory(storage).sessions.length, 0)
})

test('최근 오차가 줄면 개선 중으로 분석하고 가장 잦은 실수에 맞춰 추천한다', () => {
  const storage = new MemoryStorage()
  const results = [
    result({ centerError: 0.1, angleErrorDegrees: 1 }),
    result({ centerError: 0.12, angleErrorDegrees: 1 }),
    result({ centerError: 0.15, angleErrorDegrees: 2 }),
    result({ centerError: 0.7, angleErrorDegrees: 10 }),
    result({ centerError: 0.65, angleErrorDegrees: 9 }),
    result({ centerError: 0.6, angleErrorDegrees: 8 }),
  ]
  results.slice().reverse().forEach((item, index) => {
    recordPracticeSession(item, 'both-sides', 'learning', storage, new Date(1_700_000_000_000 + index * 1000))
  })
  const sessions = loadPracticeHistory(storage).sessions

  assert.equal(calculatePracticeTrend(sessions), 'improving')
  assert.equal(recommendPractice(sessions).scenarioId, 'both-sides')
})

test('최근 실수에 따라 오늘의 연습 문구를 선택하고 동률이면 안전 항목을 우선한다', () => {
  const storage = new MemoryStorage()
  assert.match(todayPracticeMessage([]), /기본 주차 순서/)

  recordPracticeSession(result({ centerError: 0.6 }), 'both-sides', 'learning', storage)
  assert.match(todayPracticeMessage(loadPracticeHistory(storage).sessions), /중앙/)

  recordPracticeSession(result({ angleErrorDegrees: 9 }), 'both-sides', 'learning', storage)
  assert.match(todayPracticeMessage(loadPracticeHistory(storage).sessions), /평행/)

  recordPracticeSession(result({ collisionCount: 1 }), 'both-sides', 'learning', storage)
  assert.match(todayPracticeMessage(loadPracticeHistory(storage).sessions), /장애물/)
})
