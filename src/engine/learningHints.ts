import { detectCollision } from './collisionDetection.ts'
import { rearSensorDistance } from './driverAssistance.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'
import type { VehicleState } from './vehiclePhysics.ts'
import type { ScenarioId, ScenarioRuntime } from '../types/practice.ts'

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
  if (scenarioId === 'wall-side') return '벽면 쪽 간격을 먼저 본 뒤 반대편 주차선도 확인하세요.'
  if (scenarioId === 'one-side') return '차량이 있는 쪽을 먼저 본 뒤 빈 쪽 주차선도 확인하세요.'
  if (scenarioId === 'tight-entry') return '닿을 것 같으면 먼저 정지하고 중앙으로 풀어 전진 수정하세요.'
  return '좌우 사이드미러를 짧게 번갈아 보며 양쪽 간격을 비교하세요.'
}

function wrappedAngle(value: number) {
  return ((value + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
}

function expectedSteeringDirection(runtime?: ScenarioRuntime) {
  return runtime?.startSide === 'right' ? -1 : 1
}

function entryProgress(vehicle: VehicleState, runtime?: ScenarioRuntime) {
  return runtime?.startSide === 'right'
    ? 24.5 - vehicle.x
    : vehicle.x - 5.5
}

function entryAngle(vehicle: VehicleState, runtime?: ScenarioRuntime) {
  const startHeading = runtime?.startSide === 'right' ? Math.PI : 0
  return Math.abs(wrappedAngle(vehicle.heading - startHeading))
}

export function getLearningHint(vehicle: VehicleState, scenarioId: ScenarioId, runtime?: ScenarioRuntime): LearningHint | null {
  if (detectCollision(vehicle, 0, runtime)) {
    return { id: 'collision', level: 'danger', title: '충돌했습니다', message: '브레이크를 유지하고 처음 위치에서 다시 시도하세요.' }
  }

  const closeObstacle = detectCollision(vehicle, 0.5, runtime)
  if (closeObstacle) {
    const target = closeObstacle.kind === 'pillar' ? '기둥' : closeObstacle.kind === 'wall' ? '벽' : '주차 차량'
    return { id: `clearance-${closeObstacle.obstacleId}`, level: 'danger', title: `${target}이 너무 가깝습니다`, message: '즉시 정지하고 간격을 확인하세요.' }
  }

  const rearDistance = vehicle.gear === 'R' ? rearSensorDistance(vehicle, 5, runtime) : null
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

  const parkingSteeringDirection = expectedSteeringDirection(runtime)
  const steeringTowardSpace = vehicle.steeringAngle * parkingSteeringDirection

  if (vehicle.gear === 'R' && steeringTowardSpace >= 0.18) {
    return { id: 'alternate-side-mirrors', level: 'info', title: '좌우 사이드미러 교차 확인', message: mirrorPriority(scenarioId) }
  }

  if (vehicle.gear === 'R') {
    return { id: 'turn-toward-space', level: 'info', title: '주차 공간 방향으로 조향', message: '완전히 정지한 상태에서 주차 공간 방향으로 핸들을 돌린 뒤, 양쪽 간격을 확인하며 천천히 후진하세요.' }
  }

  if (scenarioId === 'tight-entry') {
    return {
      id: 'correction-forward',
      level: 'caution',
      title: '짧게 전진해 간격 확보',
      message: '핸들을 중앙으로 유지하고 가까운 모서리의 간격이 회복될 만큼만 천천히 전진하세요.',
    }
  }

  const progress = entryProgress(vehicle, runtime)
  const angle = entryAngle(vehicle, runtime)
  const inApproachLane = vehicle.y >= 2.2 && vehicle.y <= TARGET_PARKING_BAY.top + 0.4
  const steeringAwayFromSpace = vehicle.steeringAngle * parkingSteeringDirection <= -0.18
  const reachedTurningZone = progress >= 9.7
  const passedTurningZone = progress > 11.2 || vehicle.y > TARGET_PARKING_BAY.top + 0.4

  if (passedTurningZone || angle > Math.PI * .42) {
    return {
      id: 'entry-overshot',
      level: 'caution',
      title: '진입 위치를 다시 확인',
      message: '후진 준비 위치를 지나쳤습니다. 완전히 정지하고 앞부분과 옆 차량의 여유를 확인한 뒤 위치를 수정하세요.',
    }
  }

  if (steeringAwayFromSpace && (!inApproachLane || !reachedTurningZone)) {
    return {
      id: 'turning-too-early',
      level: 'caution',
      title: '조향이 너무 이릅니다',
      message: '핸들을 중앙으로 돌리고 주차칸 앞 진입 위치를 먼저 맞추세요.',
    }
  }

  if (steeringAwayFromSpace && angle >= Math.PI / 6) {
    return {
      id: 'entry-angle-ready',
      level: 'info',
      title: '후진 준비 위치입니다',
      message: '완전히 정지하세요. 목표 주차칸 입구와 내 차 앞부분의 회전 여유를 확인한 뒤 R로 바꾸세요.',
    }
  }

  if (steeringAwayFromSpace) {
    return {
      id: 'make-entry-angle',
      level: 'info',
      title: '차를 비스듬히 세우세요',
      message: '주차칸 반대 방향으로 천천히 조향하세요. 후진할 공간이 확보되면 완전히 정지하세요.',
    }
  }

  return {
    id: 'set-entry-point',
    level: 'info',
    title: '주차칸 앞 진입 위치 맞추기',
    message: reachedTurningZone
      ? '완전히 정지한 뒤 주차칸 반대 방향으로 천천히 조향해 후진 공간을 만드세요.'
      : '주차칸과 나란히 천천히 전진하세요. 목표 주차칸과 옆 차량의 간격을 함께 확인하세요.',
  }
}
