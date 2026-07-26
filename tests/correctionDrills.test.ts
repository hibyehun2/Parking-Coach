import assert from 'node:assert/strict'
import test from 'node:test'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { buildCorrectionDrills } from '../src/engine/correctionDrills.ts'
import { detectCollision } from '../src/engine/collisionDetection.ts'
import { shuffledJudgmentChoices, simulateJudgmentChoice } from '../src/engine/judgmentScenarios.ts'
import { evaluateParking, isVehicleInsideParkingBay, TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'

function answerOf(step: ReturnType<typeof buildCorrectionDrills>[number]['steps'][number]) {
  return step.choices.find(({ id }) => id === step.answer)!
}

test('유형별 연습은 네 개의 연속 수정 코스로 구성된다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
  assert.deepEqual(drills.map(({ id }) => id), ['near-side', 'far-side', 'off-center', 'crooked'])
  assert.deepEqual(drills.map(({ steps }) => steps.length), [3, 3, 2, 2])
  assert.deepEqual(drills.map(({ title }) => title), [
    '가까운 쪽 간격 수정',
    '먼 쪽 간격 수정',
    '가운데 위치 수정',
    '기울어진 차체 수정',
  ])
})

test('도움이 적은 확인형 판단과 단순 직선 재진입 문제를 제외한다', () => {
  const steps = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
    .flatMap(({ steps: items }) => items)
  assert.equal(steps.some(({ skill }) => ['hazard-prediction', 'stop-timing', 'recheck'].includes(skill)), false)
  assert.equal(steps.some(({ title }) => /위험 지점|멈출 시점|재확인|직선 재진입/.test(title)), false)
  for (const step of steps.filter(({ id }) => id.endsWith('-resume'))) {
    assert.match(answerOf(step).label, /오른쪽으로 조향해 R로 후진/)
    assert.ok(answerOf(step).steps?.some((item) => /끝까지 돌리기/.test(item)))
  }
})

test('선택지는 짧게 보여주고 여러 동작의 상세 순서는 정답 데이터로 분리한다', () => {
  const steps = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
    .flatMap(({ steps: items }) => items)
  for (const step of steps) {
    assert.ok(Math.max(...step.choices.map(({ label }) => label.length)) <= 26, step.id)
    const answer = answerOf(step)
    if (['near-resume', 'far-resume', 'off-center-exit', 'off-center-realign', 'crooked-space', 'crooked-align'].includes(step.id)) {
      assert.ok((answer.steps?.length ?? 0) >= 2, step.id)
    }
  }
})

test('선택지는 정답을 암시하는 과장 표현 없이 비슷한 조작끼리 비교한다', () => {
  const steps = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
    .flatMap(({ steps: items }) => items)
  for (const step of steps) {
    assert.equal(step.choices.some(({ label }) => /빠르게|길게|끝까지|바로|한 번에|계속/.test(label)), false, step.id)
  }
})

test('정답 위치는 문제와 연습 시드에 따라 안정적으로 섞인다', () => {
  const step = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))[0].steps[0]
  const positions = new Set<number>()
  for (let seed = 1; seed <= 20; seed += 1) {
    const first = shuffledJudgmentChoices(step.choices, step.id, seed)
    const second = shuffledJudgmentChoices(step.choices, step.id, seed)
    assert.deepEqual(first.map(({ id }) => id), second.map(({ id }) => id))
    positions.add(first.findIndex(({ id }) => id === step.answer))
  }
  assert.deepEqual([...positions].sort(), [0, 1, 2])
})

test('모든 정답과 오답 탑뷰는 차량 물리로 유효한 상태를 만든다', () => {
  for (const scenarioId of ['both-sides', 'narrow-aisle'] as const) {
    const runtime = createScenarioRuntime(scenarioId, { seed: 2, firstSuccess: true })
    for (const step of buildCorrectionDrills(runtime).flatMap(({ steps }) => steps)) {
      for (const choice of step.choices) {
        assert.ok(choice.previewStates?.length || choice.motion?.length, `${step.id}/${choice.id}: 이동 데이터`)
        const simulation = simulateJudgmentChoice(step.vehicle, choice, runtime)
        assert.ok(simulation.states.length >= 1, `${step.id}/${choice.id}: 상태`)
        for (const state of simulation.states) {
          assert.ok([
            state.x,
            state.y,
            state.heading,
            state.steeringAngle,
            state.speed,
          ].every(Number.isFinite), `${step.id}/${choice.id}: 유한한 차량 상태`)
        }
        for (let index = 1; index < simulation.states.length; index += 1) {
          const previous = simulation.states[index - 1]
          const current = simulation.states[index]
          assert.ok(Math.hypot(current.x - previous.x, current.y - previous.y) < .25, `${step.id}/${choice.id}: 연속 경로`)
        }
      }
    }
  }
})

