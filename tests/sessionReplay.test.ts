import assert from 'node:assert/strict'
import test from 'node:test'
import type { ParkingResult } from '../src/engine/parkingEvaluation.ts'
import {
  analyzeParkingResult,
  cloneVehicleState,
  firstMistakeEvent,
  type ReplayEvent,
} from '../src/engine/sessionReplay.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

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

test('결과 분석 문장은 실제 성공 기록과 일치한다', () => {
  const insight = analyzeParkingResult(result())

  assert.ok(insight.wellDone.some((item) => item.includes('충돌 없이')))
  assert.ok(insight.wellDone.some((item) => item.includes('주차선 안')))
  assert.equal(insight.mistakes.length, 0)
  assert.equal(insight.improvements.length, 0)
})

test('미완료 원인별 주요 실수와 개선 행동을 만든다', () => {
  const insight = analyzeParkingResult(result({
    success: false,
    fullyInside: false,
    stopped: false,
    centerError: 0.7,
    angleErrorDegrees: 12,
    collisionCount: 2,
  }))

  assert.ok(insight.mistakes.some((item) => item.includes('주차선 밖')))
  assert.ok(insight.mistakes.some((item) => item.includes('2회의 충돌')))
  assert.equal(insight.mistakes.length, insight.improvements.length)
})

test('충돌 지점을 우선 재시도 상태로 선택하고 차량은 정지 상태로 복원한다', () => {
  const moving = { ...INITIAL_VEHICLE_STATE, x: 12, speed: -0.4, braking: false }
  const collisionVehicle = cloneVehicleState(moving)
  const events: ReplayEvent[] = [
    { id: 'start', elapsedSeconds: 0, type: 'start', label: '시작', vehicle: INITIAL_VEHICLE_STATE },
    { id: 'collision-1', elapsedSeconds: 4, type: 'collision', label: '충돌', vehicle: collisionVehicle },
    { id: 'finish', elapsedSeconds: 8, type: 'finish', label: '종료', vehicle: cloneVehicleState({ ...moving, x: 14 }) },
  ]

  const retry = firstMistakeEvent(events, result({ collisionCount: 1 }))
  assert.equal(retry?.id, 'collision-1')
  assert.equal(retry?.vehicle.x, 12)
  assert.equal(retry?.vehicle.speed, 0)
  assert.equal(retry?.vehicle.braking, true)
  assert.equal(moving.speed, -0.4, '원본 세션 상태를 변경하지 않아야 한다')
})

test('충돌 없는 미완료는 종료 스냅샷에서 재시도한다', () => {
  const finish: ReplayEvent = {
    id: 'finish',
    elapsedSeconds: 5,
    type: 'finish',
    label: '미완료',
    vehicle: cloneVehicleState({ ...INITIAL_VEHICLE_STATE, x: 10 }),
  }

  assert.equal(firstMistakeEvent([finish], result({ success: false }))?.vehicle.x, 10)
  assert.equal(firstMistakeEvent([finish], result({ success: true })), null)
})
