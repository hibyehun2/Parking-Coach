import assert from 'node:assert/strict'
import test from 'node:test'
import type { ParkingResult } from '../src/engine/parkingEvaluation.ts'
import { MAX_BOOKMARKED_SESSIONS, MAX_PRACTICE_SESSIONS, PRACTICE_HISTORY_KEY, calculatePracticeTrend, clearPracticeHistory, countMistakes, loadPracticeHistory, queueBookmarkedSessionsForSharing, recommendPractice, recordCorrectionSession, recordPracticeSession, todayPracticeMessage, togglePracticeBookmark } from '../src/engine/practiceHistory.ts'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import type { ReplayEvent } from '../src/engine/sessionReplay.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'
import { buildCorrectionDrills } from '../src/engine/correctionDrills.ts'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

function result(collisionCount = 0): ParkingResult {
  return { success: true, fullyInside: true, stopped: true, centerError: .1, angleErrorDegrees: 1, collisionCount, collisions: Array.from({ length: collisionCount }, (_, index) => ({ obstacleId: `parked-${index % 2 ? 'right' : 'left'}`, kind: 'vehicle', position: { x: 15, y: 8 } })) }
}

test('저장한 충돌 중심 연습 기록은 다시 불러와도 유지된다', () => {
  const storage = new MemoryStorage()
  recordPracticeSession(result(), 'both-sides', 'learning', storage, new Date('2026-07-22T10:00:00Z'))
  const session = loadPracticeHistory(storage, new Date('2026-07-24T10:00:00Z')).sessions[0]
  assert.equal(session.scenarioId, 'both-sides')
  assert.equal(session.completedAt, '2026-07-22T10:00:00.000Z')
  assert.equal('centerError' in session, false)
  assert.equal('angleErrorDegrees' in session, false)
})

test('최근 기록은 최신순 20개까지만 저장한다', () => {
  const storage = new MemoryStorage()
  for (let index = 0; index < 33; index += 1) recordPracticeSession(result(index % 2), 'both-sides', 'practice', storage, new Date(1_700_000_000_000 + index * 1000))
  const history = loadPracticeHistory(storage, new Date(1_700_000_040_000))
  assert.equal(history.sessions.length, MAX_PRACTICE_SESSIONS)
  assert.ok(history.sessions[0].completedAt > history.sessions.at(-1)!.completedAt)
})

test('실수 집계는 충돌 횟수만 합산한다', () => {
  const storage = new MemoryStorage()
  recordPracticeSession(result(2), 'one-side', 'learning', storage)
  recordPracticeSession(result(1), 'wall-side', 'practice', storage)
  assert.deepEqual(countMistakes(loadPracticeHistory(storage).sessions), { collision: 3 })
})

test('손상된 브라우저 데이터는 버전 5 기본값으로 복구한다', () => {
  const storage = new MemoryStorage()
  storage.setItem(PRACTICE_HISTORY_KEY, '{broken-json')
  assert.deepEqual(loadPracticeHistory(storage), { version: 5, sessions: [] })
})

test('기록을 초기화할 수 있다', () => {
  const storage = new MemoryStorage()
  recordPracticeSession(result(), 'tight-entry', 'learning', storage)
  assert.equal(clearPracticeHistory(storage).sessions.length, 0)
})

test('미완료 종료 장면은 저장하지 않고 충돌 직전 장면은 유지한다', () => {
  const storage = new MemoryStorage()
  const replay: ReplayEvent[] = [
    { id: 'collision', elapsedSeconds: 3, type: 'collision', label: '충돌 직전', vehicle: INITIAL_VEHICLE_STATE },
    { id: 'finish', elapsedSeconds: 5, type: 'finish', label: '미완료 종료', vehicle: INITIAL_VEHICLE_STATE },
  ]
  recordPracticeSession({ ...result(1), success: false, fullyInside: false }, 'both-sides', 'learning', storage, new Date(), undefined, replay)

  assert.deepEqual(loadPracticeHistory(storage).sessions[0].moments?.map(({ type }) => type), ['collision'])
})

test('수정 판단 훈련 결과를 일반 주차와 구분해 저장한다', () => {
  const storage = new MemoryStorage()
  const attempts = [{
    drillId: 'crooked',
    drillTitle: '비스듬한 자세 바로잡기',
    stepId: 'crooked-assess',
    stepTitle: '좁아지는 쪽 찾기',
    firstTryCorrect: false,
    firstChoiceLabel: '직선 후진',
    correctChoiceLabel: '각도부터 바로잡기',
    takeaway: '깊이보다 각도를 먼저 확인하세요.',
  }]
  recordCorrectionSession(9, 10, createScenarioRuntime('tight-entry', { seed: 2 }), storage, new Date(), attempts)
  const session = loadPracticeHistory(storage).sessions[0]

  assert.equal(session.mode, 'practice')
  assert.equal(session.quizScore, 9)
  assert.equal(session.quizTotal, 10)
  assert.deepEqual(session.correctionAttempts, attempts)
})