test('가까운 쪽과 먼 쪽 모두 움직이기 전에 핸들을 정중앙으로 푼다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const drills = buildCorrectionDrills(runtime)
    for (const id of ['near-side', 'far-side'] as const) {
      const step = drills.find((drill) => drill.id === id)!.steps[0]
      const simulation = simulateJudgmentChoice(step.vehicle, answerOf(step), runtime)
      assert.match(answerOf(step).label, /핸들을 정중앙으로/)
      assert.equal(simulation.states.at(-1)!.steeringAngle, 0)
      assert.ok(Math.hypot(simulation.states.at(-1)!.x - step.vehicle.x, simulation.states.at(-1)!.y - step.vehicle.y) < .001)
    }
  }
})

test('가까운 쪽은 R, 먼 쪽은 D로 50cm에서 1m 사이를 직선 이동한다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const drills = buildCorrectionDrills(runtime)
    for (const [id, gear] of [['near-side', 'R'], ['far-side', 'D']] as const) {
      const step = drills.find((drill) => drill.id === id)!.steps[1]
      const simulation = simulateJudgmentChoice(step.vehicle, answerOf(step), runtime)
      const end = simulation.states.at(-1)!
      const distance = Math.hypot(end.x - step.vehicle.x, end.y - step.vehicle.y)
      assert.equal(end.gear, gear)
      assert.equal(end.steeringAngle, 0)
      assert.ok(distance >= .5 && distance <= 1, `${id}/${runtime.startSide}/${distance}`)
      assert.equal(simulation.collided, false)
    }
  }
})

test('먼 쪽 간격 표시는 진입 방향에 맞는 사용자 차량의 뒤쪽 모서리를 가리킨다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const farSide = buildCorrectionDrills(runtime).find(({ id }) => id === 'far-side')!
    const expectedZone = runtime.startSide === 'left' ? 'rear-left' : 'rear-right'
    for (const step of farSide.steps) assert.equal(step.focusZone, expectedZone)
  }
})

test('공간을 만든 뒤 화면에 명시된 좌우 방향으로 다시 조향해 주차를 완료한다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const drills = buildCorrectionDrills(runtime)
    for (const id of ['near-side', 'far-side'] as const) {
      const step = drills.find((drill) => drill.id === id)!.steps[2]
      const answer = answerOf(step)
      const simulation = simulateJudgmentChoice(step.vehicle, answer, runtime)
      assert.match(answer.label, runtime.startSide === 'left' ? /오른쪽으로 조향/ : /왼쪽으로 조향/)
      assert.ok(answer.steps?.some((item) => runtime.startSide === 'left' ? /오른쪽 방향/.test(item) : /왼쪽 방향/.test(item)))
      assert.ok(answer.steps?.some((item) => /평행/.test(item)))
      assert.equal(simulation.collided, false)
      assert.equal(isVehicleInsideParkingBay(simulation.states.at(-1)!), true)
    }
  }
})

test('가운데와 기울기 코스는 주차칸 안의 실제 자세에서 시작한다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
  const offCenter = drills.find(({ id }) => id === 'off-center')!
  const crooked = drills.find(({ id }) => id === 'crooked')!
  const offsetResult = evaluateParking(offCenter.steps[0].vehicle, [])
  const crookedResult = evaluateParking(crooked.steps[0].vehicle, [])
  assert.equal(offsetResult.fullyInside, true)
  assert.ok(offsetResult.angleErrorDegrees < .1)
  assert.ok(Math.abs(offCenter.steps[0].vehicle.x - 15) >= .15)
  assert.equal(crookedResult.fullyInside, true)
  assert.ok(crookedResult.angleErrorDegrees >= 5 && crookedResult.angleErrorDegrees <= 7)
})

