import type { ScenarioRuntime } from '../types/practice.ts'
import { buildLessonSimulation, buildNarrowAisleLessonSimulation } from './lessonSimulation.ts'
import { resolveVehicleCollision } from './collisionDetection.ts'
import type { JudgmentChoice, JudgmentMotion, JudgmentScenario } from './judgmentScenarios.ts'
import {
  DEFAULT_VEHICLE_CONFIG,
  updateVehicle,
  type VehicleState,
} from './vehiclePhysics.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'

export type CorrectionDrill = {
  id: 'near-side' | 'far-side' | 'off-center' | 'crooked' | 'narrow-multipoint'
  title: string
  description: string
  steps: JudgmentScenario[]
}

const TIME_STEP = .05
const SHORT_CORRECTION_DISTANCE = .7
const FINAL_CENTER_Y = 10.42
const INSIDE_BAY_FINAL_Y = TARGET_PARKING_BAY.center.y
const BAY_EXIT_CENTER_Y = TARGET_PARKING_BAY.top - 2.42

function stopped(vehicle: VehicleState, changes: Partial<VehicleState> = {}) {
  return { ...vehicle, ...changes, speed: 0, braking: true }
}

function pathChoice(
  id: string,
  label: string,
  feedback: string,
  states: VehicleState[],
  steps?: string[],
): JudgmentChoice {
  return { id, label, feedback, previewStates: states.map((vehicle) => ({ ...vehicle })), steps }
}

function pathStep(
  id: string,
  skill: JudgmentScenario['skill'],
  title: string,
  situation: string,
  question: string,
  states: VehicleState[],
  answer: JudgmentChoice,
  wrong: JudgmentChoice[],
  takeaway: string,
  focusZone?: JudgmentChoice['focusZone'],
): JudgmentScenario {
  return {
    id,
    skill,
    title,
    situation,
    question,
    vehicle: stopped(states[0]),
    choices: [answer, ...wrong],
    answer: answer.id,
    takeaway,
    focusZone,
  }
}

function physicalPath(start: VehicleState, motions: JudgmentMotion[], runtime: ScenarioRuntime) {
  let vehicle = stopped(start)
  const states = [{ ...vehicle }]
  for (const motion of motions) {
    vehicle = { ...vehicle, gear: motion.gear, steeringAngle: motion.steeringAngle, speed: 0, braking: false }
    const steps = Math.ceil(motion.seconds / .08)
    for (let index = 0; index < steps; index += 1) {
      const next = updateVehicle(vehicle, { steeringDirection: 0, braking: false }, .08)
      const resolved = resolveVehicleCollision(vehicle, next, runtime)
      vehicle = resolved.vehicle
      states.push({ ...vehicle })
      if (resolved.collision) return states
    }
  }
  states[states.length - 1] = stopped(states.at(-1)!, { steeringAngle: motions.at(-1)?.steeringAngle ?? 0 })
  return states
}

function physicalDistancePath(
  start: VehicleState,
  gear: 'D' | 'R',
  steeringAngle: number,
  distance: number,
  runtime: ScenarioRuntime,
) {
  let vehicle = stopped(start, { gear, steeringAngle })
  const states = [{ ...vehicle }]
  let traveled = 0
  for (let index = 0; index < 1200 && traveled < distance; index += 1) {
    const next = updateVehicle(vehicle, { steeringDirection: 0, braking: false }, TIME_STEP)
    const resolved = resolveVehicleCollision(vehicle, next, runtime)
    traveled += Math.hypot(resolved.vehicle.x - vehicle.x, resolved.vehicle.y - vehicle.y)
    vehicle = resolved.vehicle
    states.push({ ...vehicle })
    if (resolved.collision) break
  }
  states[states.length - 1] = stopped(states.at(-1)!, { steeringAngle })
  return states
}

