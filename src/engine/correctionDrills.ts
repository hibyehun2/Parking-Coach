import type { ScenarioRuntime } from '../types/practice.ts'
import { buildLessonSimulation, buildNarrowAisleLessonSimulation } from './lessonSimulation.ts'
import { resolveVehicleCollision } from './collisionDetection.ts'
import type { JudgmentChoice, JudgmentMotion, JudgmentScenario } from './judgmentScenarios.ts'
import { updateVehicle, type VehicleState } from './vehiclePhysics.ts'

export type CorrectionDrill = {
  id: 'crooked' | 'off-center' | 'inner-clearance' | 'outer-swing' | 'narrow-multipoint'
  title: string
  description: string
  steps: JudgmentScenario[]
}

function stopped(vehicle: VehicleState, changes: Partial<VehicleState> = {}) {
  return { ...vehicle, ...changes, speed: 0, braking: true }
}

function pathChoice(id: string, label: string, feedback: string, states: VehicleState[]): JudgmentChoice {
  return { id, label, feedback, previewStates: states.map((vehicle) => ({ ...vehicle })) }
}

function steeringDirection(steeringAngle: number) {
  return steeringAngle > 0 ? '오른쪽' : '왼쪽'
}

function staticStep(
  id: string,
  title: string,
  situation: string,
  question: string,
  vehicle: VehicleState,
  answer: JudgmentChoice,
  wrong: JudgmentChoice[],
  takeaway: string,
  skill: JudgmentScenario['skill'] = 'hazard-prediction',
): JudgmentScenario {
  return {
    id,
    skill,
    title,
    situation,
    question,
    vehicle: stopped(vehicle),
    choices: [answer, ...wrong],
    answer: answer.id,
    takeaway,
    focusZone: answer.focusZone,
  }
}

