import { WALLS } from '../engine/collisionDetection.ts'
import { INITIAL_VEHICLE_STATE, type VehicleState } from '../engine/vehiclePhysics.ts'
import type { Scenario, ScenarioId, ScenarioParkedVehicle, ScenarioRuntime, ScenarioWall } from '../types/practice.ts'

export const FIRST_SUCCESS_KEY = 'parking-coach:first-success:v1'

export const scenarios: Scenario[] = [
  { id: 'both-sides', title: '양옆 차량', description: '양쪽 차량 사이의 간격을 번갈아 확인해요.', difficulty: '첫 번째 연습', visual: 'cars-both', available: true },
  { id: 'narrow-aisle', title: '좁은 통로 주차', description: '앞쪽 공간이 부족한 주차 상황을 더 안정적으로 연습할 수 있도록 보완하고 있어요.', difficulty: '준비 중', visual: 'narrow-aisle', available: false },
]

const LEGACY_SCENARIOS: Scenario[] = [
  { id: 'one-side', title: '한쪽 차량', description: '이전 연습 기록입니다.', difficulty: '이전 연습', visual: 'car-left', available: false },
  { id: 'wall-side', title: '벽면 옆', description: '이전 연습 기록입니다.', difficulty: '이전 연습', visual: 'wall-side', available: false },
  { id: 'tight-entry', title: '좁은 진입 수정', description: '이전 연습 기록입니다.', difficulty: '이전 연습', visual: 'tight-entry', available: false },
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
  if (scenarioId === 'narrow-aisle') {
    variant = 'fixed'
    parkedVehicles = [LEFT_CAR, RIGHT_CAR]
    walls = [...walls, {
      id: 'narrow-opposite-wall',
      kind: 'wall',
      x: 10.4,
      y: 1.5,
      width: 9.2,
      height: 0.3,
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
  return scenarios.find((scenario) => scenario.id === migrated)
    ?? LEGACY_SCENARIOS.find((scenario) => scenario.id === migrated)
    ?? scenarios[0]
}

export function isScenarioAvailable(id: ScenarioId) {
  return scenarios.some((scenario) => scenario.id === id && scenario.available)
}
