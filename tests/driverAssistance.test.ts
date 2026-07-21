import assert from 'node:assert/strict'
import test from 'node:test'
import { rearSensorDistance } from '../src/engine/driverAssistance.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

test('후방 5m 안에 장애물이 없으면 거리 없음으로 표시한다', () => {
  assert.equal(rearSensorDistance(INITIAL_VEHICLE_STATE), null)
})

test('차량 뒤쪽 벽까지의 충돌 여유 거리를 계산한다', () => {
  const distance = rearSensorDistance({ ...INITIAL_VEHICLE_STATE, x: 4, y: 4, heading: 0 })
  assert.ok(distance !== null)
  assert.ok(distance >= 0.7 && distance <= 0.9)
})

test('차량이 회전하면 후방 센서 방향도 함께 회전한다', () => {
  const horizontal = rearSensorDistance({ ...INITIAL_VEHICLE_STATE, x: 4, y: 4, heading: 0 })
  const vertical = rearSensorDistance({ ...INITIAL_VEHICLE_STATE, x: 4, y: 4, heading: Math.PI / 2 })
  assert.notEqual(horizontal, vertical)
})
