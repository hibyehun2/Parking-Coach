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
    situation: '곡선 후진 중 가까운 모서리의 간격이 빠르게 줄어 완전히 정지했습니다.',
    question: '안전한 수정은 방금 이동한 곡선을 반대 방향으로 짧게 되돌아가 공간을 회복하는 것입니다.',
    vehicle,
    choices: [{
      id: 'guided-answer',
      label: '완전히 정지 → D → 같은 궤적을 짧게 되돌아가기',
      feedback: '기존 조향 궤적을 반대로 따라가면 새로운 옆 방향 움직임을 줄이며 위험 지점에서 벗어날 수 있습니다.',
      motion: [{ gear: 'D', steeringAngle: turn, seconds: 1.15 }],
    }],
    answer: 'guided-answer',
    takeaway: '위험하면 먼저 정지하고, 방금 지나온 안전 경로를 짧게 되돌아가세요.',
  }
}
