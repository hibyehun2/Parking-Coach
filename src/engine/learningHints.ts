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

function mirrorPriority(scenarioId: ScenarioId) {
  if (scenarioId === 'pillar-side') return '기둥 쪽 미러를 먼저 본 뒤 반대편 미러도 확인하세요.'
  if (scenarioId === 'left-side') return '좌측 미러를 먼저 본 뒤 우측 미러도 확인하세요.'
  if (scenarioId === 'right-side') return '우측 미러를 먼저 본 뒤 좌측 미러도 확인하세요.'
  return '좌우 사이드미러를 짧게 번갈아 보며 양쪽 간격을 비교하세요.'
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

  if (vehicle.gear === 'R' && insideParkingArea && axisError <= Math.PI / 10 && Math.abs(vehicle.steeringAngle) < 0.06) {
    return { id: 'rear-camera-finish', level: 'info', title: '후방 가이드로 마무리', message: '바퀴를 일자로 유지하고 뒤쪽 장애물과 남은 거리를 확인하며 천천히 후진하세요.' }
  }

  if (vehicle.gear === 'R' && vehicle.steeringAngle >= 0.18) {
    return { id: 'alternate-side-mirrors', level: 'info', title: '좌우 사이드미러 교차 확인', message: mirrorPriority(scenarioId) }
  }

  if (vehicle.gear === 'R') {
    return { id: 'turn-toward-space', level: 'info', title: '주차 방향으로 끝까지', message: '정지 상태에서 핸들을 오른쪽 끝까지 돌린 뒤, 좌우 사이드미러를 번갈아 보며 후진하세요.' }
  }

  if (vehicle.steeringAngle <= -0.18) {
    return { id: 'make-entry-angle', level: 'info', title: '사이드미러 기준점까지 전진', message: '내 차 뒷부분이 주차 공간 중간쯤 오면 완전히 정지하세요.' }
  }

  return { id: 'set-entry-point', level: 'info', title: '진입 간격과 끝 선 맞추기', message: '주차선과 50cm~2m 간격을 두고 끝 선에 운전자 어깨를 맞춘 뒤 핸들을 왼쪽 끝까지 돌리세요.' }
}
