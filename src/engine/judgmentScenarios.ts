import type { ScenarioRuntime } from '../types/practice.ts'
import { resolveVehicleCollision } from './collisionDetection.ts'
import { updateVehicle, type VehicleState } from './vehiclePhysics.ts'

export type JudgmentSkill =
  | 'hazard-prediction'
  | 'stop-timing'
  | 'correction-space'
  | 'first-correction'
  | 'recheck'
  | 'reentry-decision'

export type JudgmentMotion = {
  gear: 'D' | 'R'
  steeringAngle: number
  seconds: number
}

export type JudgmentChoice = {
  id: string
  label: string
  feedback: string
  motion?: JudgmentMotion[]
  focusZone?: 'front-left' | 'front-right' | 'rear-left' | 'rear-right'
}

export type JudgmentScenario = {
  id: string
  skill: JudgmentSkill
  title: string
  situation: string
  question: string
  vehicle: VehicleState
  choices: JudgmentChoice[]
  answer: string
  takeaway: string
}

export function simulateJudgmentChoice(start: VehicleState, choice: JudgmentChoice, runtime: ScenarioRuntime) {
  let vehicle = { ...start, speed: 0, braking: true }
  const states = [{ ...vehicle }]
  const points = [{ x: vehicle.x, y: vehicle.y }]
  let collided = false

  for (const command of choice.motion ?? []) {
    vehicle = { ...vehicle, gear: command.gear, steeringAngle: command.steeringAngle, braking: false, speed: 0 }
    const steps = Math.ceil(command.seconds / .08)
    for (let index = 0; index < steps; index += 1) {
      const next = updateVehicle(vehicle, { steeringDirection: 0, braking: false }, .08)
      const resolved = resolveVehicleCollision(vehicle, next, runtime)
      vehicle = resolved.vehicle
      states.push({ ...vehicle })
      points.push({ x: vehicle.x, y: vehicle.y })
      if (resolved.collision) {
        collided = true
        break
      }
    }
    if (collided) break
  }
  return { states, points, collided }
}

const startsLeft = (runtime: ScenarioRuntime) => runtime.startSide === 'left'
const parkingTurn = (runtime: ScenarioRuntime) => startsLeft(runtime) ? .52 : -.52

function state(runtime: ScenarioRuntime, values: Partial<VehicleState>): VehicleState {
  return { ...runtime.initialVehicle, speed: 0, braking: true, ...values }
}

export function buildJudgmentGuide(runtime: ScenarioRuntime): JudgmentScenario {
  const turn = parkingTurn(runtime)
  return {
    id: 'guided-safe-recovery',
    skill: 'first-correction',
    title: '먼저 예시로 익히기',
    situation: '곡선 후진 중 바깥쪽 앞 모서리의 간격이 빠르게 줄어 완전히 정지했습니다.',
    question: '안전한 수정은 멈춘 상태에서 핸들을 중앙으로 하고, 방금 이동한 경로를 짧게 되돌아가는 것입니다.',
    vehicle: state(runtime, {
      x: 15,
      y: 5.75,
      heading: startsLeft(runtime) ? -1.02 : -2.12,
      gear: 'R',
      steeringAngle: turn,
    }),
    choices: [{
      id: 'guided-answer',
      label: '핸들 중앙 → D → 짧게 전진 → 다시 정지',
      feedback: '차량이 직선에 가깝게 되돌아가면서 가까웠던 앞 모서리의 간격이 회복됩니다.',
      motion: [{ gear: 'D', steeringAngle: 0, seconds: 1.25 }],
    }],
    answer: 'guided-answer',
    takeaway: '위험하면 먼저 정지하고, 예측 가능한 짧은 이동으로 공간을 회복하세요.',
  }
}

