import assert from 'node:assert/strict'
import test from 'node:test'
import { activeCorners } from '../src/engine/cornerAssistance.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

test('후진 조향 방향에 맞춰 뒤 모서리와 반대쪽 앞 모서리를 표시한다', () => {
  assert.deepEqual(activeCorners({ ...INITIAL_VEHICLE_STATE, gear: 'R', steeringAngle: 0.3 }), ['left-front', 'right-rear'])
  assert.deepEqual(activeCorners({ ...INITIAL_VEHICLE_STATE, gear: 'R', steeringAngle: -0.3 }), ['right-front', 'left-rear'])
})

test('후진 직선에서는 양쪽 뒤 모서리를 표시한다', () => {
  assert.deepEqual(activeCorners({ ...INITIAL_VEHICLE_STATE, gear: 'R', steeringAngle: 0 }), ['left-rear', 'right-rear'])
})