function reentryAndFinish(
  start: VehicleState,
  turn: number,
  targetHeading: number,
  runtime: ScenarioRuntime,
) {
  let vehicle = stopped(start, { gear: 'R', steeringAngle: turn })
  const states = [{ ...vehicle }]
  for (let index = 0; index < 1400; index += 1) {
    const next = updateVehicle(vehicle, { steeringDirection: 0, braking: false }, TIME_STEP)
    const resolved = resolveVehicleCollision(vehicle, next, runtime)
    vehicle = resolved.vehicle
    states.push({ ...vehicle })
    if (resolved.collision) break
    if (turn > 0 ? vehicle.heading <= targetHeading : vehicle.heading >= targetHeading) break
  }
  vehicle = stopped(states.at(-1)!, { heading: targetHeading, gear: 'R', steeringAngle: 0 })
  states[states.length - 1] = vehicle
  for (let index = 0; index < 1000 && vehicle.y < FINAL_CENTER_Y; index += 1) {
    const next = updateVehicle(vehicle, { steeringDirection: 0, braking: false }, TIME_STEP)
    const resolved = resolveVehicleCollision(vehicle, next, runtime)
    vehicle = resolved.vehicle
    states.push({ ...vehicle })
    if (resolved.collision) break
  }
  states[states.length - 1] = stopped(states.at(-1)!, { steeringAngle: 0 })
  return states
}

function mergePaths(...paths: VehicleState[][]) {
  return paths.flatMap((states, index) => index ? states.slice(1) : states)
}

function straightToY(
  start: VehicleState,
  gear: 'D' | 'R',
  targetY: number,
  runtime: ScenarioRuntime,
) {
  const distance = Math.abs(targetY - start.y)
  return physicalDistancePath(start, gear, 0, distance, runtime)
}

