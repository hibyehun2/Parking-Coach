import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildResultCollisionQuiz } from '../src/engine/resultCollisionQuiz.ts'
import type { ReplayEvent } from '../src/engine/sessionReplay.ts'

function event(
  gear: 'D' | 'R',
  contactZone: 'front-left' | 'front-right' | 'rear-left' | 'rear-right',
): ReplayEvent {
  const reversing = gear === 'R'
  const vehicle = {
    x: 15,
    y: reversing ? 5.45 : 3.1,
    heading: -Math.PI / 2,
    steeringAngle: contactZone.includes('left') ? -.42 : .42,
    speed: 0,
    gear,
    braking: true,
  }
  return {
    id: `${gear}-${contactZone}`,
    elapsedSeconds: 4,
    type: 'collision',
    label: '충돌',
    vehicle,
    impactVehicle: { ...vehicle, y: vehicle.y + (reversing ? .3 : -.3) },
    collision: {
      obstacleId: reversing ? 'parked-left' : 'wall-top',
      kind: reversing ? 'vehicle' : 'wall',
      position: { x: vehicle.x, y: vehicle.y },
      contactZone,
    },
  }
}

test('결과 퀴즈는 실제 충돌 모서리를 위험 지점 정답으로 사용한다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2 })
  for (const zone of ['front-left', 'front-right', 'rear-left', 'rear-right'] as const) {
    const quiz = buildResultCollisionQuiz(event('R', zone), runtime)
    assert.equal(quiz.risk.answer, zone)
    assert.equal(quiz.risk.choices.length, 4)
    assert.equal(new Set(quiz.risk.choices.map(({ id }) => id)).size, 4)
  }
})

test('수정 정답은 계속 진행이 아니며 실제 배치에서 충돌하지 않는다', () => {
  for (const scenarioId of ['both-sides', 'narrow-aisle'] as const) {
    const runtime = createScenarioRuntime(scenarioId, { seed: 2 })
    for (const gear of ['D', 'R'] as const) {
      const quiz = buildResultCollisionQuiz(event(gear, 'front-right'), runtime)
      assert.notEqual(quiz.correction.answer, 'continue')
      if (quiz.correction.answer === 'restart') continue
      assert.equal(quiz.correctionSimulations[quiz.correction.answer].collided, false)
    }
  }
})

test('충돌 경로를 계속 진행하는 선택은 정답이 될 수 없다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2 })
  const quiz = buildResultCollisionQuiz(event('R', 'rear-left'), runtime)
  const continueChoice = quiz.correction.choices.find(({ id }) => id === 'continue')

  assert.ok(continueChoice)
  assert.notEqual(quiz.correction.answer, continueChoice.id)
  assert.match(continueChoice.feedback, /같은 위험 지점/)
})