test('가운데와 기울기 수정은 공간 만들기와 평행 복귀를 연속 동작으로 나눈다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('both-sides', { seed: 2 }))
  const offCenter = drills.find(({ id }) => id === 'off-center')!
  const crooked = drills.find(({ id }) => id === 'crooked')!
  assert.match(answerOf(offCenter.steps[0]).label, /직선 전진/)
  assert.match(answerOf(offCenter.steps[1]).label, /후진 S자/)
  assert.match(answerOf(crooked.steps[0]).label, /차체를 펴며/)
  assert.match(answerOf(crooked.steps[1]).label, /후진 S자/)
  assert.equal(answerOf(offCenter.steps[0]).steps?.length, 2)
  assert.equal(answerOf(offCenter.steps[1]).steps?.length, 3)
  assert.equal(answerOf(crooked.steps[0]).steps?.length, 3)
  assert.equal(answerOf(crooked.steps[1]).steps?.length, 3)
})

test('차체가 평행하면 직선으로 빠져나오고 기울어졌으면 반대 조향으로 먼저 편다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    const drills = buildCorrectionDrills(runtime)
    const offCenter = drills.find(({ id }) => id === 'off-center')!
    const crooked = drills.find(({ id }) => id === 'crooked')!
    const offsetExit = simulateJudgmentChoice(offCenter.steps[0].vehicle, answerOf(offCenter.steps[0]), runtime)
    const crookedExit = simulateJudgmentChoice(crooked.steps[0].vehicle, answerOf(crooked.steps[0]), runtime)
    const offsetEnd = offsetExit.states.at(-1)!
    const crookedEnd = crookedExit.states.at(-1)!

    assert.ok(Math.abs(offsetEnd.heading - offCenter.steps[0].vehicle.heading) < .001)
    assert.ok(offsetEnd.y + 2.3 < TARGET_PARKING_BAY.top, `${runtime.startSide}/평행 차체 출구 여유`)
    assert.ok(crookedEnd.y + 2.3 < TARGET_PARKING_BAY.top, `${runtime.startSide}/기울어진 차체 출구 여유`)
    assert.ok(evaluateParking(crookedEnd, []).angleErrorDegrees < 1)
  }
})

test('주차칸 안 수정은 좌우 위치와 각도 오차를 줄여 가운데 평행 주차로 끝난다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    for (const id of ['off-center', 'crooked'] as const) {
      const drill = buildCorrectionDrills(runtime).find((item) => item.id === id)!
      const initial = evaluateParking(drill.steps[0].vehicle, [])
      const finalStates = simulateJudgmentChoice(
        drill.steps[1].vehicle,
        answerOf(drill.steps[1]),
        runtime,
      ).states
      const final = evaluateParking(finalStates.at(-1)!, [])
      assert.ok(final.centerError < initial.centerError, `${runtime.startSide}/${id}/중심 오차`)
      assert.ok(final.angleErrorDegrees < .5, `${runtime.startSide}/${id}/각도 오차`)
      assert.equal(final.fullyInside, true)
    }
  }
})

test('각 코스의 정답 탑뷰는 충돌 없이 다음 단계로 이어지고 주차칸 안에서 끝난다', () => {
  for (const seed of [2, 3]) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: true })
    for (const drill of buildCorrectionDrills(runtime)) {
      let vehicle = drill.steps[0].vehicle
      for (const step of drill.steps) {
        assert.ok(Math.hypot(vehicle.x - step.vehicle.x, vehicle.y - step.vehicle.y) < .02, `${drill.id}/${step.id} 연속성`)
        const simulation = simulateJudgmentChoice(step.vehicle, answerOf(step), runtime)
        assert.equal(simulation.collided, false, `${drill.id}/${step.id} 충돌`)
        assert.equal(simulation.states.some((state) => Boolean(detectCollision(state, 0, runtime))), false)
        vehicle = simulation.states.at(-1)!
      }
      assert.equal(isVehicleInsideParkingBay(vehicle), true, `${runtime.startSide}/${drill.id} 완료`)
    }
  }
})

test('좁은 통로가 다시 제공될 때도 연속 수정 코스로 동작한다', () => {
  const drills = buildCorrectionDrills(createScenarioRuntime('narrow-aisle', { seed: 2 }))
  assert.equal(drills.length, 1)
  assert.equal(drills[0].id, 'narrow-multipoint')
  assert.equal(drills[0].steps.length, 2)
})
