import { detectCollision } from './collisionDetection.ts'
import { rearSensorDistance } from './driverAssistance.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'
import type { VehicleState } from './vehiclePhysics.ts'
import type { ScenarioId } from '../types/practice.ts'

export type HintLevel = 'info' | 'caution' | 'danger'

export type LearningHint = {
  id: string
  level: HintLevel
  title: string
  message: string
}

function parkingAxisError(heading: number) {
  const difference = heading - TARGET_PARKING_BAY.heading
  return Math.abs(((difference + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2)
}

function clearanceViewName(scenarioId: ScenarioId, steeringAngle: number) {
  if (scenarioId === 'pillar-side' || scenarioId === 'right-side') return '우측 후방 평면뷰'
  if (scenarioId === 'left-side') return '좌측 후방 평면뷰'
  return steeringAngle < 0 ? '좌측 후방 평면뷰' : '우측 후방 평면뷰'
}

export function getLearningHint(vehicle: VehicleState, scenarioId: ScenarioId): LearningHint | null {
  if (detectCollision(vehicle)) {
    return { id: 'collision', level: 'danger', title: '충돌했습니다', message: '브레이크를 유지하고 처음 위치에서 다시 시도하세요.' }
  }

  const closeObstacle = detectCollision(vehicle, 0.5)
  if (closeObstacle) {
    const target = closeObstacle.kind === 'pillar' ? '기둥' : closeObstacle.kind === 'wall' ? '벽' : '주차 차량'
    return { id: `clearance-${closeObstacle.obstacleId}`, level: 'danger', title: `${target}이 너무 가깝습니다`, message: '즉시 정지하고 간격을 확인하세요.' }
  }

  const rearDistance = vehicle.gear === 'R' ? rearSensorDistance(vehicle) : null
  if (rearDistance !== null && rearDistance <= 0.7) {
    return { id: 'rear-danger', level: 'danger', title: `후방 ${rearDistance.toFixed(1)}m`, message: '즉시 브레이크를 밟으세요.' }
  }
  if (rearDistance !== null && rearDistance <= 1.3) {
    return { id: 'rear-caution', level: 'caution', title: `후방 ${rearDistance.toFixed(1)}m`, message: '속도를 유지하지 말고 정지할 준비를 하세요.' }
  }

  const axisError = parkingAxisError(vehicle.heading)
  const insideParkingArea = vehicle.y >= TARGET_PARKING_BAY.top - 1
  if (insideParkingArea && axisError <= Math.PI / 10 && Math.abs(vehicle.steeringAngle) >= 0.12) {
    return { id: 'center-steering', level: 'caution', title: '핸들을 중앙으로', message: '차체가 주차선과 거의 평행합니다. 정지한 뒤 핸들을 풀고 직선 후진하세요.' }
  }

  if (vehicle.gear === 'R' && Math.abs(vehicle.steeringAngle) >= 0.18) {
    const clearanceView = clearanceViewName(scenarioId, vehicle.steeringAngle)
    return { id: `clearance-view-${clearanceView}`, level: 'info', title: `${clearanceView} 확인`, message: '뒤 모서리 간격과 반대편으로 움직이는 앞부분을 번갈아 확인하세요.' }
  }

  if (vehicle.y < TARGET_PARKING_BAY.top - 1.6 && vehicle.x < TARGET_PARKING_BAY.right + 1.5) {
    return { id: 'set-entry-point', level: 'info', title: '먼저 진입점을 만드세요', message: '브레이크 상태에서 D를 선택하고 뒤 범퍼가 주차칸 입구를 지날 때까지 전진하세요.' }
  }

  if (insideParkingArea && axisError > Math.PI / 5) {
    return { id: 'keep-turning', level: 'info', title: '아직 회전 중입니다', message: '차체가 주차선과 평행해질 때까지 미러의 선 각도를 확인하세요.' }
  }

  return null
}
