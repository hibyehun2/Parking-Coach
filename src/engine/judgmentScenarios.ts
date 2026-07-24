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

export const JUDGMENT_SKILL_INFO: Record<JudgmentSkill, { title: string; description: string }> = {
  'hazard-prediction': {
    title: '위험 지점 찾기',
    description: '가까워지는 범퍼와 좁아지는 간격을 먼저 찾습니다.',
  },
  'stop-timing': {
    title: '멈출 시점 판단',
    description: '수정 공간을 잃기 전에 안전하게 멈출 지점을 판단합니다.',
  },
  'correction-space': {
    title: '수정 공간 만들기',
    description: '짧게 전진하거나 후진해 다음 조작에 필요한 공간을 만듭니다.',
  },
  'first-correction': {
    title: '차체 자세 맞추기',
    description: '조향 방향을 바꿔 차체 각도와 가운데 위치를 맞춥니다.',
  },
  recheck: {
    title: '수정 후 재확인',
    description: '움직임 뒤 달라진 앞뒤와 양쪽 여유를 다시 확인합니다.',
  },
  'reentry-decision': {
    title: '안전하게 재진입',
    description: '확보한 공간에서 다시 후진해 평행과 깊이를 맞춥니다.',
  },
}

export type JudgmentMotion = {
  gear: 'D' | 'R'
  steeringAngle: number
  seconds: number
}

export type JudgmentChoice = {
  id: string
  label: string
  steps?: string[]
  feedback: string
  motion?: JudgmentMotion[]
  previewStates?: VehicleState[]
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
  focusZone?: JudgmentChoice['focusZone']
}

export function simulateJudgmentChoice(start: VehicleState, choice: JudgmentChoice, runtime: ScenarioRuntime) {
  if (choice.previewStates?.length) {
    const states = choice.previewStates.map((vehicle) => ({ ...vehicle }))
    return {
      states,
      points: states.map(({ x, y }) => ({ x, y })),
      collided: states.some((vehicle) => Boolean(resolveVehicleCollision(vehicle, vehicle, runtime).collision)),
    }
  }

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

export function buildJudgmentGuide(runtime: ScenarioRuntime): JudgmentScenario {
  const turn = runtime.startSide === 'left' ? .52 : -.52
  const vehicle: VehicleState = {
    ...runtime.initialVehicle,
    x: 15,
    y: 5.75,
    heading: runtime.startSide === 'left' ? -1.02 : -2.12,
    gear: 'R',
    steeringAngle: turn,
    speed: 0,
    braking: true,
  }
  return {
    id: 'guided-safe-recovery',
    skill: 'first-correction',
    title: '먼저 예시로 익히기',
    situation: '핸들을 돌린 채 후진하던 중 한쪽 범퍼가 옆 차에 빠르게 가까워져 완전히 정지했습니다.',
    question: '안전한 수정은 방금 이동한 곡선을 반대 방향으로 짧게 되돌아가 공간을 회복하는 것입니다.',
    vehicle,
    choices: [{
      id: 'guided-answer',
      label: '가까워진 범퍼의 간격부터 회복하기',
      steps: [
        '완전히 정지',
        '기어를 D에 놓기',
        '현재 핸들 방향을 유지해 방금 지나온 안전 공간까지 짧게 전진',
        '간격이 보이면 다시 정지',
      ],
      feedback: '실제 전진 움직임으로 가까워진 범퍼를 옆 차에서 떼고 다음 조향을 위한 공간을 만듭니다.',
      motion: [{ gear: 'D', steeringAngle: turn, seconds: 1.15 }],
    }],
    answer: 'guided-answer',
    takeaway: '위험하면 먼저 정지하고 D로 바꾼 뒤, 범퍼 간격이 다시 생길 만큼만 짧게 전진하세요.',
  }
}
