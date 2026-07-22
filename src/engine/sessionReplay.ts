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
  if (result.centerError <= 0.35) wellDone.push(`중심 오차를 ${Math.round(result.centerError * 100)}cm로 유지했습니다.`)
  else {
    mistakes.push(`중심에서 ${Math.round(result.centerError * 100)}cm 벗어났습니다.`)
    improvements.push('마지막 직선 후진에서 양쪽 주차선 간격을 같게 맞추세요.')
  }
  if (result.angleErrorDegrees <= 5) wellDone.push(`각도 오차를 ${result.angleErrorDegrees.toFixed(1)}°로 정렬했습니다.`)
  else {
    mistakes.push(`주차선과 ${result.angleErrorDegrees.toFixed(1)}° 기울어졌습니다.`)
    improvements.push('차체가 주차선과 평행해지는 순간 정지하고 핸들을 중앙으로 복귀하세요.')
  }

  return { wellDone, mistakes, improvements }
}

export function firstMistakeEvent(events: ReplayEvent[], result: ParkingResult) {
  return events.find((event) => event.type === 'collision')
    ?? (result.success ? null : events.slice().reverse().find((event) => event.type === 'finish') ?? null)
}
