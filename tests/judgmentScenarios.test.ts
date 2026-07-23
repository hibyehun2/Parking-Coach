import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildJudgmentGuide, buildJudgmentScenarios, simulateJudgmentChoice } from '../src/engine/judgmentScenarios.ts'

test('수정 판단 훈련은 안내 예시와 서로 다른 6개 핵심 판단 유형을 제공한다', () => {
  const scenarios = buildJudgmentScenarios(createScenarioRuntime('both-sides', { seed: 2 }))
  const guide = buildJudgmentGuide(createScenarioRuntime('both-sides', { seed: 2 }))

  assert.equal(guide.id, 'guided-safe-recovery')
  assert.equal(scenarios.length, 6)
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 6)
  assert.equal(new Set(scenarios.map(({ skill }) => skill)).size, 6)
  assert.equal(new Set(scenarios.map(({ question }) => question)).size, 6)
})

test('각 판단 문제는 하나의 유효한 정답과 서로 다른 선택지를 가진다', () => {
  const scenarios = buildJudgmentScenarios(createScenarioRuntime('narrow-aisle', { seed: 3 }))

  for (const scenario of scenarios) {
    const choiceIds = scenario.choices.map(({ id }) => id)
    assert.equal(scenario.choices.length, 3)
    assert.equal(new Set(choiceIds).size, choiceIds.length)
    assert.ok(choiceIds.includes(scenario.answer), `${scenario.id} 정답이 선택지에 있어야 한다`)
  }
})

test('차량 이동을 묻는 문제의 선택지는 기어·조향·시간이 명시된 장면별 이동을 사용한다', () => {
  const scenarios = buildJudgmentScenarios(createScenarioRuntime('both-sides', { seed: 2 }))
  const movingSkills = [
    'stop-timing',
    'first-correction',
    'reentry-decision',
  ]

  for (const scenario of scenarios.filter(({ skill }) => movingSkills.includes(skill))) {
    assert.ok(scenario.choices.some(({ motion }) => motion?.length), `${scenario.id}에 선택 결과 이동이 필요하다`)
    for (const choice of scenario.choices) {
      for (const motion of choice.motion ?? []) {
        assert.ok(motion.seconds > 0 && motion.seconds <= 2.2)
        assert.ok(Math.abs(motion.steeringAngle) <= .58)
      }
    }
  }
})

test('정답으로 제시한 이동은 실제 장애물 충돌 없이 끝난다', () => {
  for (const scenarioId of ['both-sides', 'narrow-aisle'] as const) {
    for (const seed of [2, 3]) {
      const runtime = createScenarioRuntime(scenarioId, { seed, firstSuccess: true })
      const scenarios = [buildJudgmentGuide(runtime), ...buildJudgmentScenarios(runtime)]
      for (const scenario of scenarios) {
        const answer = scenario.choices.find(({ id }) => id === scenario.answer)!
        if (!answer.motion?.length) continue
        const simulation = simulateJudgmentChoice(scenario.vehicle, answer, runtime)
        assert.equal(simulation.collided, false, `${scenarioId}/${runtime.startSide}/${scenario.id} 정답 이동이 충돌하면 안 된다`)
        assert.ok(simulation.states.length > 1)
      }
    }
  }
})

test('선택 전에는 정답 위험 지점을 노출하지 않고 선택지에만 강조 위치를 둔다', () => {
  const scenarios = buildJudgmentScenarios(createScenarioRuntime('both-sides', { seed: 2 }))
  const prediction = scenarios.find(({ skill }) => skill === 'hazard-prediction')!

  assert.equal('focusZone' in prediction, false)
  assert.ok(prediction.choices.find(({ id }) => id === prediction.answer)?.focusZone)
})
