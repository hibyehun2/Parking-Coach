import type { Collision } from './collisionDetection.ts'
import type { ParkingResult } from './parkingEvaluation.ts'
import type { VehicleState } from './vehiclePhysics.ts'

export type ReplayEventType = 'start' | 'gear' | 'collision' | 'finish'

export type ReplayEvent = {
  id: string
  elapsedSeconds: number
  type: ReplayEventType
  label: string
  vehicle: VehicleState
  collision?: Collision
  impactVehicle?: VehicleState
  clip?: VehicleState[]
  phase?: 'approach' | 'turning-reverse' | 'straight-reverse' | 'finish'
}

export type ResultInsight = {
  wellDone: string[]
  mistakes: string[]
  improvements: string[]
}

export function cloneVehicleState(vehicle: VehicleState): VehicleState {
  return { ...vehicle, speed: 0, braking: true }
}

export function analyzeParkingResult(result: ParkingResult): ResultInsight {
  const wellDone: string[] = []
  const mistakes: string[] = []
  const improvements: string[] = []

  if (result.fullyInside) wellDone.push('차량 전체를 주차선 안에 넣었습니다.')
  else {
    mistakes.push('차량 일부가 주차선 밖에 남았습니다.')
    improvements.push('양쪽 미러의 주차선 간격을 번갈아 비교하며 중앙으로 조정하세요.')
  }
  if (result.stopped) wellDone.push('브레이크를 작동해 안전하게 정지했습니다.')
  else {
    mistakes.push('차량이 움직이는 상태에서 연습을 종료했습니다.')
    improvements.push('기준점과 평행 상태를 확인할 때마다 완전히 정지하세요.')
  }
  if (result.collisionCount === 0) wellDone.push('장애물과 충돌 없이 안전거리를 유지했습니다.')
  else {
    mistakes.push(`${result.collisionCount}회의 충돌이 발생했습니다.`)
    improvements.push('충돌 지점 직전부터 다시 시작해 좌우 미러를 더 짧게 교차 확인하세요.')
  }
  return { wellDone, mistakes, improvements }
}

export function firstMistakeEvent(events: ReplayEvent[], result: ParkingResult) {
  return events.find((event) => event.type === 'collision')
    ?? (result.success ? null : events.slice().reverse().find((event) => event.type === 'finish') ?? null)
}
