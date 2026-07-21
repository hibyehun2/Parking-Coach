import assert from 'node:assert/strict'
import test from 'node:test'
import { getLearningHint } from '../src/engine/learningHints.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

test('충돌과 장애물 근접 경고가 일반 안내보다 우선한다', () => {
  const collision = getLearningHint({ ...INITIAL_VEHICLE_STATE, x: 6.3, y: 8.75, heading: Math.PI / 2 }, 'both-sides')
  assert.equal(collision?.level, 'danger')
  assert.equal(collision?.id, 'collision')

  const nearVehicle = getLearningHint({ ...INITIAL_VEHICLE_STATE, x: 6.3, y: 5.9, heading: Math.PI / 2 }, 'left-side')
  assert.equal(nearVehicle?.level, 'danger')
})

test('차체가 주차선과 평행해지면 핸들 복귀를 우선 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: 9,
    y: 6.2,
    heading: Math.PI / 2,
    steeringAngle: 0.3,
  }, 'both-sides')
  assert.equal(hint?.id, 'center-steering')
  assert.equal(hint?.level, 'caution')
})

test('후진 조향 중에는 상황에 맞는 미러 확인을 권장한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: 12,
    y: 3,
    gear: 'R',
    steeringAngle: 0.3,
  }, 'right-side')
  assert.equal(hint?.id, 'mirror-우측 미러')
  assert.match(hint?.title ?? '', /우측 미러/)
})

test('진입점 전에는 위치 기반 안내를 제공한다', () => {
  const hint = getLearningHint(INITIAL_VEHICLE_STATE, 'both-sides')
  assert.equal(hint?.id, 'set-entry-point')
  assert.equal(hint?.level, 'info')
})
