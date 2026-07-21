import assert from 'node:assert/strict'
import test from 'node:test'
import {
  boxesIntersect,
  detectCollision,
  resolveVehicleCollision,
  type OrientedBox,
} from '../src/engine/collisionDetection.ts'
import { INITIAL_VEHICLE_STATE, type VehicleState } from '../src/engine/vehiclePhysics.ts'

function box(x: number, y: number, heading = 0): OrientedBox {
  return { center: { x, y }, halfLength: 2.3, halfWidth: 0.9, heading }
}

test('OBB 모서리가 닿는 충돌을 감지한다', () => {
  assert.equal(boxesIntersect(box(0, 0), box(3, 1.2, Math.PI / 4)), true)
})

test('회전한 OBB가 떨어져 있으면 충돌하지 않는다', () => {
  assert.equal(boxesIntersect(box(0, 0, Math.PI / 6), box(6, 4, -Math.PI / 5)), false)
})

test('장애 차량, 기둥, 벽 충돌을 구분한다', () => {
  const parked = detectCollision({ ...INITIAL_VEHICLE_STATE, x: 6.3, y: 8.75, heading: Math.PI / 2 })
  const pillar = detectCollision({ ...INITIAL_VEHICLE_STATE, x: 15.025, y: 6.375, heading: 0 })
  const wall = detectCollision({ ...INITIAL_VEHICLE_STATE, x: 9, y: 1.2, heading: Math.PI / 2 })
  assert.equal(parked?.kind, 'vehicle')
  assert.equal(pillar?.kind, 'pillar')
  assert.equal(wall?.kind, 'wall')
})

test('큰 이동 간격에서도 벽을 통과하지 않고 마지막 안전 위치에 정지한다', () => {
  const previous: VehicleState = { ...INITIAL_VEHICLE_STATE, x: 9, y: 3.3, heading: Math.PI / 2 }
  const next: VehicleState = { ...previous, y: 13, speed: 0.6, braking: false }
  const result = resolveVehicleCollision(previous, next)
  assert.equal(result.collision?.kind, 'wall')
  assert.ok(result.vehicle.y < next.y)
  assert.equal(result.vehicle.speed, 0)
  assert.equal(result.vehicle.braking, true)
  assert.equal(detectCollision(result.vehicle), null)
})
