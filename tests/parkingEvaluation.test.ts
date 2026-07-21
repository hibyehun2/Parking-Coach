import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TARGET_PARKING_BAY,
  evaluateParking,
  isVehicleInsideParkingBay,
  vehicleCorners,
} from '../src/engine/parkingEvaluation.ts'
import { INITIAL_VEHICLE_STATE, type VehicleState } from '../src/engine/vehiclePhysics.ts'

function parked(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: TARGET_PARKING_BAY.center.y,
    heading: TARGET_PARKING_BAY.heading,
    speed: 0,
    braking: true,
    ...overrides,
  }
}

test('차량 네 모서리가 모두 주차선 내부이면 성공한다', () => {
  const vehicle = parked()
  assert.equal(vehicleCorners(vehicle).length, 4)
  assert.equal(isVehicleInsideParkingBay(vehicle), true)
  assert.equal(evaluateParking(vehicle, []).success, true)
})

test('모서리 일부가 주차선 밖이면 미완료다', () => {
  const result = evaluateParking(parked({ x: TARGET_PARKING_BAY.left + 0.7 }), [])
  assert.equal(result.fullyInside, false)
  assert.equal(result.success, false)
})

test('차량 전체가 내부여도 이동 중이면 미완료다', () => {
  const result = evaluateParking(parked({ speed: 0.2, braking: false }), [])
  assert.equal(result.fullyInside, true)
  assert.equal(result.stopped, false)
  assert.equal(result.success, false)
})

test('중심 오차와 각도 오차를 별도로 계산한다', () => {
  const result = evaluateParking(parked({
    x: TARGET_PARKING_BAY.center.x + 0.2,
    heading: TARGET_PARKING_BAY.heading + Math.PI / 36,
  }), [])
  assert.ok(Math.abs(result.centerError - 0.2) < 1e-9)
  assert.ok(Math.abs(result.angleErrorDegrees - 5) < 1e-9)
})

test('반대 방향으로 평행 주차해도 각도 오차는 0도다', () => {
  const result = evaluateParking(parked({ heading: -Math.PI / 2 }), [])
  assert.ok(result.angleErrorDegrees < 1e-9)
})

test('충돌 이력을 결과에 포함한다', () => {
  const collision = { obstacleId: 'wall', kind: 'wall' as const, position: { x: 9, y: 9 } }
  const result = evaluateParking(parked(), [collision])
  assert.equal(result.collisionCount, 1)
  assert.deepEqual(result.collisions, [collision])
})
