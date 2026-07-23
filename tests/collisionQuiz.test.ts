import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCollisionQuiz } from '../src/engine/collisionQuiz.ts'
import type { ReplayEvent } from '../src/engine/sessionReplay.ts'
import { INITIAL_VEHICLE_STATE } from '../src/engine/vehiclePhysics.ts'

function collisionEvent(gear: 'D' | 'R', kind: 'wall' | 'vehicle'): ReplayEvent {
  return {
    id: 'collision-1',
    elapsedSeconds: 3,
    type: 'collision',
    label: '충돌',
    vehicle: { ...INITIAL_VEHICLE_STATE, gear },
    collision: {
      obstacleId: kind === 'wall' ? 'wall-right' : 'parked-left',
      kind,
      position: { x: 10, y: 4 },
      contactZone: gear === 'D' ? 'front-right' : 'rear-right',
    },
  }
}

test('전진 중 벽 충돌은 계속 전진이 아니라 짧은 직선 후진으로 간격을 회복한다', () => {
  const steps = buildCollisionQuiz(collisionEvent('D', 'wall'))

  assert.equal(steps[0].answer, 'stop')
  assert.equal(steps[1].answer, 'reverse-straight')
  assert.match(steps[0].question, /충돌하기 전에/)
  assert.match(steps[1].question, /전진.*충돌 직전/)
  assert.match(steps[1].choices.find(({ id }) => id === steps[1].answer)?.label ?? '', /R.*후진/)
})

test('후진 중 차량 충돌은 계속 후진이 아니라 짧은 직선 전진으로 간격을 회복한다', () => {
  const steps = buildCollisionQuiz(collisionEvent('R', 'vehicle'))

  assert.equal(steps[0].answer, 'stop')
  assert.equal(steps[1].answer, 'forward-straight')
  assert.match(steps[1].question, /후진.*충돌 직전/)
  assert.match(steps[1].choices.find(({ id }) => id === steps[1].answer)?.label ?? '', /D.*전진/)
})

test('재출발 전에는 진행 방향과 양쪽 간격 및 차체 각도를 함께 확인한다', () => {
  const steps = buildCollisionQuiz(collisionEvent('R', 'wall'))

  assert.equal(steps[2].answer, 'check-clearance')
  assert.match(steps[2].choices.find(({ id }) => id === steps[2].answer)?.label ?? '', /진행 방향.*양쪽 간격.*차체 각도/)
})