test('판단 당시 탑뷰 복기 스냅샷을 문항 변경과 관계없이 저장한다', () => {
  const storage = new MemoryStorage()
  const runtime = createScenarioRuntime('both-sides', { seed: 7 })
  const step = buildCorrectionDrills(runtime)[0].steps[0]
  const firstChoice = step.choices.find((choice) => choice.id !== step.answer)!
  const correctChoice = step.choices.find((choice) => choice.id === step.answer)!
  const attempt = {
    drillId: 'snapshot-drill',
    drillTitle: '복기 테스트',
    stepId: step.id,
    stepTitle: step.title,
    firstTryCorrect: false,
    firstChoiceLabel: firstChoice.label,
    correctChoiceLabel: correctChoice.label,
    takeaway: step.takeaway,
    skill: step.skill,
    reviewSnapshot: { scenario: step, firstChoice, correctChoice },
  }
  recordCorrectionSession(0, 1, runtime, storage, new Date('2026-07-24T10:00:00Z'), [attempt])

  const saved = loadPracticeHistory(storage).sessions[0].correctionAttempts?.[0].reviewSnapshot
  assert.equal(saved?.scenario.id, step.id)
  assert.equal(saved?.firstChoice.id, firstChoice.id)
  assert.equal(saved?.correctChoice.id, correctChoice.id)
  assert.deepEqual(saved?.scenario.vehicle, step.vehicle)
})

test('최근 충돌이 줄면 개선 중이며 차량 충돌은 수정 연습을 추천한다', () => {
  const storage = new MemoryStorage()
  ;[2, 2, 2, 0, 0, 0].forEach((count, index) => recordPracticeSession(result(count), 'both-sides', 'learning', storage, new Date(1_700_000_000_000 + index * 1000)))
  const sessions = loadPracticeHistory(storage, new Date(1_700_000_010_000)).sessions
  assert.equal(calculatePracticeTrend(sessions), 'improving')
  assert.equal(recommendPractice(sessions)?.scenarioId, 'both-sides')
  assert.equal(recommendPractice(sessions)?.mode, 'practice')
})

test('기록이 부족하면 추천을 숨기고 준비 중인 좁은 통로는 추천하지 않는다', () => {
  const storage = new MemoryStorage()
  recordPracticeSession(result(), 'both-sides', 'learning', storage)
  assert.equal(recommendPractice(loadPracticeHistory(storage).sessions), null)
  recordPracticeSession(result(), 'both-sides', 'learning', storage, new Date(Date.now() + 1000))
  const recommendation = recommendPractice(loadPracticeHistory(storage).sessions)
  assert.equal(recommendation?.scenarioId, 'both-sides')
  assert.equal(recommendation?.mode, 'learning')
})

test('충돌 기록에 따라 오늘의 수정 연습 문구를 선택한다', () => {
  const storage = new MemoryStorage()
  assert.match(todayPracticeMessage([]), /기본 주차 순서/)
  recordPracticeSession(result(1), 'both-sides', 'learning', storage)
  assert.match(todayPracticeMessage(loadPracticeHistory(storage).sessions), /정지.*전진/)
})

test('일반 기록은 7일 뒤 정리되고 보관한 기록은 유지된다', () => {
  const storage = new MemoryStorage()
  const completedAt = new Date('2026-07-01T10:00:00Z')
  const saved = recordPracticeSession(result(), 'both-sides', 'learning', storage, completedAt)
  togglePracticeBookmark(saved.sessions[0].id, storage, new Date('2026-07-02T10:00:00Z'))

  assert.equal(loadPracticeHistory(storage, new Date('2026-08-01T10:00:00Z')).sessions.length, 1)
  togglePracticeBookmark(saved.sessions[0].id, storage, new Date('2026-08-01T10:00:00Z'))
  assert.equal(loadPracticeHistory(storage, new Date('2026-08-01T10:00:01Z')).sessions.length, 0)
})

