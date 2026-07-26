import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { detectCollision } from '../src/engine/collisionDetection.ts'
import { buildJudgmentReferenceSimulation, buildLessonSimulation, buildNarrowAisleLessonSimulation, buildTwoBayShoulderSimulation, lessonDriverShoulder, withTwoBayReferenceVehicle } from '../src/engine/lessonSimulation.ts'
import { evaluateParking, isVehicleInsideParkingBay } from '../src/engine/parkingEvaluation.ts'
import { isRedGuideAlignedWithParkingLine, parkingCameraCueCenter } from '../src/engine/parkingLotRenderer.ts'

test('기본 안내는 주차칸을 충분히 지나 나란히 정지한 뒤 진입 위치를 맞춘다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2 })
  const stages = buildLessonSimulation(runtime)
  const cue = parkingCameraCueCenter('left')
  const approachEnd = stages[0].states.at(-1)!
  const cameraCueEnd = stages[1].states.at(-1)!

  assert.ok(Math.abs(approachEnd.x - (cue.x + 1)) < 0.01)
  assert.ok(Math.abs(approachEnd.heading) < 0.001)
  assert.equal(cameraCueEnd.gear, 'R')
  assert.ok(Math.abs(cameraCueEnd.steeringAngle) < 0.001)
  assert.equal(isRedGuideAlignedWithParkingLine(cameraCueEnd), true)
})

test('판단 연습 기준 경로는 직접 연습의 후방 화면 경로와 분리된다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2 })
  const directStages = buildLessonSimulation(runtime)
  const judgmentStages = buildJudgmentReferenceSimulation(runtime)

  assert.equal(directStages[0].states[0].y, 5.2)
  assert.equal(judgmentStages[0].states[0].y, 4)
  assert.equal(directStages[1].states.at(-1)?.heading, 0)
  assert.ok((judgmentStages[1].states.at(-1)?.heading ?? 0) < 0)
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

test('오른쪽 출발 경로도 진입 기준과 최종 주차 위치가 좌우 대칭이다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 3, firstSuccess: true })
  const stages = buildLessonSimulation(runtime)
  const cameraCueEnd = stages[1].states.at(-1)!
  const finalVehicle = stages.at(-1)!.states.at(-1)!

  assert.equal(runtime.startSide, 'right')
  assert.equal(isRedGuideAlignedWithParkingLine(cameraCueEnd), true)
  assert.equal(isVehicleInsideParkingBay(finalVehicle), true)
})

test('두 칸 옆 어깨선 경로는 기준선에서 연속 후진해 충돌 없이 목표 칸 가운데로 들어간다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const visualRuntime = withTwoBayReferenceVehicle(runtime)
    const stages = buildTwoBayShoulderSimulation(runtime)
    const states = stages.flatMap(({ states: items }) => items)
    const referenceVehicle = visualRuntime.parkedVehicles.find(({ id }) => id.startsWith('lesson-second-'))!
    const referenceLineX = referenceVehicle.x + (runtime.startSide === 'right' ? -1.35 : 1.35)
    const shoulder = lessonDriverShoulder(stages[1].states.at(-1)!)
    const finalResult = evaluateParking(states.at(-1)!, [])

    assert.equal(stages.length, 6)
    assert.ok(Math.abs(shoulder.x - referenceLineX) < .01)
    for (let index = 0; index < stages.length - 1; index += 1) {
      const end = stages[index].states.at(-1)!
      const start = stages[index + 1].states[0]
      assert.ok(Math.hypot(end.x - start.x, end.y - start.y) < .001)
      assert.ok(Math.abs(end.heading - start.heading) < .001)
    }
    assert.equal(states.some((vehicle) => Boolean(detectCollision(vehicle, 0, visualRuntime))), false)
    assert.equal(finalResult.fullyInside, true)
    assert.ok(finalResult.centerError < .01)
    assert.ok(finalResult.angleErrorDegrees < .1)
  }
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
