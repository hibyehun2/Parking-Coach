import assert from 'node:assert/strict'
import test from 'node:test'
import { getLearningHint } from '../src/engine/learningHints.ts'
import { PARKED_VEHICLES } from '../src/engine/collisionDetection.ts'
import { TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'
import { DEFAULT_VEHICLE_CONFIG, INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { parkingCameraCueCenter } from '../src/engine/parkingLotRenderer.ts'

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

test('평행 상태에서 직선 후진을 시작하면 진입 위치와 양쪽 간격을 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: TARGET_PARKING_BAY.top - 1.5,
    gear: 'R',
    steeringAngle: 0,
  }, 'both-sides')

  assert.equal(hint?.id, 'align-camera-corner')
  assert.match(hint?.message ?? '', /직선 후진.*양쪽 간격.*주차칸 입구/)
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

test('주차칸을 충분히 지나기 전에는 나란히 이동하도록 안내한다', () => {
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    gear: 'D',
    steeringAngle: 0,
  }, 'both-sides')

  assert.equal(hint?.id, 'set-camera-approach')
  assert.match(hint?.message ?? '', /주차칸.*지나/)
})

test('주차칸을 충분히 지나면 탑뷰와 간격을 보며 후진 위치를 맞추도록 안내한다', () => {
  const cue = parkingCameraCueCenter('left')
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: cue.x + 1,
    y: cue.y,
    gear: 'D',
    steeringAngle: 0,
  }, 'both-sides')

  assert.equal(hint?.id, 'camera-reverse-ready')
  assert.match(hint?.message ?? '', /R.*탑뷰.*간격.*직선 후진/)
})

test('직선 후진 중에는 후방 가이드와 양쪽 간격을 함께 확인하도록 안내한다', () => {
  const cue = parkingCameraCueCenter('left')
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    x: cue.x + 0.5,
    y: cue.y,
    gear: 'R',
    steeringAngle: 0,
  }, 'both-sides')

  assert.equal(hint?.id, 'align-camera-corner')
  assert.match(hint?.message ?? '', /후방 가이드.*양쪽 간격/)
})

test('후진 진입 위치에 도착하면 간격 확인 후 최대 조향을 안내한다', () => {
  const cue = parkingCameraCueCenter('left')
  const hint = getLearningHint({
    ...INITIAL_VEHICLE_STATE,
    ...cue,
    gear: 'R',
    steeringAngle: 0,
  }, 'both-sides')

  assert.equal(hint?.id, 'camera-corner-ready')
  assert.match(hint?.message ?? '', /양쪽 간격.*정지.*끝까지/)
})

test('오른쪽 출발에서도 모서리 기준과 최대 조향 방향을 반대로 안내한다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 3, firstSuccess: true })
  const cue = parkingCameraCueCenter('right')
  const ready = getLearningHint({
    ...runtime.initialVehicle,
    ...cue,
    heading: Math.PI,
    gear: 'R',
    steeringAngle: 0,
  }, 'both-sides', runtime)
  const turning = getLearningHint({
    ...runtime.initialVehicle,
    ...cue,
    heading: Math.PI,
    gear: 'R',
    steeringAngle: -DEFAULT_VEHICLE_CONFIG.maxSteeringAngle,
  }, 'both-sides', runtime)

  assert.equal(ready?.id, 'camera-corner-ready')
  assert.equal(turning?.id, 'keep-full-steering')
})
