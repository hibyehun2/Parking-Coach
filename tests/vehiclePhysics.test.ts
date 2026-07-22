import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_VEHICLE_CONFIG,
  INITIAL_VEHICLE_STATE,
  PARKING_ALIGNMENT_SPEED,
  PARKING_APPROACH_SPEED,
  parkingCreepSpeed,
  updateVehicle,
  withGear,
  withSteeringAngle,
} from '../src/engine/vehiclePhysics.ts'
import { TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'

const movingStraight = { steeringDirection: 0 as const, braking: false }

test('주차 연습용 크리프 속도는 저속으로 제한된다', () => {
  assert.ok(DEFAULT_VEHICLE_CONFIG.creepSpeed <= 0.7)
})

test('주차칸 접근 구역과 내부 정렬 구역에서 단계적으로 감속한다', () => {
  const approach = {
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: TARGET_PARKING_BAY.top - 1,
  }
  const alignment = { ...approach, y: TARGET_PARKING_BAY.top + 0.5 }
  assert.equal(parkingCreepSpeed(approach), PARKING_APPROACH_SPEED)
  assert.equal(parkingCreepSpeed(alignment), PARKING_ALIGNMENT_SPEED)
  assert.ok(PARKING_ALIGNMENT_SPEED < PARKING_APPROACH_SPEED)
  assert.ok(PARKING_APPROACH_SPEED < DEFAULT_VEHICLE_CONFIG.creepSpeed)
})

function simulate(duration: number, step: number) {
  let state = withGear({ ...INITIAL_VEHICLE_STATE }, 'D')
  for (let elapsed = 0; elapsed < duration - step / 2; elapsed += step) {
    state = updateVehicle(state, movingStraight, step)
  }
  return state
}

test('delta time이 달라도 같은 시간의 이동 거리가 유사하다', () => {
  const sixtyFps = simulate(2, 1 / 60)
  const thirtyFps = simulate(2, 1 / 30)
  assert.ok(Math.abs(sixtyFps.x - thirtyFps.x) < 0.001)
})

test('D는 전진하고 R은 후진한다', () => {
  const forward = updateVehicle(withGear({ ...INITIAL_VEHICLE_STATE }, 'D'), movingStraight, 1)
  const reverse = updateVehicle(withGear({ ...INITIAL_VEHICLE_STATE }, 'R'), movingStraight, 1)
  assert.ok(forward.x > INITIAL_VEHICLE_STATE.x)
  assert.ok(reverse.x < INITIAL_VEHICLE_STATE.x)
})

test('전진과 후진에서 같은 조향의 회전 방향이 반대다', () => {
  const input = { steeringDirection: 1 as const, braking: false }
  const start = { ...INITIAL_VEHICLE_STATE, steeringAngle: DEFAULT_VEHICLE_CONFIG.maxSteeringAngle }
  const forward = updateVehicle(withGear(start, 'D'), input, 0.5)
  const reverse = updateVehicle(withGear(start, 'R'), input, 0.5)
  assert.ok(forward.heading > start.heading)
  assert.ok(reverse.heading < start.heading)
})

test('조향각은 최대값을 넘지 않는다', () => {
  let state = { ...INITIAL_VEHICLE_STATE }
  for (let index = 0; index < 100; index += 1) {
    state = updateVehicle(state, { steeringDirection: 1, braking: true }, 0.1)
  }
  assert.equal(state.steeringAngle, DEFAULT_VEHICLE_CONFIG.maxSteeringAngle)
})

test('브레이크를 누르면 즉시 정지한다', () => {
  const state = updateVehicle(
    { ...INITIAL_VEHICLE_STATE, speed: 1 },
    { steeringDirection: 0, braking: true },
    1 / 60,
  )
  assert.equal(state.speed, 0)
  assert.equal(state.x, INITIAL_VEHICLE_STATE.x)
  assert.equal(state.y, INITIAL_VEHICLE_STATE.y)
})

test('직접 설정한 조향각도 최대값으로 제한된다', () => {
  const state = withSteeringAngle({ ...INITIAL_VEHICLE_STATE }, Math.PI)
  assert.equal(state.steeringAngle, DEFAULT_VEHICLE_CONFIG.maxSteeringAngle)
})
