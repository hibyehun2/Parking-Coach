import { WALLS } from '../engine/collisionDetection.ts'
import { INITIAL_VEHICLE_STATE, type VehicleState } from '../engine/vehiclePhysics.ts'
import type { Scenario, ScenarioId, ScenarioParkedVehicle, ScenarioRuntime, ScenarioWall } from '../types/practice.ts'

export const FIRST_SUCCESS_KEY = 'parking-coach:first-success:v1'

export const scenarios: Scenario[] = [
  { id: 'both-sides', title: '양옆 차량', description: '양쪽 차량 사이의 간격을 번갈아 확인해요.', difficulty: '첫 번째 연습', visual: 'cars-both', available: true },
  { id: 'one-side', title: '한쪽 차량', description: '차량이 좌우 중 무작위로 배치돼요.', difficulty: '준비 중', visual: 'car-left', available: false },
  { id: 'wall-side', title: '벽면 옆', description: '벽면 쪽 회전 여유와 간격을 익혀요.', difficulty: '준비 중', visual: 'wall-side', available: false },
  { id: 'tight-entry', title: '좁은 진입 수정', description: '실전 모드의 움직이는 판단 퀴즈로 먼저 만나요.', difficulty: '준비 중', visual: 'tight-entry', available: false },
]

const LEFT_CAR: ScenarioParkedVehicle = { id: 'parked-left', kind: 'vehicle', x: 12.3, y: 9.75, heading: -Math.PI / 2, side: 'left' }
const RIGHT_CAR: ScenarioParkedVehicle = { id: 'parked-right', kind: 'vehicle', x: 17.7, y: 9.75, heading: -Math.PI / 2, side: 'right' }

function mirroredStart(side: 'left' | 'right'): VehicleState {
  return {
    ...INITIAL_VEHICLE_STATE,
    x: side === 'left' ? 5.5 : 24.5,
    y: 4,
    heading: side === 'left' ? 0 : Math.PI,
    steeringAngle: 0,
    speed: 0,
    gear: 'D',
    braking: true,
  }
}

export function loadFirstSuccess(storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {
  const empty = Object.fromEntries(scenarios.map(({ id }) => [id, false])) as Record<ScenarioId, boolean>
  if (!storage) return empty
  try {
    const value = JSON.parse(storage.getItem(FIRST_SUCCESS_KEY) ?? '{}') as Record<string, unknown>
    for (const scenario of scenarios) empty[scenario.id] = value[scenario.id] === true
  } catch {
    storage.setItem(FIRST_SUCCESS_KEY, JSON.stringify(empty))
  }
  return empty
}

export function markFirstSuccess(scenarioId: ScenarioId, storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {
  const progress = loadFirstSuccess(storage)
  progress[scenarioId] = true
  storage?.setItem(FIRST_SUCCESS_KEY, JSON.stringify(progress))
}

export function createScenarioRuntime(
  scenarioId: ScenarioId,
  options: { seed?: number; firstSuccess?: boolean } = {},
): ScenarioRuntime {
  const seed = options.seed ?? Math.floor(Math.random() * 0x7fffffff)
  const randomSide: 'left' | 'right' = seed % 2 === 0 ? 'left' : 'right'
  const startSide = options.firstSuccess ? randomSide : 'left'
  let variant: ScenarioRuntime['variant'] = options.firstSuccess ? randomSide : 'fixed'
  let parkedVehicles: ScenarioParkedVehicle[] = [LEFT_CAR, RIGHT_CAR]
  let walls: ScenarioWall[] = [...WALLS]
  let initialVehicle = mirroredStart(startSide)

  if (scenarioId === 'one-side') {
    const occupiedSide = randomSide
    variant = occupiedSide
    parkedVehicles = [occupiedSide === 'left' ? LEFT_CAR : RIGHT_CAR]
  }
  if (scenarioId === 'wall-side') {
    const wallSide = randomSide
    variant = wallSide
    parkedVehicles = [wallSide === 'left' ? RIGHT_CAR : LEFT_CAR]
    walls = [...walls, {
      id: `practice-wall-${wallSide}`,
      kind: 'wall',
      x: wallSide === 'left' ? 10.45 : 18.95,
      y: 6.5,
      width: 0.28,
      height: 6.95,
    }]
  }
  if (scenarioId === 'tight-entry') {
    variant = randomSide
    parkedVehicles = [LEFT_CAR, RIGHT_CAR]
    initialVehicle = {
      ...mirroredStart('left'),
      x: randomSide === 'left' ? 14 : 16,
      y: 5,
      heading: randomSide === 'left' ? -0.9 : -2.24,
      steeringAngle: randomSide === 'left' ? 0.48 : -0.48,
      gear: 'R',
    }
  }

  return { scenarioId, seed, variant, startSide, initialVehicle, parkedVehicles, walls }
}

export function getScenario(id: string | null) {
  const migrated = id === 'left-side' || id === 'right-side' ? 'one-side' : id === 'pillar-side' ? 'wall-side' : id
  return scenarios.find((scenario) => scenario.id === migrated && scenario.available) ?? scenarios[0]
}