export function buildJudgmentScenarios(runtime: ScenarioRuntime): JudgmentScenario[] {
  const left = startsLeft(runtime)
  const direction = left ? 1 : -1
  const turn = parkingTurn(runtime)
  const opposite = -turn
  const outerFront = left ? 'front-left' : 'front-right'
  const innerRear = left ? 'rear-right' : 'rear-left'
  const narrow = runtime.scenarioId === 'narrow-aisle'

  return [
    {
      id: 'hazard-prediction',
      skill: 'hazard-prediction',
      title: '위험 지점 예측',
      situation: '차량이 비스듬한 상태로 주차칸 방향으로 곡선 후진하고 있습니다.',
      question: '현재 조향을 유지하면 가장 먼저 확인해야 할 곳은 어디일까요?',
      vehicle: state(runtime, { x: 15 - direction * .45, y: 5.35, heading: left ? -.92 : -2.22, gear: 'R', steeringAngle: turn }),
      choices: [
        { id: 'outer-front', label: '회전 바깥쪽 앞 모서리', feedback: '곡선 후진에서는 바깥쪽 앞 모서리가 크게 휩쓸립니다.', focusZone: outerFront },
        { id: 'inner-rear', label: '주차칸 안쪽 뒤 모서리', feedback: '안쪽 뒤 모서리도 확인해야 하지만 이 장면에서는 바깥쪽 앞 모서리의 간격이 더 빠르게 줄어요.', focusZone: innerRear },
        { id: 'rear-center', label: '뒤 범퍼 중앙', feedback: '후방 중앙만 보면 회전하며 크게 움직이는 앞 모서리를 놓칠 수 있어요.' },
      ],
      answer: 'outer-front',
      takeaway: '곡선 후진에서는 진행 방향 뒤쪽과 회전 바깥쪽 앞 모서리를 교차 확인하세요.',
    },
    {
      id: 'stop-timing',
      skill: 'stop-timing',
      title: '정지 시점',
      situation: '모서리 간격이 아직 남아 있지만 직전보다 빠르게 줄고 있습니다.',
      question: '수정할 공간을 남기기 위한 가장 안전한 행동은?',
      vehicle: state(runtime, { x: 15, y: 5.7, heading: left ? -1.03 : -2.11, gear: 'R', steeringAngle: turn }),
      choices: [
        { id: 'stop', label: '지금 브레이크로 완전히 정지', feedback: '간격 감소가 빨라질 때 멈추면 접촉 전에 수정 공간을 남길 수 있어요.', focusZone: outerFront },
        { id: 'slow', label: '속도만 줄이고 계속 후진', feedback: '저속이어도 같은 곡선을 유지하면 간격은 계속 줄어듭니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 1.25 }], focusZone: outerFront },
        { id: 'moving-countersteer', label: '움직이면서 반대 조향', feedback: '위험 가까이에서 움직이며 조향하면 반대편에 새로운 위험이 생길 수 있어요.', motion: [{ gear: 'R', steeringAngle: opposite, seconds: 1.25 }] },
      ],
      answer: 'stop',
      takeaway: '남은 거리뿐 아니라 간격이 줄어드는 속도를 보고 정지하세요.',
    },
    {
      id: 'correction-space',
      skill: 'correction-space',
      title: '수정 공간 확인',
      situation: narrow ? '뒤쪽은 옆 차량과 가깝고 앞쪽에는 벽까지 짧은 이동 공간이 남아 있습니다.' : '뒤쪽은 옆 차량과 가깝고 방금 지나온 앞쪽 경로에는 여유가 남아 있습니다.',
      question: '움직이기 전에 어떤 공간을 기준으로 수정 방향을 정해야 할까요?',
      vehicle: state(runtime, { x: 15, y: 5.8, heading: left ? -1.02 : -2.12, gear: 'R', steeringAngle: turn }),
      choices: [
        { id: 'compare-both', label: '앞뒤 공간과 양쪽 모서리를 모두 비교', feedback: '움직일 방향뿐 아니라 그 반대편에 새 위험이 생기지 않는지도 함께 확인해야 합니다.' },
        { id: 'hit-side-only', label: '가까워진 모서리 한 곳만 확인', feedback: '한쪽만 보면 수정 이동 중 반대편에 생기는 위험을 놓칠 수 있어요.', focusZone: outerFront },
        { id: 'camera-only', label: '후방 화면 중앙 거리만 확인', feedback: '후방 중앙 화면만으로는 회전하는 앞 모서리와 앞쪽 수정 공간을 판단하기 어렵습니다.' },
      ],
      answer: 'compare-both',
      takeaway: '앞뒤 이동 공간과 양쪽 모서리 여유를 비교한 뒤 수정 방향을 결정하세요.',
    },
    {
      id: 'first-correction',
      skill: 'first-correction',
      title: '첫 수정 동작',
      situation: '곡선 후진을 완전히 멈췄고 방금 지나온 앞쪽 경로에 안전 여유가 있습니다.',
      question: '가까워진 모서리의 간격을 가장 예측 가능하게 회복하려면?',
      vehicle: state(runtime, { x: 15, y: 5.85, heading: left ? -1.02 : -2.12, gear: 'R', steeringAngle: turn }),
      choices: [
        { id: 'forward-straight', label: '핸들 중앙 후 D로 짧게 전진', feedback: '방금 이동한 경로를 직선에 가깝게 되돌아가며 간격을 회복합니다.', motion: [{ gear: 'D', steeringAngle: 0, seconds: 1.25 }] },
        { id: 'reverse-more', label: '현재 조향으로 조금 더 후진', feedback: '이미 줄어든 모서리 간격이 더 작아집니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 1.1 }], focusZone: outerFront },
        { id: 'forward-full-turn', label: 'D에서 반대편 최대 조향으로 전진', feedback: '큰 조향은 반대편 모서리를 크게 움직여 새 위험을 만듭니다.', motion: [{ gear: 'D', steeringAngle: opposite, seconds: 1.25 }] },
      ],
      answer: 'forward-straight',
      takeaway: '먼저 중앙 조향으로 짧게 되돌아가 안전거리를 확보하세요.',
    },
    {
      id: 'recheck',
      skill: 'recheck',
      title: '수정 후 재확인',
      situation: '짧은 전진 수정을 마치고 다시 R로 출발하려는 순간입니다.',
      question: '브레이크를 놓기 전에 다시 확인해야 할 것은?',
      vehicle: state(runtime, { x: 15 - direction * .12, y: 5.25, heading: left ? -.82 : -2.32, gear: 'R', steeringAngle: turn }),
      choices: [
        { id: 'current-all', label: '현재 진행 방향·양쪽 모서리·차체 각도', feedback: '수정 뒤에는 이전 위험이 아니라 현재 위치의 모든 여유를 다시 확인해야 합니다.' },
        { id: 'old-risk', label: '아까 가까웠던 모서리만 확인', feedback: '수정하면서 반대편 모서리에 새로운 위험이 생겼을 수 있어요.', focusZone: outerFront },
        { id: 'rear-only', label: '후방 화면 중앙만 확인', feedback: '재진입에서는 회전하는 앞 모서리와 양쪽 간격도 함께 봐야 합니다.' },
      ],
      answer: 'current-all',
      takeaway: '수정이 끝날 때마다 처음 보는 장면처럼 전체 여유를 다시 확인하세요.',
    },
    {
      id: 'reentry-decision',
      skill: 'reentry-decision',
      title: '재진입 또는 재접근',
      situation: '차체 각도가 크게 틀어졌고 앞뒤와 양쪽 모두 짧은 수정 공간만 남았습니다.',
      question: '여러 번 작은 수정을 계속하기보다 가장 안전한 선택은?',
      vehicle: state(runtime, { x: 15 + direction * 1.05, y: 6.4, heading: left ? -.5 : -2.64, gear: 'R', steeringAngle: turn }),
      choices: [
        { id: 'restart', label: '안전하게 빠져나가 기준점부터 재접근', feedback: '각도 오차가 크고 수정 공간이 부족하면 재접근이 더 단순하고 안전합니다.', motion: [{ gear: 'D', steeringAngle: 0, seconds: 2.1 }] },
        { id: 'repeat', label: '앞뒤로 짧게 계속 반복 수정', feedback: '각 이동마다 새로운 사각지대가 생기고 판단 부담이 커집니다.', motion: [{ gear: 'D', steeringAngle: opposite, seconds: .75 }, { gear: 'R', steeringAngle: turn, seconds: .75 }] },
        { id: 'force', label: '최대 조향으로 한 번에 후진', feedback: '공간이 부족한 상태에서 큰 조향은 앞 모서리 충돌 가능성을 높입니다.', motion: [{ gear: 'R', steeringAngle: turn, seconds: 1.7 }], focusZone: outerFront },
      ],
      answer: 'restart',
      takeaway: '공간이 없고 각도 차이가 크면 수정 횟수를 늘리지 말고 다시 접근하세요.',
    },
  ]
}
