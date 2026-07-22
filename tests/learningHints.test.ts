import assert from 'node:assert/strict'
import test from 'node:test'
import { getLearningHint } from '../src/engine/learningHints.ts'
import { PARKED_VEHICLES } from '../src/engine/collisionDetection.ts'
import { TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

test('충돌과 장애물 근접 경고가 일반 안내보다 우선한다', () => {
  const parkedVehicle = PARKED_VEHICLES[0]
  const collision = getLearningHint({ ...INITIAL_VEHICLE_STATE, x: parkedVehicle.x, y: parkedVehicle.y, heading: parkedVehicle.heading }, 'both-sides')
  assert.equal(collision?.level, 'danger')
  assert.equal(collision?.id, 'collision')

  const nearVehicle = getLearningHint({ ...INITIAL_VEHICLE_STATE, x: parkedVehicle.x, y: parkedVehicle.y - 2.85, heading: parkedVehicle.heading }, 'left-side')
  assert.equal(nearVehicle?.level, 'danger')
})

test('차체가 주차선과 평행해지면 핸들 복귀를 우선 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: TARGET_PARKING_BAY.top + 0.5,
    heading: Math.PI / 2,
    steeringAngle: 0.3,
  }, 'both-sides')
  assert.equal(hint?.id, 'center-steering')
  assert.equal(hint?.level, 'caution')
})

test('후진 조향 중에는 상황에 맞는 간격 화면 확인을 권장한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: 12,
    y: 3,
    gear: 'R',
    steeringAngle: 0.3,
  }, 'right-side')
  assert.equal(hint?.id, 'alternate-side-mirrors')
  assert.match(hint?.title ?? '', /좌우 사이드미러/)
  assert.match(hint?.message ?? '', /우측 미러.*좌측 미러/)
})

test('후진을 시작했지만 조향하지 않았으면 주차 방향 최대 조향을 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: TARGET_PARKING_BAY.top - 1.5,
    gear: 'R',
    steeringAngle: 0,
  }, 'both-sides')

  assert.equal(hint?.id, 'turn-toward-space')
  assert.match(hint?.message ?? '', /오른쪽 끝까지/)
})

test('평행 정렬 후에는 후방 가이드로 직선 후진을 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: TARGET_PARKING_BAY.top + 1.5,
    heading: TARGET_PARKING_BAY.heading,
    gear: 'R',
    steeringAngle: 0,
  }, 'both-sides')

  assert.equal(hint?.id, 'rear-camera-finish')
  assert.match(hint?.message ?? '', /장애물.*거리/)
})

test('반대 방향 최대 조향 중에는 사이드미러 기준점을 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    gear: 'D',
    steeringAngle: -0.3,
  }, 'both-sides')

  assert.equal(hint?.id, 'make-entry-angle')
  assert.match(hint?.message ?? '', /주차 공간 중간/)
})

test('진입점 전에는 위치 기반 안내를 제공한다', () => {
  const hint = getLearningHint(INITIAL_VEHICLE_STATE, 'both-sides')
  assert.equal(hint?.id, 'set-entry-point')
  assert.equal(hint?.level, 'info')
})