test('기록은 최대 3개까지만 보관할 수 있다', () => {
  const storage = new MemoryStorage()
  const base = Date.parse('2026-07-20T10:00:00Z')
  for (let index = 0; index < MAX_BOOKMARKED_SESSIONS + 1; index += 1) {
    const completedAt = new Date(base + index * 1000)
    const saved = recordPracticeSession(result(), 'both-sides', 'learning', storage, completedAt)
    const status = togglePracticeBookmark(saved.sessions.find((session) => session.completedAt === completedAt.toISOString())!.id, storage, completedAt).status
    assert.equal(status, index < MAX_BOOKMARKED_SESSIONS ? 'added' : 'limit')
  }
  assert.equal(loadPracticeHistory(storage, new Date(base + 10_000)).sessions.filter((session) => session.bookmarked).length, MAX_BOOKMARKED_SESSIONS)
})

test('동의 후 보관한 기록은 공유 대기 상태가 되고 해제하면 공개 중단을 준비한다', () => {
  const storage = new MemoryStorage()
  const saved = recordPracticeSession(result(), 'both-sides', 'learning', storage)
  const sessionId = saved.sessions[0].id
  togglePracticeBookmark(sessionId, storage, new Date(), { shareWhenAdded: true })
  const pending = loadPracticeHistory(storage).sessions[0]
  assert.equal(pending.shareStatus, 'pending')
  assert.ok(pending.shareClientId)
  assert.notEqual(pending.shareClientId, sessionId)

  const stored = JSON.parse(storage.getItem(PRACTICE_HISTORY_KEY)!) as { sessions: Array<Record<string, unknown>> }
  stored.sessions[0].shareStatus = 'shared'
  stored.sessions[0].publicCaseId = 'public-case-1'
  storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(stored))
  togglePracticeBookmark(sessionId, storage)

  assert.equal(loadPracticeHistory(storage).sessions[0].shareStatus, 'unpublishing')
})

test('기간이 지난 기록도 서버 공개 중단을 마칠 때까지 삭제 대기열에 유지한다', () => {
  const storage = new MemoryStorage()
  const completedAt = new Date('2026-07-01T10:00:00Z')
  const saved = recordPracticeSession(result(), 'both-sides', 'learning', storage, completedAt)
  togglePracticeBookmark(saved.sessions[0].id, storage, new Date('2026-07-02T10:00:00Z'), { shareWhenAdded: true })
  const stored = JSON.parse(storage.getItem(PRACTICE_HISTORY_KEY)!) as { sessions: Array<Record<string, unknown>> }
  stored.sessions[0].shareStatus = 'shared'
  stored.sessions[0].publicCaseId = 'public-case-1'
  storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(stored))

  togglePracticeBookmark(saved.sessions[0].id, storage, new Date('2026-08-01T10:00:00Z'))
  const pendingRemoval = loadPracticeHistory(storage, new Date('2026-08-02T10:00:00Z')).sessions[0]
  assert.equal(pendingRemoval.shareStatus, 'unpublishing')
  assert.equal(pendingRemoval.publicCaseId, 'public-case-1')
})

test('기존 보관 기록은 동의 전 비공개이며 선택 후에만 공유 대기열로 전환한다', () => {
  const storage = new MemoryStorage()
  const saved = recordPracticeSession(result(), 'both-sides', 'learning', storage)
  togglePracticeBookmark(saved.sessions[0].id, storage)
  assert.equal(loadPracticeHistory(storage).sessions[0].shareStatus, 'private')

  const queued = queueBookmarkedSessionsForSharing(storage)
  assert.equal(queued.sessions[0].shareStatus, 'pending')
})

test('기존 보관 기록이 3개를 넘으면 초과 기록을 최근 기록으로 안전하게 전환한다', () => {
  const storage = new MemoryStorage()
  const base = Date.parse('2026-07-20T10:00:00Z')
  for (let index = 0; index < 5; index += 1) {
    recordPracticeSession(result(), 'both-sides', 'learning', storage, new Date(base + index * 1000))
  }
  const stored = JSON.parse(storage.getItem(PRACTICE_HISTORY_KEY)!) as {
    sessions: Array<{ completedAt: string; bookmarked: boolean; bookmarkedAt?: string }>
  }
  stored.sessions = stored.sessions.map((session) => ({
    ...session,
    bookmarked: true,
    bookmarkedAt: session.completedAt,
  }))
  storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(stored))

  const migrated = loadPracticeHistory(storage, new Date(base + 10_000))
  assert.equal(migrated.sessions.length, 5)
  assert.equal(migrated.sessions.filter((session) => session.bookmarked).length, MAX_BOOKMARKED_SESSIONS)
  assert.equal(migrated.sessions.filter((session) => !session.bookmarked).length, 2)

  const expired = loadPracticeHistory(storage, new Date('2026-08-01T10:00:00Z'))
  assert.equal(expired.sessions.length, MAX_BOOKMARKED_SESSIONS)
  assert.ok(expired.sessions.every((session) => session.bookmarked))
})
