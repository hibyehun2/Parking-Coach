import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildCorrectionDrills } from '../src/engine/correctionDrills.ts'
import type { PracticeSession } from '../src/engine/practiceHistory.ts'
import { buildPublicLearningCase, resolveLearningCaseVehicleSnapshot } from '../src/engine/practiceSharing.ts'

const consent = { version: 1, acceptedAt: '2026-07-26T09:00:00.000Z' }

function session(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'session-1',
    completedAt: '2026-07-26T10:00:00.000Z',
    scenarioId: 'both-sides',
    mode: 'learning',
    success: false,
    collisionCount: 0,
    collisionTargets: [],
    collisionZones: [],
    mistakes: [],
    bookmarked: true,
    shareStatus: 'pending',
    shareClientId: 'share-1',
    ...overrides,
  }
}

test('미완료 조작 연습도 마지막 종료 장면으로 공개 탑뷰를 만든다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 12 })
  const finalVehicle = { ...runtime.initialVehicle, x: runtime.initialVehicle.x + 1.2, braking: true, speed: 0 }
  const practiceSession = session({
    runtime,
    moments: [{
      id: 'finish',
      elapsedSeconds: 30,
      type: 'finish',
      label: '미완료 상태로 연습 종료',
      vehicle: finalVehicle,
    }],
  })

  const payload = buildPublicLearningCase(practiceSession, '차분한수달', consent)
  assert.deepEqual(payload.vehicleSnapshot, finalVehicle)
})

test('이전 판단 기록은 문제 식별자로 차량 상태를 재구성한다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 15 })
  const drill = buildCorrectionDrills(runtime)[0]
  const step = drill.steps[0]
  const firstChoice = step.choices.find((choice) => choice.id !== step.answer) ?? step.choices[0]
  const judgmentSession = session({
    id: 'judgment-1',
    mode: 'practice',
    runtime,
    correctionAttempts: [{
      drillId: drill.id,
      drillTitle: drill.title,
      stepId: step.id,
      stepTitle: step.title,
      firstTryCorrect: false,
      firstChoiceLabel: firstChoice.label,
      correctChoiceLabel: step.choices.find((choice) => choice.id === step.answer)?.label ?? '',
      takeaway: step.takeaway,
    }],
  })

  assert.ok(resolveLearningCaseVehicleSnapshot(judgmentSession))
  assert.ok(buildPublicLearningCase(judgmentSession, '차분한수달', consent).vehicleSnapshot)
})

test('탑뷰를 복구할 수 없는 이전 기록은 공개하지 않는다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 18 })
  assert.throws(
    () => buildPublicLearningCase(session({ runtime }), '차분한수달', consent),
    /visual-snapshot-missing/,
  )
})
