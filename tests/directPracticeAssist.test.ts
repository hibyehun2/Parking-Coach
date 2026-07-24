import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import {
  directPracticeCamera,
  directPracticePrecisionProgress,
  directPracticeSpeedProfile,
} from '../src/engine/directPracticeAssist.ts'
import { TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'

test('왼쪽 출발은 차량 앞부분이 주차칸에 닿을 때부터 부드럽게 확대된다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2, practiceMode: 'learning' })
  const before = { ...runtime.initialVehicle, x: TARGET_PARKING_BAY.left - 2.31 }
  const entering = { ...before, x: TARGET_PARKING_BAY.left - 1.4 }
  const passed = { ...before, x: TARGET_PARKING_BAY.left }

  assert.equal(directPracticePrecisionProgress(before, runtime), 0)
  assert.ok(directPracticePrecisionProgress(entering, runtime) > 0)
  assert.ok(directPracticeCamera(passed, runtime).zoom > directPracticeCamera(entering, runtime).zoom)
})

test('오른쪽 출발도 좌우 대칭으로 확대되고 정밀 속도 프로필을 사용한다', () => {
  const runtime = createScenarioRuntime('both-sides', {
    seed: 3,
    firstSuccess: true,
    practiceMode: 'learning',
  })
  const before = { ...runtime.initialVehicle, x: TARGET_PARKING_BAY.right + 2.31 }
  const entering = { ...before, x: TARGET_PARKING_BAY.right + 1.4 }

  assert.equal(runtime.startSide, 'right')
  assert.equal(directPracticePrecisionProgress(before, runtime), 0)
  assert.ok(directPracticePrecisionProgress(entering, runtime) > 0)
  assert.deepEqual(directPracticeSpeedProfile(runtime), {
    approachSpeed: 0.34,
    alignmentSpeed: 0.24,
    startSide: 'right',
  })
})
