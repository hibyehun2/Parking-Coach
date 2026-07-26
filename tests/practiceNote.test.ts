import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_PRACTICE_NOTE_LENGTH, normalizePracticeNote, type PracticeSession } from '../src/engine/practiceHistory.ts'
import { buildPublicLearningCase } from '../src/engine/practiceSharing.ts'
import type { ReplayEvent } from '../src/engine/sessionReplay.ts'
import type { ScenarioRuntime } from '../src/types/practice.ts'
import type { VehicleState } from '../src/engine/vehiclePhysics.ts'

test('메모는 공백과 줄바꿈을 정리하고 50자로 제한한다', () => {
  const normalized = normalizePracticeNote(`  오른쪽   간격 확인\r\n\r\n\r\n${'가'.repeat(60)}  `)
  assert.equal(normalized.length, MAX_PRACTICE_NOTE_LENGTH)
  assert.match(normalized, /^오른쪽 간격 확인\n\n/)
})

test('보관한 기록의 메모는 공개 사례 payload에 포함된다', () => {
  const vehicle = {
    x: 15,
    y: 9.5,
    heading: -Math.PI / 2,
    speed: 0,
    steeringAngle: 0,
    gear: 'R',
    braking: true,
  } as VehicleState
  const session = {
    id: 'session-with-note',
    completedAt: '2026-07-26T10:00:00.000Z',
    scenarioId: 'both-sides',
    mode: 'learning',
    success: true,
    collisionCount: 0,
    collisionTargets: [],
    collisionZones: [],
    mistakes: [],
    runtime: { scenarioId: 'both-sides' } as ScenarioRuntime,
    moments: [{ type: 'finish', vehicle }] as ReplayEvent[],
    note: '오른쪽 간격부터 확인하기',
    bookmarked: true,
    shareStatus: 'pending',
    shareClientId: 'share-with-note',
  } satisfies PracticeSession

  const payload = buildPublicLearningCase(session, '차분한 수달', {
    version: 1,
    acceptedAt: '2026-07-26T09:00:00.000Z',
  })

  assert.equal(payload.sharedNote, session.note)
})
