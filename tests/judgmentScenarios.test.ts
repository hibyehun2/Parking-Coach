import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildJudgmentGuide, simulateJudgmentChoice } from '../src/engine/judgmentScenarios.ts'

test('안내 예시는 핸들 원위치와 가뒤먼앞 순서를 먼저 보여준다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const guide = buildJudgmentGuide(runtime)
    const answer = guide.choices.find(({ id }) => id === guide.answer)!
    const result = simulateJudgmentChoice(guide.vehicle, answer, runtime)
    assert.equal(result.states.at(-1)!.steeringAngle, 0)
    assert.match(answer.steps?.join(' ') ?? '', /정중앙.*가까운 쪽.*R.*먼 쪽.*D.*처음 주차하던 방향/)
    assert.match(answer.feedback, /핸들 원위치부터 반복/)
    assert.equal(result.collided, false)
  }
})
