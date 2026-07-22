import assert from 'node:assert/strict'
import test from 'node:test'
import {
  REVERSE_GUIDE_LEVELS,
  reverseTrapezoidGeometry,
} from '../src/engine/parkingLotRenderer.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

test('후방 거리 가이드는 50cm부터 빨강, 노랑, 초록 순서다', () => {
  assert.deepEqual(
    REVERSE_GUIDE_LEVELS.map(({ distance, color }) => ({ distance, color })),
    [
      { distance: 0.5, color: '#ff453a' },
      { distance: 1.5, color: '#ffd60a' },
      { distance: 3, color: '#30d158' },
    ],
  )
})

test('후방 사다리꼴은 차량에서 멀어질수록 넓어진다', () => {
  const levels = reverseTrapezoidGeometry(INITIAL_VEHICLE_STATE)
  const widths = levels.map((level) => Math.hypot(
    level.right.x - level.left.x,
    level.right.y - level.left.y,
  ))

  assert.ok(widths[0] < widths[1])
  assert.ok(widths[1] < widths[2])
})

test('차량이 회전하면 후방 사다리꼴도 같은 방향으로 회전한다', () => {
  const levels = reverseTrapezoidGeometry({
    ...INITIAL_VEHICLE_STATE,
    heading: Math.PI / 2,
  })

  assert.ok(levels[0].left.y < INITIAL_VEHICLE_STATE.y)
  assert.ok(levels[2].left.y < levels[0].left.y)
})
