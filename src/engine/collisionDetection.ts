import type { VehicleState } from './vehiclePhysics'
import type { ScenarioRuntime } from '../types/practice'

export type Point = { x: number; y: number }

export type ObstacleKind = 'vehicle' | 'pillar' | 'wall'

export type OrientedBox = {
  center: Point
  halfLength: number
  halfWidth: number
  heading: number
}

export type Collision = {
  obstacleId: string
  kind: ObstacleKind
  position: Point
  contactZone?: 'front-left' | 'front-right' | 'rear-left' | 'rear-right'
}

export const VEHICLE_DIMENSIONS = { length: 4.6, width: 1.8 } as const

export const PARKED_VEHICLES = [
  { id: 'parked-left', kind: 'vehicle' as const, x: 12.3, y: 9.75, heading: -Math.PI / 2, side: 'left' as const },
  { id: 'parked-right', kind: 'vehicle' as const, x: 17.7, y: 9.75, heading: -Math.PI / 2, side: 'right' as const },
] as const

export const PILLARS: readonly {
  id: string
  kind: 'pillar'
  x: number
  y: number
  width: number
  height: number
}[] = []

export const WALLS = [
  { id: 'wall-top', kind: 'wall' as const, x: 0.55, y: 0.5, width: 28.9, height: 0.35 },
  { id: 'wall-left', kind: 'wall' as const, x: 0.55, y: 0.5, width: 0.35, height: 12.95 },
  { id: 'wall-right', kind: 'wall' as const, x: 29.1, y: 0.5, width: 0.35, height: 12.95 },
  { id: 'wall-bottom', kind: 'wall' as const, x: 0.55, y: 13.45, width: 28.9, height: 0.35 },
] as const

function axes(box: OrientedBox): [Point, Point] {
  const cosine = Math.cos(box.heading)
  const sine = Math.sin(box.heading)
  return [
    { x: cosine, y: sine },
    { x: -sine, y: cosine },
  ]
}

function projectionRadius(box: OrientedBox, axis: Point) {
  const [forward, side] = axes(box)
  return box.halfLength * Math.abs(forward.x * axis.x + forward.y * axis.y)
    + box.halfWidth * Math.abs(side.x * axis.x + side.y * axis.y)
}

export function boxesIntersect(first: OrientedBox, second: OrientedBox) {
  const centerDelta = {
    x: second.center.x - first.center.x,
    y: second.center.y - first.center.y,
  }

  for (const axis of [...axes(first), ...axes(second)]) {
    const distance = Math.abs(centerDelta.x * axis.x + centerDelta.y * axis.y)
    if (distance > projectionRadius(first, axis) + projectionRadius(second, axis)) return false
  }
  return true
}

export function vehicleBox(vehicle: VehicleState, clearance = 0): OrientedBox {
  return {
    center: { x: vehicle.x, y: vehicle.y },
    halfLength: VEHICLE_DIMENSIONS.length / 2 + clearance,
    halfWidth: VEHICLE_DIMENSIONS.width / 2 + clearance,
    heading: vehicle.heading,
  }
}

type CollisionEnvironment = Pick<ScenarioRuntime, 'parkedVehicles' | 'walls'>

const DEFAULT_ENVIRONMENT: CollisionEnvironment = { parkedVehicles: [...PARKED_VEHICLES], walls: [...WALLS] }

function staticObstacles(environment: CollisionEnvironment = DEFAULT_ENVIRONMENT) {
  const vehicles = environment.parkedVehicles.map((obstacle) => ({
    id: obstacle.id,
    kind: obstacle.kind,
    box: {
      center: { x: obstacle.x, y: obstacle.y },
      halfLength: VEHICLE_DIMENSIONS.length / 2,
      halfWidth: VEHICLE_DIMENSIONS.width / 2,
      heading: obstacle.heading,
    },
  }))
  const structures = [...PILLARS, ...environment.walls].map((obstacle) => ({
    id: obstacle.id,
    kind: obstacle.kind,
    box: {
      center: { x: obstacle.x + obstacle.width / 2, y: obstacle.y + obstacle.height / 2 },
      halfLength: obstacle.width / 2,
      halfWidth: obstacle.height / 2,
      heading: 0,
    },
  }))
  return [...vehicles, ...structures]
}

export function detectCollision(vehicle: VehicleState, clearance = 0, environment?: CollisionEnvironment): Collision | null {
  const userBox = vehicleBox(vehicle, clearance)
  for (const obstacle of staticObstacles(environment)) {
    if (boxesIntersect(userBox, obstacle.box)) {
      const deltaX = obstacle.box.center.x - vehicle.x
      const deltaY = obstacle.box.center.y - vehicle.y
      const forward = deltaX * Math.cos(vehicle.heading) + deltaY * Math.sin(vehicle.heading)
      const lateral = -deltaX * Math.sin(vehicle.heading) + deltaY * Math.cos(vehicle.heading)
      return {
        obstacleId: obstacle.id,
        kind: obstacle.kind,
        position: { x: vehicle.x, y: vehicle.y },
        contactZone: `${forward >= 0 ? 'front' : 'rear'}-${lateral >= 0 ? 'right' : 'left'}`,
      }
    }
  }
  return null
}

function interpolateVehicle(start: VehicleState, end: VehicleState, progress: number): VehicleState {
  return {
    ...end,
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
    heading: start.heading + (end.heading - start.heading) * progress,
  }
}

export function resolveVehicleCollision(previous: VehicleState, next: VehicleState, environment?: CollisionEnvironment) {
  const distance = Math.hypot(next.x - previous.x, next.y - previous.y)
  const cornerTravel = Math.abs(next.heading - previous.heading) * Math.hypot(
    VEHICLE_DIMENSIONS.length / 2,
    VEHICLE_DIMENSIONS.width / 2,
  )
  const steps = Math.max(1, Math.ceil(Math.max(distance, cornerTravel) / 0.06))
  let lastSafe = previous

  for (let step = 1; step <= steps; step += 1) {
    const candidate = interpolateVehicle(previous, next, step / steps)
    const collision = detectCollision(candidate, 0, environment)
    if (collision) {
      return {
        vehicle: { ...lastSafe, speed: 0, braking: true },
        collision,
      }
    }
    lastSafe = candidate
  }

  return { vehicle: next, collision: null }
}
