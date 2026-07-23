import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime, scenarios } from '../src/data/scenarios.ts'
import { detectCollision } from '../src/engine/collisionDetection.ts'

test('모든 추가 상황을 공통 런타임 데이터로 생성한다', () => {
  assert.deepEqual(scenarios.map(({ id }) => id), ['both-sides', 'narrow-aisle'])
  assert.deepEqual(scenarios.filter(({ available }) => available).map(({ id }) => id), ['both-sides', 'narrow-aisle'])
  for (const scenario of scenarios) {
    const runtime = createScenarioRuntime(scenario.id, { seed: 2, firstSuccess: false })
    assert.equal(runtime.scenarioId, scenario.id)
    assert.ok(runtime.parkedVehicles.length >= 1)
    assert.ok(runtime.walls.length >= 4)
  }
})

test('좁은 통로 주차는 목표 칸 반대편에 실제 충돌 벽을 둔다', () => {
  const runtime = createScenarioRuntime('narrow-aisle', { seed: 2 })
  assert.ok(runtime.walls.some(({ id }) => id === 'narrow-opposite-wall'))
})

test('한쪽 차량은 시드에 따라 좌우에 무작위 배치된다', () => {
  assert.equal(createScenarioRuntime('one-side', { seed: 2 }).parkedVehicles[0].side, 'left')
  assert.equal(createScenarioRuntime('one-side', { seed: 3 }).parkedVehicles[0].side, 'right')
})

test('첫 성공 이후 출발 방향이 시드에 따라 달라진다', () => {
  assert.equal(createScenarioRuntime('both-sides', { seed: 2, firstSuccess: false }).startSide, 'left')
  assert.equal(createScenarioRuntime('both-sides', { seed: 3, firstSuccess: true }).startSide, 'right')
})

test('벽면 옆 상황의 추가 벽은 실제 충돌 대상으로 동작한다', () => {
  const runtime = createScenarioRuntime('wall-side', { seed: 2 })
  const practiceWall = runtime.walls.find((wall) => wall.id.startsWith('practice-wall'))!
  const collision = detectCollision({ ...runtime.initialVehicle, x: practiceWall.x, y: practiceWall.y + 3, heading: -Math.PI / 2 }, 0, runtime)
  assert.equal(collision?.kind, 'wall')
})

test('좁은 진입 수정은 충돌 전이지만 여유가 작은 안전 상태에서 시작한다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('tight-entry', { seed })
    assert.equal(detectCollision(runtime.initialVehicle, 0, runtime), null)
    assert.ok(detectCollision(runtime.initialVehicle, .35, runtime))
  }
})