function pathStep(
  id: string,
  title: string,
  situation: string,
  question: string,
  states: VehicleState[],
  answer: JudgmentChoice,
  wrong: JudgmentChoice[],
  takeaway: string,
  skill: JudgmentScenario['skill'] = 'first-correction',
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
    focusZone: answer.focusZone,
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

function commonWrongChoices(vehicle: VehicleState, turn: number, zone: JudgmentChoice['focusZone']): JudgmentChoice[] {
  return [
    {
      id: 'continue-danger',
      label: `현재 기어와 조향으로 계속 ${vehicle.gear === 'R' ? '후진' : '전진'}`,
      feedback: '가까워지는 모서리 쪽으로 계속 움직여 수정 공간을 잃습니다.',
      motion: [{ gear: vehicle.gear, steeringAngle: vehicle.steeringAngle, seconds: 1.1 }],
      focusZone: zone,
    },
    {
      id: 'moving-countersteer',
      label: '움직이면서 반대 방향으로 크게 조향',
      feedback: '정지하지 않고 조향하면 반대편에 새로운 위험을 만들 수 있습니다.',
      motion: [{ gear: vehicle.gear, steeringAngle: -turn, seconds: 1.1 }],
    },
  ]
}

function buildBothSidesDrills(runtime: ScenarioRuntime): CorrectionDrill[] {
  const stages = buildLessonSimulation(runtime)
  const straight = stages[4].states
  const left = runtime.startSide !== 'right'
  const turn = left ? .52 : -.52
  const outerZone = left ? 'front-left' as const : 'front-right' as const
  const innerZone = left ? 'rear-right' as const : 'rear-left' as const

  const parked = stopped(straight.at(-1)!, { x: 15, y: 9.75, steeringAngle: 0, gear: 'R' })
  const parkingHeading = parked.heading
  const crookedStart = stopped(parked, {
    x: 15,
    y: 9.4,
    heading: parkingHeading + (left ? .105 : -.105),
    steeringAngle: left ? -.18 : .18,
    gear: 'R',
  })
  const crookedTurn = left ? -.5 : .5
  const crookedSpace = physicalPath(crookedStart, [
    { gear: 'D', steeringAngle: crookedTurn, seconds: 1 },
  ], runtime)
  const crookedAlignment = physicalPath(crookedSpace.at(-1)!, [
    { gear: 'R', steeringAngle: -crookedTurn, seconds: 1 },
  ], runtime)
  const crookedAligned = crookedAlignment.at(-1)!
  const crookedFinish = physicalPath(crookedAligned, [
    { gear: 'R', steeringAngle: 0, seconds: 1.3 },
  ], runtime)
  const crooked: CorrectionDrill = {
    id: 'crooked',
    title: '비스듬한 자세 바로잡기',
    description: '주차칸 안에서 비스듬한 차체를 다시 평행하게 만들고 깊이를 맞춥니다.',
    steps: [
      staticStep(
        'crooked-assess',
        '좁아지는 쪽 찾기',
        '차량이 주차칸 안으로 들어왔지만 차체가 선과 비스듬합니다.',
        '그대로 직선 후진하면 어떤 위험이 생길까요?',
        crookedStart,
        { id: 'angle-first', label: '좁은 쪽 간격이 더 줄어 주차선을 넘을 수 있습니다', feedback: '따라서 깊이를 더 맞추기 전에 차체 각도부터 바로잡아야 합니다.', focusZone: innerZone },
        [
          { id: 'depth-only', label: '각도와 관계없이 직선 후진으로 깊이만 맞추기', feedback: '비스듬한 상태가 유지되어 한쪽 선을 넘을 수 있습니다.' },
          { id: 'finish-now', label: '차량 중심이 들어왔으므로 바로 완료', feedback: '차량 전체와 차체 평행 상태를 함께 확인해야 합니다.' },
        ],
        '비스듬하면 깊이보다 차체 각도와 좁은 쪽 간격을 먼저 확인하세요.',
      ),
      pathStep(
        'crooked-space',
        '수정 공간 확보',
        '차량 전체는 주차칸 안에 있지만 한쪽 뒤 간격이 더 좁아 후진 공간이 부족합니다.',
        '먼저 어떤 동작으로 뒤쪽 공간을 만들까요?',
        crookedSpace,
        pathChoice('make-space', `D로 바꾸고 핸들을 ${left ? '오른쪽' : '왼쪽'}으로 반 바퀴 돌려 짧게 전진`, '짧은 전진으로 좁았던 뒤쪽 간격을 먼저 회복하고 완전히 정지합니다.', crookedSpace),
        commonWrongChoices(crookedStart, -turn, outerZone),
        '비스듬한 상태에서는 먼저 짧게 전진해 뒤쪽 수정 공간을 만드세요.',
        'correction-space',
      ),
      pathStep(
        'crooked-align',
        '차체 평행 맞추기',
        '뒤쪽 간격을 확보하고 완전히 정지했습니다.',
        '이제 차체를 주차선과 나란하게 하려면?',
        crookedAlignment,
        pathChoice('finish-curve', `R로 바꾸고 핸들을 ${left ? '왼쪽' : '오른쪽'}으로 반 바퀴 돌려 천천히 후진`, '앞 단계의 마지막 위치에서 반대 조향으로 후진해 차체가 나란해지는 순간 멈춥니다.', crookedAlignment),
        [
          { id: 'straight-reverse', label: 'R로 바꾸고 핸들을 정면으로 한 채 후진', feedback: '차체 각도가 그대로 유지되어 좁은 쪽 간격이 다시 줄어듭니다.', motion: [{ gear: 'R', steeringAngle: 0, seconds: 1 }] },
          { id: 'forward-more', label: '같은 조향을 유지해 계속 전진', feedback: '필요한 뒤쪽 공간은 이미 확보했으므로 차체 각도를 되돌릴 차례입니다.', motion: [{ gear: 'D', steeringAngle: crookedTurn, seconds: 1 }] },
        ],
        '반대 조향으로 천천히 후진하고 차체가 나란해지는 순간 멈추세요.',
        'first-correction',
      ),
      pathStep(
        'crooked-finish',
        '핸들 중앙 후 마무리',
        '차체가 주차선과 나란해져 완전히 정지했습니다.',
        '좌우 간격을 유지하며 주차를 완료하려면?',
        crookedFinish,
        pathChoice('straight-finish', '핸들을 정면으로 돌린 뒤 양쪽 선 간격을 보며 직선 후진', '차체 각도를 유지하면서 주차칸 깊이만 맞춥니다.', crookedFinish),
        [
          { id: 'keep-turn', label: `핸들을 ${left ? '왼쪽' : '오른쪽'}으로 돌린 상태를 유지해 계속 후진`, feedback: '차체가 나란해진 뒤에도 핸들을 돌린 채 움직이면 반대쪽 선으로 다시 기울어집니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 1.2 }] },
          { id: 'forward-again', label: 'D로 바꾸고 다시 크게 전진', feedback: '이미 평행하므로 큰 수정 대신 깊이만 맞추면 됩니다.', motion: [{ gear: 'D', steeringAngle: 0, seconds: 1.2 }] },
        ],
        '차체가 나란해진 뒤에는 핸들을 정면으로 하고 깊이만 조절하세요.',
        'reentry-decision',
      ),
    ],
  }

  const offsetX = left ? 14.84 : 15.16
  const correctionSide = left ? '오른쪽' : '왼쪽'
  const offsetStart = stopped(parked, { x: offsetX, gear: 'D' })
  const offsetTurn = left ? .6 : -.6
  const offsetShift = physicalPath(offsetStart, [
    { gear: 'D', steeringAngle: offsetTurn, seconds: 2.9 },
  ], runtime)
  const offsetCorrection = physicalPath(offsetShift.at(-1)!, [
    { gear: 'D', steeringAngle: -offsetTurn, seconds: 2.9 },
  ], runtime)
  const offsetForward = offsetCorrection.at(-1)!
  const offsetFinish = physicalPath(offsetForward, [
    { gear: 'R', steeringAngle: 0, seconds: 5.75 },
  ], runtime)
  const offCenter: CorrectionDrill = {
    id: 'off-center',
    title: '주차칸 가운데 맞추기',
    description: '차체는 평행하지만 한쪽으로 치우친 상태에서 앞쪽 수정 공간을 확보한 뒤 가운데로 다시 넣습니다.',
    steps: [
      staticStep(
        'off-center-assess',
        '좌우 간격 비교',
        '차체는 주차선과 나란하지만 한쪽 선에 더 가깝습니다.',
        '핸들만 돌려 바로 옆으로 옮길 수 있을까요?',
        offsetStart,
        { id: 'space-first', label: '옆으로 바로 이동할 수 없으므로 정지 상태에서 앞쪽 수정 공간부터 확인', feedback: '평행한 차량은 제자리에서 옆으로 이동할 수 없어 짧게 전진하며 이동 각도를 만들어야 합니다.' },
        [
          { id: 'sideways-reverse', label: '기어를 R에 놓고 핸들을 크게 돌려 바로 옆으로 이동', feedback: '뒤 모서리가 먼저 선에 가까워져 오히려 간격이 줄 수 있습니다.' },
          { id: 'accept-offset', label: '선 안에 있으므로 간격 확인 없이 종료', feedback: '문은 열리더라도 옆 차량과의 승하차 간격이 부족할 수 있습니다.' },
        ],
        '평행하지만 치우쳤다면 먼저 전진 수정 공간을 만들고 다시 정렬하세요.',
      ),
      pathStep(
        'off-center-shift',
        '옆 이동 각도 만들기',
        `앞쪽 여유를 확인했고 차량을 ${correctionSide}으로 조금 옮겨야 합니다.`,
        '차량을 주차칸 가운데 쪽으로 옮기려면 먼저 어떻게 할까요?',
        offsetShift,
        pathChoice('offset-shift', `D로 바꾸고 핸들을 ${correctionSide}으로 반 바퀴 돌려 짧게 전진`, '첫 번째 전진 곡선으로 주차칸 중심을 향하는 작은 이동 각도를 만듭니다.', offsetShift),
        [
          { id: 'long-swing', label: '최대 조향으로 길게 전진', feedback: '반대쪽 앞 모서리와 주변 차량에 새 위험을 만들 수 있습니다.', motion: [{ gear: 'D', steeringAngle: left ? .52 : -.52, seconds: 1.8 }] },
          { id: 'reverse-now', label: '현재 자리에서 바로 직선 후진', feedback: '좌우 치우침이 그대로 유지됩니다.', motion: [{ gear: 'R', steeringAngle: 0, seconds: 1.2 }] },
        ],
        '가운데 맞추기는 짧은 전진으로 먼저 작은 옆 이동 각도를 만드세요.',
        'correction-space',
      ),
      pathStep(
        'off-center-realign',
        '차체 다시 평행하게 만들기',
        '차량 중심이 주차칸 가운데 쪽으로 이동했지만 차체는 아직 비스듬합니다.',
        '차체를 다시 주차선과 나란하게 하려면?',
        offsetCorrection,
        pathChoice('offset-forward', `핸들을 ${correctionSide === '오른쪽' ? '왼쪽' : '오른쪽'}으로 반 바퀴 돌려 조금 더 전진한 뒤 정지`, '기어는 D를 유지하고 반대 곡선으로 이어가 차체를 다시 나란하게 맞춥니다.', offsetCorrection),
        [
          { id: 'keep-shift', label: `핸들을 ${correctionSide}으로 유지해 계속 전진`, feedback: '차체가 더 비스듬해져 반대쪽 공간을 잃을 수 있습니다.', motion: [{ gear: 'D', steeringAngle: offsetTurn, seconds: 1.2 }] },
          { id: 'reverse-early', label: '지금 바로 R로 바꾸고 후진', feedback: '차체가 아직 비스듬해 같은 쪽 선으로 다시 가까워집니다.', motion: [{ gear: 'R', steeringAngle: offsetTurn, seconds: 1.2 }] },
        ],
        '같은 기어에서 반대 조향으로 이어가 차체가 나란해지는 순간 멈추세요.',
        'first-correction',
      ),
      pathStep(
        'off-center-finish',
        '가운데로 직선 재진입',
        '차량 중심을 주차칸 중심선에 맞추고 차체도 다시 나란하게 만들었습니다.',
        '이제 어떻게 마무리할까요?',
        offsetFinish,
        pathChoice('offset-finish', '완전히 정지해 핸들을 정면으로 맞춘 뒤 천천히 직선 후진', '양쪽 선 간격을 번갈아 확인하며 가운데 위치를 유지합니다.', offsetFinish),
        [
          { id: 'keep-angle', label: `핸들을 ${left ? '왼쪽' : '오른쪽'}으로 돌린 상태를 유지해 끝까지 후진`, feedback: '차체가 이미 나란하므로 핸들을 돌린 채 후진하면 다시 한쪽 선으로 기울어집니다.', motion: [{ gear: 'R', steeringAngle: left ? .3 : -.3, seconds: 1.4 }] },
          { id: 'look-one-side', label: '가까웠던 한쪽 선만 보며 후진', feedback: '반대쪽 간격 변화를 놓칠 수 있습니다.' },
        ],
        '가운데에 맞춘 뒤에는 핸들을 정면으로 하고 양쪽 간격을 번갈아 보세요.',
        'reentry-decision',
      ),
    ],
  }

  function clearanceDrill(
    id: 'inner-clearance' | 'outer-swing',
    title: string,
    description: string,
    zone: typeof outerZone | typeof innerZone,
    dangerLabel: string,
  ): CorrectionDrill {
    const mirrorPose = (vehicle: VehicleState) => left
      ? vehicle
      : stopped(vehicle, {
        x: 30 - vehicle.x,
        heading: Math.PI - vehicle.heading,
        steeringAngle: -vehicle.steeringAngle,
      })
    const danger = mirrorPose(stopped(parked, id === 'inner-clearance'
      ? { x: 15.4, y: 5.45, heading: -1.8, steeringAngle: .48, gear: 'R' }
      : { x: 14.5, y: 9, heading: -1.8, steeringAngle: .42, gear: 'R' }))
    const direction = left ? 1 : -1
    const clearanceMotion: JudgmentMotion = id === 'inner-clearance'
      ? { gear: 'D', steeringAngle: .48 * direction, seconds: 1.5 }
      : { gear: 'D', steeringAngle: .533 * direction, seconds: 4.21 }
    const retreatMotions: JudgmentMotion[] = id === 'inner-clearance'
      ? [clearanceMotion]
      : [clearanceMotion, { gear: 'D', steeringAngle: -.49 * direction, seconds: 4.39 }]
    const clearance = physicalPath(danger, [clearanceMotion], runtime)
    const retreat = physicalPath(danger, retreatMotions, runtime)
    const safe = retreat.at(-1)!
    const reentryMotions: JudgmentMotion[] = id === 'inner-clearance'
      ? [
        { gear: 'R', steeringAngle: -.495 * direction, seconds: 4.51 },
        { gear: 'R', steeringAngle: .392 * direction, seconds: 4.52 },
        { gear: 'R', steeringAngle: 0, seconds: 7 },
      ]
      : [
        { gear: 'R', steeringAngle: .465 * direction, seconds: 3.23 },
        { gear: 'R', steeringAngle: -.515 * direction, seconds: 4.74 },
        { gear: 'R', steeringAngle: 0, seconds: 3.85 },
        { gear: 'D', steeringAngle: .56 * direction, seconds: 1 },
        { gear: 'R', steeringAngle: -.6 * direction, seconds: .68 },
        { gear: 'R', steeringAngle: 0, seconds: .08 },
      ]
    const reentry = physicalPath(stopped(safe, { gear: 'R' }), reentryMotions, runtime)
    const nearSide = zone.includes('right') ? '오른쪽' : '왼쪽'
    const retreatLabel = `${nearSide} ${id === 'inner-clearance' ? '뒤' : '앞'} 범퍼의 간격부터 회복하기`
    const retreatSteps = [
      '완전히 정지한 상태를 확인',
      '기어를 D에 놓기',
      `핸들을 ${steeringDirection(clearanceMotion.steeringAngle)}으로 약 반 바퀴 유지해 천천히 전진`,
      '범퍼와 옆 차 사이에 다시 간격이 보이면 정지',
    ]
    const reentryLabel = id === 'inner-clearance'
      ? `기어를 R에 놓고 핸들을 ${steeringDirection(-.495 * direction)}으로 약 반 바퀴 돌려 천천히 후진한 뒤, 반대 방향으로 풀어 차체를 나란하게 만들기`
      : `기어를 R에 놓고 ${nearSide} 앞 범퍼 간격을 보며 천천히 후진하고, 필요하면 다시 정지해 각도를 바로잡기`
    return {
      id,
      title,
      description,
      steps: [
        staticStep(
          `${id}-hazard`,
          '위험 모서리 판단',
          `핸들을 돌린 채 후진하는 동안 ${dangerLabel} 빠르게 가까워지고 있습니다.`,
          '가장 먼저 해야 할 행동은?',
          danger,
          { id: 'stop', label: `해당 모서리를 확인하고 즉시 완전히 정지`, feedback: '접촉 전에 멈춰야 되돌아갈 공간을 남길 수 있습니다.', focusZone: zone },
          commonWrongChoices(danger, -turn, zone),
          '간격이 빠르게 줄면 조향보다 정지가 먼저입니다.',
          'stop-timing',
        ),
        pathStep(
          `${id}-retreat`,
          '방금 경로 되돌아가기',
          '충돌 전에 정지했고 방금 지나온 전방 경로에는 여유가 있습니다.',
          '가까워진 모서리의 간격을 회복하려면?',
          clearance,
          {
            ...pathChoice('retrace', retreatLabel, '핸들을 유지한 채 천천히 전진하면 가까워졌던 범퍼가 옆 차에서 떨어집니다. 사이드미러에 다시 간격이 보이는 순간 멈추세요.', clearance),
            steps: retreatSteps,
          },
          [
            { id: 'center-forward', label: '핸들을 무조건 중앙으로 하고 길게 전진', feedback: '원래 궤적에서 벗어나 반대편에 새 위험을 만들 수 있습니다.', motion: [{ gear: 'D', steeringAngle: 0, seconds: 1.6 }] },
            { id: 'reverse-more', label: 'R을 유지해 조금 더 후진', feedback: '가까워진 모서리 쪽으로 계속 접근합니다.', motion: [{ gear: 'R', steeringAngle: danger.steeringAngle, seconds: 1.1 }], focusZone: zone },
          ],
          '먼저 이전 궤적을 짧게 되돌려 안전거리를 확보하세요.',
          'correction-space',
        ),
        ...(id === 'outer-swing' ? [pathStep(
          `${id}-realign`,
          '재진입 전 차체 각도 만들기',
          '앞 범퍼의 간격을 회복해 정지했지만, 바로 후진하기에는 차체 각도가 아직 부족합니다.',
          '다음 후진을 안전하게 시작하려면?',
          retreat.slice(clearance.length - 1),
          {
            ...pathChoice('realign-forward', '남은 전방 여유로 재진입 각도 만들기', '간격 회복과 재정렬은 목적이 다릅니다. 먼저 범퍼를 떼어 멈춘 뒤, 주변을 다시 확인하고 다음 후진에 필요한 각도만 만드세요.', retreat.slice(clearance.length - 1)),
            steps: [
              '앞쪽과 반대편 모서리의 여유를 다시 확인',
              `기어를 D에 둔 채 핸들을 ${steeringDirection(-.49 * direction)}으로 약 반 바퀴 조정`,
              '차체가 후진하기 좋은 각도가 되면 정지',
            ],
          },
          [
            { id: 'reverse-immediately', label: '간격만 생겼으므로 곧바로 후진', feedback: '차체 각도를 확인하지 않으면 같은 앞 범퍼가 다시 가까워질 수 있습니다.', focusZone: zone },
            { id: 'long-forward-realign', label: '핸들을 끝까지 돌리고 길게 전진', feedback: '반대편 모서리나 앞쪽 공간에 새로운 위험을 만들 수 있습니다.' },
          ],
          '간격 회복과 차체 재정렬을 분리하고, 각 동작 뒤에는 반드시 다시 멈춰 확인하세요.',
          'first-correction',
        )] : []),
        staticStep(
          `${id}-recheck`,
          '양쪽 간격 재확인',
          '간격을 회복한 뒤 다시 후진을 시작하려는 순간입니다.',
          '브레이크를 놓기 전에 무엇을 확인해야 할까요?',
          retreat.at(-1)!,
          { id: 'all-sides', label: '기존 위험과 반대편 모서리·차체 각도를 모두 확인', feedback: '수정하면서 반대편 상황도 달라졌으므로 전체 여유를 다시 봐야 합니다.' },
          [
            { id: 'old-side', label: '방금 가까웠던 한쪽만 확인', feedback: '반대편에 새 위험이 생겼을 수 있습니다.', focusZone: zone },
            { id: 'rear-only', label: '후방 화면 중앙만 확인', feedback: '곡선 재진입에서는 앞 모서리 휩쓸림도 함께 확인해야 합니다.' },
          ],
          '수정 뒤에는 처음 보는 장면처럼 양쪽을 다시 확인하세요.',
          'recheck',
        ),
        pathStep(
          `${id}-reenter`,
          '완만하게 재진입',
          '앞뒤와 양쪽에 재진입할 안전 여유를 확인했고 차량도 멈춰 있습니다.',
          '주차선에 맞춰 마무리하려면?',
          reentry,
          pathChoice('safe-reentry', reentryLabel, '핸들 방향을 먼저 정하고 저속으로 움직이며, 차체가 나란해지는 순간 핸들을 정면으로 돌립니다.', reentry),
          [
            { id: 'full-force', label: '최대 조향으로 빠르게 한 번에 후진', feedback: '같은 위험 모서리에 다시 접근할 수 있습니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 1.8 }], focusZone: zone },
            { id: 'restart-unneeded', label: '충분한 공간이 있지만 무조건 처음부터 재접근', feedback: '현재는 안전한 재진입 공간이 있어 짧은 수정으로 마무리할 수 있습니다.' },
          ],
          '재진입 후 차체가 나란해지는 순간 멈추고 핸들을 정면으로 돌리세요.',
          'reentry-decision',
        ),
      ],
    }
  }

  return [
    crooked,
    offCenter,
    clearanceDrill('inner-clearance', '뒤 범퍼 간격 확보하기', '후진할 때 뒤 범퍼가 옆 차에 가까워지면 먼저 멈추고 짧게 전진해 공간을 다시 만듭니다.', innerZone, `내 차 ${left ? '오른쪽' : '왼쪽'} 뒤 범퍼가 옆 차에`),
    clearanceDrill('outer-swing', '앞 범퍼 휩쓸림 피하기', '후진 중 핸들을 돌리면 반대쪽으로 움직이는 앞 범퍼까지 확인하고 수정합니다.', outerZone, `내 차 ${left ? '왼쪽' : '오른쪽'} 앞 범퍼가 옆 차에`),
  ]
}

function buildNarrowDrill(runtime: ScenarioRuntime): CorrectionDrill {
  const stages = buildNarrowAisleLessonSimulation(runtime)
  const firstReverse = stages[3].states
  const correction = stages[5].states
  const finishStage = stages[6].states
  const finishIndex = finishStage.reduce((best, vehicle, index) => (
    Math.abs(vehicle.y - 9.75) < Math.abs(finishStage[best].y - 9.75) ? index : best
  ), 0)
  const finish = finishStage.slice(0, finishIndex + 1)
  finish[finish.length - 1] = stopped(finish.at(-1)!, { steeringAngle: 0 })
  const left = runtime.startSide !== 'right'
  const turn = left ? .52 : -.52
  const innerZone = left ? 'rear-right' as const : 'rear-left' as const
  const outerZone = left ? 'front-left' as const : 'front-right' as const
  const split = correction.findIndex((vehicle, index) => index > 0
    && Math.sign(vehicle.steeringAngle) !== Math.sign(correction[index - 1].steeringAngle))
  const safeSplit = split > 1 ? split : Math.floor(correction.length / 2)
  const retreat = correction.slice(0, safeSplit + 1)
  const angleReset = correction.slice(safeSplit)

  return {
    id: 'narrow-multipoint',
    title: '좁은 통로 다단 수정',
    description: '앞쪽 벽과 양옆 차량 사이에서 여러 번 짧게 전진·후진하며 주차 각도를 만듭니다.',
    steps: [
      pathStep(
        'narrow-first-reverse',
        '핸들을 돌린 첫 번째 후진',
        '앞쪽 벽 여유 안에서 가능한 만큼 진입각을 만든 상태입니다.',
        '첫 후진은 어디까지 진행해야 할까요?',
        firstReverse,
        pathChoice('reverse-to-margin', '안쪽 뒤 모서리 간격이 빠르게 줄기 전까지 천천히 후진', '안전 여유가 남은 지점에서 첫 후진을 멈춥니다.', firstReverse),
        [
          { id: 'reverse-to-contact', label: '차량이 닿을 때까지 계속 후진', feedback: '수정 공간을 남기려면 접촉 전에 멈춰야 합니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 2 }], focusZone: innerZone },
          { id: 'no-reverse', label: '후진하지 않고 현재 위치에서 다시 전진', feedback: '현재 확보한 진입각을 이용해 가능한 후진 공간부터 사용해야 합니다.' },
        ],
        '좁은 통로에서는 한 번에 넣지 말고 안전 여유마다 멈추세요.',
        'stop-timing',
      ),
      staticStep(
        'narrow-assess',
        '앞뒤 수정 공간 판단',
        '안쪽 차량과 가까워지기 전에 정지했습니다.',
        '다음 수정 방향을 정하기 위해 무엇을 비교해야 할까요?',
        firstReverse.at(-1)!,
        { id: 'compare', label: '안쪽 차량 간격과 앞쪽 벽까지의 전진 공간을 함께 비교', feedback: '전진으로 기존 위험을 줄이면서 앞쪽 벽에 새 위험을 만들지 않아야 합니다.' },
        [
          { id: 'inside-only', label: '안쪽 차량만 보고 최대한 전진', feedback: '앞쪽 벽과 바깥쪽 모서리 공간을 놓칠 수 있습니다.', focusZone: innerZone },
          { id: 'wall-only', label: '앞쪽 벽만 보고 바로 다시 후진', feedback: '기존 안쪽 차량 간격이 회복되지 않은 상태입니다.', focusZone: outerZone },
        ],
        '앞뒤 공간을 동시에 비교해 짧은 수정 거리를 결정하세요.',
      ),
      pathStep(
        'narrow-retreat',
        '첫 번째 짧은 전진 수정',
        '앞쪽 벽까지 이동 여유가 있고 안쪽 차량 간격을 늘려야 합니다.',
        '첫 수정은 어떻게 해야 할까요?',
        retreat,
        pathChoice('short-forward', 'D로 짧게 전진해 안쪽 간격을 회복', '벽 여유 안에서 짧게 전진하며 기존 위험에서 벗어납니다.', retreat),
        [
          { id: 'long-forward', label: '앞쪽 벽 가까이까지 한 번에 길게 전진', feedback: '바깥쪽 앞 모서리에 새로운 위험을 만들 수 있습니다.', motion: [{ gear: 'D', steeringAngle: turn, seconds: 2 }], focusZone: outerZone },
          { id: 'reverse-again', label: '현재 위치에서 바로 다시 후진', feedback: '안쪽 차량과의 간격이 충분히 회복되지 않았습니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 1.2 }], focusZone: innerZone },
        ],
        '좁은 곳에서는 짧게 움직이고 매번 다시 정지하세요.',
        'correction-space',
      ),
      pathStep(
        'narrow-angle-reset',
        '두 번째 각도 수정',
        '안쪽 간격은 늘었지만 후진하기 좋은 각도가 아직 부족합니다.',
        '앞쪽 벽 여유 안에서 다음으로 할 일은?',
        angleReset,
        pathChoice('reset-angle', '반대 조향으로 짧게 더 전진해 재진입각 만들기', '앞쪽 여유를 사용해 두 번째 후진에 필요한 차체 각도를 만듭니다.', angleReset),
        [
          { id: 'center-only', label: '핸들을 중앙으로 하고 길게 직진', feedback: '차체 각도가 충분히 바뀌지 않아 같은 수정이 반복됩니다.', motion: [{ gear: 'D', steeringAngle: 0, seconds: 1.5 }] },
          { id: 'full-wall', label: '최대 조향으로 벽 가까이까지 전진', feedback: '바깥쪽 앞 모서리가 벽에 가까워질 수 있습니다.', motion: [{ gear: 'D', steeringAngle: -turn, seconds: 2 }], focusZone: outerZone },
        ],
        '한 번의 큰 수정이 아니라 남은 여유만큼 각도를 나눠 만드세요.',
        'first-correction',
      ),
      staticStep(
        'narrow-recheck',
        '재후진 전 전체 확인',
        '두 차례의 짧은 전진으로 재진입각을 만들었습니다.',
        'R로 바꾸기 전에 확인할 것은?',
        angleReset.at(-1)!,
        { id: 'full-check', label: '안쪽 차량·바깥쪽 앞 모서리·벽·차체 각도 모두 확인', feedback: '두 번의 수정으로 모든 간격이 달라졌으므로 전체를 다시 확인해야 합니다.' },
        [
          { id: 'inside-check', label: '처음 가까웠던 안쪽 차량만 확인', feedback: '전진 수정 중 바깥쪽 벽에 새 위험이 생겼을 수 있습니다.', focusZone: innerZone },
          { id: 'rear-camera', label: '후방 화면만 보고 바로 출발', feedback: '앞 모서리와 벽의 회전 공간을 확인할 수 없습니다.' },
        ],
        '수정할 때마다 네 방향의 여유를 새로 판단하세요.',
        'recheck',
      ),
      pathStep(
        'narrow-final',
        '두 번째 후진과 마무리',
        '재진입할 공간과 각도를 확보했습니다.',
        '어떻게 최종 주차를 완료할까요?',
        finish,
        pathChoice('final-reentry', `기어를 R에 놓고 핸들을 ${left ? '왼쪽' : '오른쪽'}으로 돌려 천천히 후진 → 나란해지는 순간 정지 → 핸들을 정면으로 돌려 직선 후진`, '두 번째 후진으로 평행을 만든 뒤 완전히 멈추고 핸들을 정면으로 돌려 주차를 완료합니다.', finish),
        [
          { id: 'force-turn', label: '최대 조향을 끝까지 유지해 한 번에 후진', feedback: '평행해진 뒤에도 조향하면 반대쪽 선을 넘을 수 있습니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 2 }] },
          { id: 'another-forward', label: '안전한 재진입각이지만 다시 크게 전진', feedback: '현재는 두 번째 후진으로 마무리할 공간이 확보되었습니다.' },
        ],
        '재진입 후 평행해지는 순간 핸들을 중앙으로 풀고 깊이만 맞추세요.',
        'reentry-decision',
      ),
    ],
  }
}

export function buildCorrectionDrills(runtime: ScenarioRuntime): CorrectionDrill[] {
  return runtime.scenarioId === 'narrow-aisle' ? [buildNarrowDrill(runtime)] : buildBothSidesDrills(runtime)
}
