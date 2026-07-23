import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveWheelStop, WHEEL_STOP } from '../src/engine/wheelStop.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

test('후진 중 뒷바퀴가 방지턱에 닿으면 접촉 위치에서 정지한다', () => {
  const base = {
    ...INITIAL_VEHICLE_STATE,
    x: 15,
    heading: -Math.PI / 2,
    gear: 'R' as const,
    braking: false,
    speed: -0.3,
  }
  const result = resolveWheelStop(
    { ...base, y: WHEEL_STOP.y - 1.35 - .05 },
    { ...base, y: WHEEL_STOP.y - 1.35 + .05 },
  )
  assert.equal(result.contacted, true)
  assert.equal(result.vehicle.speed, 0)
  assert.equal(result.vehicle.braking, true)
})

test('전진하거나 주차칸 밖이면 방지턱이 이동을 막지 않는다', () => {
  const previous = { ...INITIAL_VEHICLE_STATE, x: 10, y: 10, gear: 'D' as const }
  const next = { ...previous, y: 10.2 }
  assert.equal(resolveWheelStop(previous, next).contacted, false)
})
