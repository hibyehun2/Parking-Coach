import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { detectCollision } from '../src/engine/collisionDetection.ts'
import { buildLessonSimulation, buildNarrowAisleLessonSimulation, lessonDriverShoulder } from '../src/engine/lessonSimulation.ts'
import { isVehicleInsideParkingBay, TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'

test('1단계는 운전자 어깨가 진행 방향의 주차칸 끝 선에 맞을 때 정지한다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2 })
  const stages = buildLessonSimulation(runtime)
  const shoulder = lessonDriverShoulder(stages[0].states.at(-1)!)

  assert.ok(Math.abs(shoulder.x - TARGET_PARKING_BAY.right) < 0.01)
})

test('각 단계의 마지막 위치와 다음 단계의 시작 위치가 연속된다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2 })
  const stages = buildLessonSimulation(runtime)

  for (let index = 0; index < stages.length - 1; index += 1) {
    const end = stages[index].states.at(-1)!
    const start = stages[index + 1].states[0]
    assert.ok(Math.hypot(end.x - start.x, end.y - start.y) < 0.001)
    assert.ok(Math.abs(end.heading - start.heading) < 0.001)
  }
})

test('기본 상황의 전체 안내 경로는 충돌 없이 목표 주차칸 안에서 끝난다', () => {
  for (const scenarioId of ['both-sides', 'one-side', 'wall-side'] as const) {
    const runtime = createScenarioRuntime(scenarioId, { seed: 2 })
    const stages = buildLessonSimulation(runtime)
    const states = stages.flatMap(({ states: items }) => items)

    assert.equal(states.some((vehicle) => detectCollision(vehicle, 0, runtime)), false, scenarioId)
    assert.equal(isVehicleInsideParkingBay(states.at(-1)!), true, scenarioId)
  }
})

test('오른쪽 출발 경로는 끝 선과 최종 주차 위치가 좌우 대칭이다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 3, firstSuccess: true })
  const stages = buildLessonSimulation(runtime)
  const shoulder = lessonDriverShoulder(stages[0].states.at(-1)!)
  const finalVehicle = stages.at(-1)!.states.at(-1)!

  assert.equal(runtime.startSide, 'right')
  assert.ok(Math.abs(shoulder.x - TARGET_PARKING_BAY.left) < 0.01)
  assert.equal(isVehicleInsideParkingBay(finalVehicle), true)
})

test('좁은 통로 7단계는 충돌 없이 연속되고 전진 수정 후 주차칸 안에서 끝난다', () => {
  const runtime = createScenarioRuntime('narrow-aisle', { seed: 2 })
  const stages = buildNarrowAisleLessonSimulation(runtime)
  assert.equal(stages.length, 7)
  assert.equal(stages[5].states[0].gear, 'D')
  for (let index = 0; index < stages.length - 1; index += 1) {
    const end = stages[index].states.at(-1)!
    const start = stages[index + 1].states[0]
    assert.ok(Math.hypot(end.x - start.x, end.y - start.y) < .001)
  }
  assert.equal(stages.flatMap(({ states }) => states).some((vehicle) => detectCollision(vehicle, 0, runtime)), false)
  assert.equal(isVehicleInsideParkingBay(stages.at(-1)!.states.at(-1)!), true)
})