function buildEntryCorrectionCourse(
  runtime: ScenarioRuntime,
  kind: 'near' | 'far',
): CorrectionDrill {
  const leftEntry = runtime.startSide !== 'right'
  const direction = leftEntry ? 1 : -1
  const turn = DEFAULT_VEHICLE_CONFIG.maxSteeringAngle * direction
  const targetHeading = leftEntry ? TARGET_PARKING_BAY.heading : Math.PI - TARGET_PARKING_BAY.heading
  const curve = buildLessonSimulation(runtime)[3].states
  const reference = curve[Math.min(140, curve.length - 1)]
  const offset = (kind === 'near' ? .2 : -.8) * direction
  const start = stopped(reference, { x: reference.x + offset, gear: 'R', steeringAngle: turn })
  const centered = [
    start,
    stopped(start, { steeringAngle: 0 }),
  ]
  const moveGear = kind === 'near' ? 'R' : 'D'
  const space = physicalDistancePath(centered.at(-1)!, moveGear, 0, SHORT_CORRECTION_DISTANCE, runtime)
  const finish = reentryAndFinish(space.at(-1)!, turn, targetHeading, runtime)
  const nearSide = leftEntry ? '오른쪽' : '왼쪽'
  const farSide = leftEntry ? '왼쪽' : '오른쪽'
  const targetSide = kind === 'near' ? nearSide : farSide
  const courseTitle = kind === 'near' ? '가까운 쪽 간격 수정' : '먼 쪽 간격 수정'
  const moveLabel = kind === 'near'
    ? '직선 후진으로 가까운 쪽 공간 만들기'
    : '직선 전진으로 먼 쪽 공간 만들기'
  const focusZone = kind === 'near'
    ? (leftEntry ? 'rear-right' as const : 'rear-left' as const)
    : (leftEntry ? 'front-left' as const : 'front-right' as const)

  return {
    id: kind === 'near' ? 'near-side' : 'far-side',
    title: courseTitle,
    description: kind === 'near'
      ? '처음 꺾어 들어간 가까운 쪽이 좁을 때, 바퀴를 일자로 풀고 짧게 후진해 공간을 만듭니다.'
      : '처음 꺾어 들어간 반대편이 좁을 때, 바퀴를 일자로 풀고 짧게 전진해 회전 공간을 만듭니다.',
    steps: [
      pathStep(
        `${kind}-center`,
        'first-correction',
        '수정의 첫 동작',
        `${targetSide} 간격이 부족해 수정이 필요하고 차량은 완전히 멈춰 있습니다.`,
        '앞뒤로 움직이기 전에 가장 먼저 할 조작은?',
        centered,
        pathChoice(
          'center-steering',
          '핸들을 정중앙으로 풀기',
          '수정 이동의 기준을 만들기 위해 먼저 바퀴를 일자로 맞춥니다.',
          centered,
        ),
        [
          { id: 'keep-full-lock', label: '현재 최대 조향을 유지한 채 바로 이동', feedback: '곡선 이동이 계속되어 반대쪽에도 새로운 위험을 만들 수 있습니다.', focusZone },
          { id: 'countersteer', label: '핸들을 반대 방향으로 끝까지 돌리기', feedback: '수정의 첫 단계는 반대 조향이 아니라 바퀴를 일자로 만드는 것입니다.' },
        ],
        '가까운 쪽과 먼 쪽 모두 수정의 시작은 핸들 원위치입니다.',
        focusZone,
      ),
      pathStep(
        `${kind}-space`,
        'correction-space',
        kind === 'near' ? '가뒤로 공간 만들기' : '먼앞으로 공간 만들기',
        `핸들을 중앙으로 풀었고 ${targetSide} 공간을 만들어야 합니다.`,
        `${kind === 'near' ? '가까운 쪽' : '먼 쪽'}이 좁을 때 어느 방향으로 얼마나 움직일까요?`,
        space,
        pathChoice(
          `${kind}-space-answer`,
          moveLabel,
          `${SHORT_CORRECTION_DISTANCE * 100}cm만 움직여 다음 회전에 필요한 여유를 만들고 다시 정지합니다.`,
          space,
        ),
        [
          {
            id: 'wrong-direction',
            label: kind === 'near' ? 'D로 길게 전진' : 'R로 계속 후진',
            feedback: kind === 'near' ? '가까운 쪽 수정은 중앙 조향 후 짧은 후진이 기준입니다.' : '먼 쪽 수정은 중앙 조향 후 짧은 전진이 기준입니다.',
            motion: [{ gear: kind === 'near' ? 'D' : 'R', steeringAngle: 0, seconds: 1.8 }],
          },
          { id: 'turn-while-moving', label: '움직이면서 반대 방향으로 크게 조향', feedback: '먼저 일자로 짧게 움직여 공간을 만든 뒤 원래 방향으로 다시 꺾어야 합니다.' },
        ],
        kind === 'near' ? '가까운 쪽은 뒤로, 50cm~1m 이내로만 움직이세요.' : '먼 쪽은 앞으로, 50cm~1m 이내로만 움직이세요.',
        focusZone,
      ),
      pathStep(
        `${kind}-resume`,
        'reentry-decision',
        '원래 방향으로 재진입',
        `${targetSide} 공간을 만든 뒤 다시 완전히 정지했습니다.`,
        '수정한 공간에서 주차를 다시 이어가려면?',
        finish,
        pathChoice(
          `${kind}-resume-answer`,
          '처음 주차 방향으로 다시 후진하기',
          '처음 꺾었던 방향으로 후진을 재개하고, 평행해지는 순간 핸들을 중앙으로 풀어 깊이를 맞춥니다.',
          finish,
          [
            `R 선택 후 핸들을 ${nearSide} 방향으로 끝까지 돌리기`,
            '천천히 후진하며 차체가 주차선과 평행해지는 순간 정지',
            '다시 간격이 부족하면 핸들 원위치부터 한 번 더 반복',
            '핸들을 중앙으로 풀고 필요한 깊이만 직선 후진',
          ],
        ),
        [
          { id: 'opposite-full-lock', label: `R로 바꾸고 ${farSide} 방향으로 최대 조향`, feedback: '반대 조향이 아니라 처음 주차하던 방향으로 다시 꺾어야 합니다.' },
          { id: 'long-straight', label: '핸들을 중앙에 둔 채 끝까지 길게 이동', feedback: '공간 확보가 끝났으므로 원래 주차 방향의 회전을 다시 만들어야 합니다.' },
        ],
        '공간을 만든 뒤에는 반대가 아니라 처음 꺾었던 방향으로 다시 최대 조향하세요.',
        focusZone,
      ),
    ],
  }
}

