import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildCorrectionDrills } from '../src/engine/correctionDrills.ts'
import { detectCollision } from '../src/engine/collisionDetection.ts'
import { simulateJudgmentChoice } from '../src/engine/judgmentScenarios.ts'
import { evaluateParking, isVehicleInsideParkingBay } from '../src/engine/parkingEvaluation.ts'

test('일반 수정 훈련은 비스듬한 자세·가운데 맞추기·모서리 위험 드릴로 구성된다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
  assert.deepEqual(drills.map(({ id }) => id), ['crooked', 'off-center', 'inner-clearance', 'outer-swing'])
  assert.ok(drills.every(({ steps }) => steps.length >= 3))
})

test('좁은 통로 훈련은 여러 번의 전진 수정과 재후진 판단을 연속 제공한다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('narrow-aisle', { seed: 2 }))
  assert.equal(drills.length, 1)
  assert.equal(drills[0].id, 'narrow-multipoint')
  assert.ok(drills[0].steps.length >= 6)
  assert.match(drills[0].steps.map(({ title }) => title).join(' '), /첫 번째 짧은 전진 수정/)
  assert.match(drills[0].steps.map(({ title }) => title).join(' '), /두 번째 각도 수정/)
})

test('비스듬한 자세와 가운데 치우침 문항은 설명에 맞는 주차칸 내부 상태를 사용한다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
  const crooked = drills.find(({ id }) => id === 'crooked')!
  const offCenter = drills.find(({ id }) => id === 'off-center')!
  const crookedResult = evaluateParking(crooked.steps[0].vehicle, [])
  const offCenterResult = evaluateParking(offCenter.steps[0].vehicle, [])

  assert.equal(crookedResult.fullyInside, true)
  assert.ok(crookedResult.angleErrorDegrees >= 5 && crookedResult.angleErrorDegrees <= 7)
  assert.equal(offCenterResult.fullyInside, true)
  assert.ok(offCenterResult.angleErrorDegrees < .1)
  assert.ok(Math.abs(offCenter.steps[0].vehicle.x - 15) >= .15)
})

test('위험 모서리 문항은 설명과 같은 모서리를 탑뷰에 표시한다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const drills = buildCorrectionDrills(runtime)
    const inner = drills.find(({ id }) => id === 'inner-clearance')!
    const outer = drills.find(({ id }) => id === 'outer-swing')!
    assert.equal(inner.steps[0].focusZone, runtime.startSide === 'left' ? 'rear-right' : 'rear-left')
    assert.equal(outer.steps[0].focusZone, runtime.startSide === 'left' ? 'front-left' : 'front-right')
  }
})

test('정답 문구는 실제 조작 순서를 쓰고 모호한 조향 표현을 사용하지 않는다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
  const labels = drills.flatMap(({ steps }) => steps.map((step) => step.choices.find(({ id }) => id === step.answer)!.label)).join(' ')
  assert.doesNotMatch(labels, /주차 방향 조향|중앙 조향/)
  assert.match(labels, /정지/)
  assert.match(labels, /핸들을 정면/)
})

test('각 드릴의 정답 경로는 충돌 없이 다음 판단 위치로 이어지고 최종 주차를 완료한다', () => {
  for (const scenarioId of ['both-sides', 'narrow-aisle'] as const) {
    for (const seed of [2, 3]) {
      const runtime = createScenarioRuntime(scenarioId, { seed, firstSuccess: true })
      for (const drill of buildCorrectionDrills(runtime)) {
        let finalVehicle = drill.steps[0].vehicle
        for (let index = 0; index < drill.steps.length; index += 1) {
          const step = drill.steps[index]
          assert.ok(Math.hypot(finalVehicle.x - step.vehicle.x, finalVehicle.y - step.vehicle.y) < .02, `${drill.id}/${step.id} 위치 연속성`)
          const answer = step.choices.find(({ id }) => id === step.answer)!
          const simulation = simulateJudgmentChoice(step.vehicle, answer, runtime)
          assert.equal(simulation.collided, false, `${drill.id}/${step.id} 정답 충돌`)
          assert.equal(simulation.states.some((vehicle) => Boolean(detectCollision(vehicle, 0, runtime))), false)
          finalVehicle = simulation.states.at(-1)!
        }
        assert.equal(isVehicleInsideParkingBay(finalVehicle), true, `${scenarioId}/${runtime.startSide}/${drill.id} 최종 주차`)
        assert.ok(Math.abs(finalVehicle.y - 9.75) < .08, `${scenarioId}/${runtime.startSide}/${drill.id} 양옆 차량과 주차 높이`)
      }
    }
  }
})
