import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildCorrectionDrills } from '../src/engine/correctionDrills.ts'
import { detectCollision } from '../src/engine/collisionDetection.ts'
import { simulateJudgmentChoice } from '../src/engine/judgmentScenarios.ts'
import { isVehicleInsideParkingBay } from '../src/engine/parkingEvaluation.ts'

test('일반 수정 훈련은 비스듬한 자세·안쪽 차량·바깥쪽 모서리 드릴로 구성된다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
  assert.deepEqual(drills.map(({ id }) => id), ['crooked', 'inner-clearance', 'outer-swing'])
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
      }
    }
  }
})