function buildInsideBayCourses(runtime: ScenarioRuntime): CorrectionDrill[] {
  const stages = buildLessonSimulation(runtime)
  const leftEntry = runtime.startSide !== 'right'
  const direction = leftEntry ? 1 : -1
  const parked = stopped(stages.at(-1)!.states.at(-1)!, { x: 15, y: 9.75, steeringAngle: 0, gear: 'R' })

  const offsetStart = stopped(parked, { x: leftEntry ? 14.76 : 15.24, gear: 'D' })
  const offsetExit = straightToY(offsetStart, 'D', BAY_EXIT_CENTER_Y, runtime)
  const offsetReverseTurn = .58 * direction
  const offsetReverseFirst = physicalPath(offsetExit.at(-1)!, [
    { gear: 'R', steeringAngle: offsetReverseTurn, seconds: 2.6 },
  ], runtime)
  const offsetReverseCounter = physicalPath(offsetReverseFirst.at(-1)!, [
    { gear: 'R', steeringAngle: -offsetReverseTurn, seconds: 2.6 },
  ], runtime)
  const offsetFinish = straightToY(offsetReverseCounter.at(-1)!, 'R', INSIDE_BAY_FINAL_Y, runtime)
  const offsetReentryAndFinish = mergePaths(offsetReverseFirst, offsetReverseCounter, offsetFinish)
  const correctionSide = leftEntry ? '오른쪽' : '왼쪽'
  const oppositeSide = correctionSide === '오른쪽' ? '왼쪽' : '오른쪽'

  const offCenter: CorrectionDrill = {
    id: 'off-center',
    title: '가운데 위치 수정',
    description: '평행하지만 한쪽으로 치우친 차를 통로로 빼낸 뒤, 후진 조향으로 가운데에 다시 넣습니다.',
    steps: [
      pathStep(
        'off-center-exit',
        'correction-space',
        '다시 들어갈 공간 만들기',
        `차체는 평행하지만 한쪽으로 치우쳐 ${correctionSide} 공간이 더 넓습니다.`,
        '가운데로 다시 들어가기 전에 먼저 어떻게 해야 할까요?',
        offsetExit,
        pathChoice(
          'offset-exit',
          '직선 전진으로 재진입 공간 만들기',
          '평행한 차체를 그대로 유지하며, 후진 조향을 시작할 수 있는 통로 공간까지 빠져나옵니다.',
          offsetExit,
          ['핸들을 중앙에 놓고 D로 천천히 전진', '뒷범퍼가 주차칸 입구를 완전히 벗어나면 정지'],
        ),
        [
          { id: 'sideways-reverse', label: '현재 자리에서 최대 조향으로 옆 이동', feedback: '차는 제자리에서 옆으로 이동할 수 없어 뒤 모서리만 선에 가까워집니다.' },
          { id: 'early-turn', label: `${correctionSide}으로 조향하며 주차칸 안에서 바로 전진`, feedback: '좁은 주차칸 안에서 먼저 꺾으면 앞 모서리의 회전 궤적이 옆 차량에 가까워질 수 있습니다.' },
        ],
        '차체가 평행하다면 핸들을 중앙에 두고, 뒷범퍼가 입구를 벗어날 때까지 직선으로 나오세요.',
      ),
      pathStep(
        'off-center-realign',
        'reentry-decision',
        '가운데로 다시 후진하기',
        '차량 뒤쪽이 주차칸 입구를 벗어나 후진 조향 공간이 생겼습니다.',
        '후진하면서 가운데 위치와 평행을 함께 맞추려면?',
        offsetReentryAndFinish,
        pathChoice(
          'offset-realign',
          '후진 S자 조향으로 가운데 맞추기',
          '넓은 공간 쪽으로 차량 뒤를 옮기고, 중심선에 가까워지면 반대 조향해 차체를 나란하게 만듭니다.',
          offsetReentryAndFinish,
          [
            `R로 천천히 후진하며 ${correctionSide}으로 조향`,
            `차량 중심이 주차칸 중심선에 가까워지면 ${oppositeSide}으로 조향`,
            '차체가 평행해지면 핸들을 중앙으로 풀고 직선 후진',
          ],
        ),
        [
          { id: 'straight-reverse', label: '핸들을 중앙에 두고 끝까지 직선 후진', feedback: '평행 상태는 유지되지만 좌우 치우침도 그대로 남습니다.' },
          { id: 'keep-shift', label: `${correctionSide} 조향을 끝까지 유지해 후진`, feedback: '중심선을 지난 뒤에도 계속 회전해 반대쪽으로 기울어집니다.' },
        ],
        '후진 첫 조향으로 가운데에 접근하고, 반대 조향으로 평행을 회복한 뒤 핸들을 중앙에 놓으세요.',
      ),
    ],
  }

  const crookedStart = stopped(parked, {
    x: 15,
    y: 9.4,
    heading: parked.heading + (leftEntry ? .105 : -.105),
    steeringAngle: 0,
    gear: 'R',
  })
  const straightenTurn = -.45 * direction
  const crookedStraighten = physicalPath(crookedStart, [
    { gear: 'D', steeringAngle: straightenTurn, seconds: 2.2 },
  ], runtime)
  const crookedStraightExit = straightToY(crookedStraighten.at(-1)!, 'D', BAY_EXIT_CENTER_Y, runtime)
  const crookedExit = mergePaths(crookedStraighten, crookedStraightExit)
  const crookedReverseTurn = -.18 * direction
  const crookedReverseFirst = physicalPath(crookedExit.at(-1)!, [
    { gear: 'R', steeringAngle: crookedReverseTurn, seconds: 1.4 },
  ], runtime)
  const crookedReverseCounter = physicalPath(crookedReverseFirst.at(-1)!, [
    { gear: 'R', steeringAngle: -crookedReverseTurn, seconds: 1.4 },
  ], runtime)
  const crookedFinish = straightToY(crookedReverseCounter.at(-1)!, 'R', INSIDE_BAY_FINAL_Y, runtime)
  const crookedReentryAndFinish = mergePaths(crookedReverseFirst, crookedReverseCounter, crookedFinish)
  const straightenSide = straightenTurn > 0 ? '오른쪽' : '왼쪽'
  const reentrySide = crookedReverseTurn > 0 ? '오른쪽' : '왼쪽'
  const counterSide = reentrySide === '오른쪽' ? '왼쪽' : '오른쪽'

  const crooked: CorrectionDrill = {
    id: 'crooked',
    title: '기울어진 차체 수정',
    description: '비스듬한 차체를 통로 방향으로 펴며 빼낸 뒤, 다시 후진해 가운데와 평행을 맞춥니다.',
    steps: [
      pathStep(
        'crooked-space',
        'correction-space',
        '차체를 펴며 공간 만들기',
        '차량은 주차칸 안에 있지만 차체가 비스듬해 한쪽 뒤 간격이 좁습니다.',
        '안전하게 다시 들어갈 공간을 만들려면?',
        crookedExit,
        pathChoice(
          'crooked-space-answer',
          '차체를 펴며 통로로 전진하기',
          '차 앞부분이 향한 쪽의 반대로 조향해 차체를 먼저 펴고, 뒷범퍼가 입구를 벗어날 때까지 나옵니다.',
          crookedExit,
          [
            `주변 간격을 확인하고 ${straightenSide}으로 조금씩 조향하며 천천히 전진`,
            '차체가 통로 방향과 나란해지면 핸들을 중앙으로 풀기',
            '뒷범퍼가 주차칸 입구를 완전히 벗어나면 정지',
          ],
        ),
        [
          { id: 'crooked-straight', label: '핸들을 중앙에 두고 그대로 직선 후진', feedback: '비스듬한 각도가 유지되어 좁은 쪽 선을 넘을 수 있습니다.' },
          { id: 'crooked-long-forward', label: `${straightenSide}으로 최대 조향해 한 번에 빠르게 전진`, feedback: '앞 모서리의 회전 폭이 커지므로 간격을 보며 조금씩 조향해야 합니다.' },
        ],
        '비스듬하면 기울어진 방향의 반대로 조금씩 조향해 차체를 펴고, 뒤쪽이 입구를 벗어날 때까지 나오세요.',
      ),
      pathStep(
        'crooked-align',
        'reentry-decision',
        '가운데와 평행 맞추기',
        '차체를 펴고 통로로 나온 뒤 완전히 정지했습니다.',
        '다시 후진하며 가운데와 평행을 함께 맞추려면?',
        crookedReentryAndFinish,
        pathChoice(
          'crooked-align-answer',
          '후진 S자 조향으로 가운데 맞추기',
          '주차칸 중심으로 후진한 뒤 반대 조향으로 차체 각도를 회복하고 중앙 조향으로 마무리합니다.',
          crookedReentryAndFinish,
          [
            `R로 천천히 후진하며 ${reentrySide}으로 조향`,
            `차량 중심이 주차칸 중심선에 가까워지면 ${counterSide}으로 조향`,
            '차체가 평행해지면 핸들을 중앙으로 풀고 직선 후진',
          ],
        ),
        [
          { id: 'crooked-straight-back', label: '핸들을 중앙에 두고 끝까지 직선 후진', feedback: '현재 위치가 중심에서 벗어나 있어 좌우 간격이 고르게 맞지 않습니다.' },
          { id: 'crooked-same-turn', label: `${reentrySide} 조향을 끝까지 유지해 후진`, feedback: '중심선에 가까워진 뒤에는 반대 조향해야 차체가 평행해집니다.' },
        ],
        '주차칸 중심을 향해 후진하고, 중심선에 가까워지면 반대 조향해 평행을 맞추세요.',
      ),
    ],
  }

  return [offCenter, crooked]
}

