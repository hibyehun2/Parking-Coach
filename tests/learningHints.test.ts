import assert from 'node:assert/strict'
import test from 'node:test'
import { getLearningHint } from '../src/engine/learningHints.ts'
import { PARKED_VEHICLES } from '../src/engine/collisionDetection.ts'
import { TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'
import { createScenarioRuntime } from '../src/data/scenarios.ts'

test('충돌과 장애물 근접 경고가 일반 안내보다 우선한다', () => {
  const parkedVehicle = PARKED_VEHICLES[0]
  const collision = getLearningHint({ ...INITIAL_VEHICLE_STATE, x: parkedVehicle.x, y: parkedVehicle.y, heading: parkedVehicle.heading }, 'both-sides')
  assert.equal(collision?.level, 'danger')
  assert.equal(collision?.id, 'collision')

  const nearVehicle = getLearningHint({ ...INITIAL_VEHICLE_STATE, x: parkedVehicle.x, y: parkedVehicle.y - 2.85, heading: parkedVehicle.heading }, 'one-side')
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
  }, 'wall-side')
  assert.equal(hint?.id, 'alternate-side-mirrors')
  assert.match(hint?.title ?? '', /좌우 사이드미러/)
  assert.match(hint?.message ?? '', /벽면.*반대편/)
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
  assert.match(hint?.message ?? '', /주차 공간 방향/)
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

test('진입 위치에 도달하기 전에 조향하면 먼저 위치를 맞추도록 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    gear: 'D',
    steeringAngle: -0.3,
  }, 'both-sides')

  assert.equal(hint?.id, 'turning-too-early')
  assert.match(hint?.message ?? '', /중앙.*진입 위치/)
})

test('진입 구간에서만 차를 비스듬히 세우도록 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: 12,
    heading: -0.12,
    gear: 'D',
    steeringAngle: -0.3,
  }, 'both-sides')

  assert.equal(hint?.id, 'make-entry-angle')
  assert.match(hint?.message ?? '', /후진할 공간/)
})

test('충분한 진입각을 만들면 전진 대신 정지를 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: 12.5,
    heading: -0.6,
    gear: 'D',
    steeringAngle: -0.3,
  }, 'both-sides')

  assert.equal(hint?.id, 'entry-angle-ready')
  assert.match(hint?.message ?? '', /완전히 정지/)
})

test('오른쪽 출발에서는 조향 방향을 반대로 판정한다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 3, firstSuccess: true })
  const hint = getLearningHint({
    ...runtime.initialVehicle,
    x: 18,
    heading: Math.PI + 0.12,
    gear: 'D',
    steeringAngle: 0.3,
  }, 'both-sides', runtime)

  assert.equal(hint?.id, 'make-entry-angle')
})

test('진입점 전에는 위치 기반 안내를 제공한다', () => {
  const hint = getLearningHint(INITIAL_VEHICLE_STATE, 'both-sides')
  assert.equal(hint?.id, 'set-entry-point')
  assert.equal(hint?.level, 'info')
})
