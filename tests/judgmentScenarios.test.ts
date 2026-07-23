import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildJudgmentGuide, simulateJudgmentChoice } from '../src/engine/judgmentScenarios.ts'

test('안내 예시는 정지 후 방금 곡선을 반대 기어로 짧게 되돌아간다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const guide = buildJudgmentGuide(runtime)
    const answer = guide.choices.find(({ id }) => id === guide.answer)!
    assert.equal(answer.motion?.[0].gear, 'D')
    assert.equal(answer.motion?.[0].steeringAngle, guide.vehicle.steeringAngle)
    assert.equal(simulateJudgmentChoice(guide.vehicle, answer, runtime).collided, false)
  }
})