function buildNarrowDrill(runtime: ScenarioRuntime): CorrectionDrill {
  const stages = buildNarrowAisleLessonSimulation(runtime)
  const correction = stages[5].states
  const finish = stages[6].states
  return {
    id: 'narrow-multipoint',
    title: '좁은 통로 다단 수정',
    description: '앞쪽 공간이 부족할 때 짧은 전진 수정과 재후진을 이어서 연습합니다.',
    steps: [
      pathStep(
        'narrow-correction',
        'correction-space',
        '두 번의 짧은 전진 수정',
        '첫 후진에서 안쪽 간격이 부족해 완전히 정지했습니다.',
        '앞쪽 벽 여유 안에서 재진입각을 만들려면?',
        correction,
        pathChoice('narrow-correction-answer', '짧은 전진 조향으로 재진입각 만들기', '한 번에 길게 움직이지 않고 두 곡선으로 공간과 각도를 나눠 만듭니다.', correction),
        [
          { id: 'narrow-long-forward', label: '앞쪽 벽까지 한 번에 길게 전진', feedback: '앞 모서리와 벽 사이에 새 위험을 만들 수 있습니다.' },
          { id: 'narrow-reverse-now', label: '공간을 만들지 않고 바로 다시 후진', feedback: '안쪽 간격이 충분히 회복되지 않았습니다.' },
        ],
        '좁은 통로에서는 짧은 전진을 나눠 공간과 재진입각을 만드세요.',
      ),
      pathStep(
        'narrow-finish',
        'reentry-decision',
        '재진입 후 마무리',
        '다음 후진에 필요한 공간과 차체 각도를 만들었습니다.',
        '두 번째 후진을 어떻게 이어갈까요?',
        finish,
        pathChoice(
          'narrow-finish-answer',
          '재후진하며 평행해질 때 핸들 풀기',
          '평행해지는 순간 조향을 풀고 깊이만 맞춥니다.',
          finish,
        ),
        [
          { id: 'narrow-full-lock', label: '최대 조향을 끝까지 유지해 한 번에 후진', feedback: '평행해진 뒤에도 회전해 반대쪽 선을 넘을 수 있습니다.' },
          { id: 'narrow-forward-again', label: '재진입할 공간이 있지만 다시 크게 전진', feedback: '현재는 후진으로 마무리할 공간이 확보되었습니다.' },
        ],
        '재진입 후 평행해지는 순간 핸들을 중앙으로 풀고 깊이만 맞추세요.',
      ),
    ],
  }
}

export function buildCorrectionDrills(runtime: ScenarioRuntime): CorrectionDrill[] {
  if (runtime.scenarioId === 'narrow-aisle') return [buildNarrowDrill(runtime)]
  return [
    buildEntryCorrectionCourse(runtime, 'near'),
    buildEntryCorrectionCourse(runtime, 'far'),
    ...buildInsideBayCourses(runtime),
  ]
}
