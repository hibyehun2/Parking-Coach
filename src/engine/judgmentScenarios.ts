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

function stringSeed(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function shuffledJudgmentChoices(choices: JudgmentChoice[], scenarioId: string, sessionSeed: number) {
  const shuffled = [...choices]
  let state = stringSeed(`${scenarioId}:${sessionSeed}`)
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
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
    title: '간격을 회복하는 기본 순서',
    situation: '핸들을 끝까지 돌려 후진하던 중 한쪽 간격이 부족해 완전히 정지했습니다.',
    question: '어느 쪽이 좁아도 첫 동작은 핸들을 정중앙으로 풀어 바퀴를 일자로 만드는 것입니다.',
    vehicle,
    choices: [{
      id: 'guided-answer',
      label: '핸들 원위치 후 가까운 쪽은 뒤로, 먼 쪽은 앞으로',
      steps: [
        '완전히 정지하고 핸들을 정중앙으로 풀기',
        '가까운 쪽이 좁으면 R로 50cm~1m 직선 후진',
        '먼 쪽이 좁으면 D로 50cm~1m 직선 전진',
        '처음 주차하던 방향으로 다시 최대 조향해 후진',
      ],
      feedback: '공간을 만든 뒤 반대가 아니라 처음 꺾었던 방향으로 다시 조향합니다. 여전히 부족하면 핸들 원위치부터 반복합니다.',
      previewStates: [
        vehicle,
        { ...vehicle, steeringAngle: 0 },
      ],
    }],
    answer: 'guided-answer',
    takeaway: '핸들 원위치 → 가까운 쪽은 짧게 후진 · 먼 쪽은 짧게 전진 → 처음 방향으로 다시 조향',
  }
}
