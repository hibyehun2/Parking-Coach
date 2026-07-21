import { VEHICLE_DIMENSIONS, type Collision, type Point } from './collisionDetection.ts'
import type { VehicleState } from './vehiclePhysics'

export const TARGET_PARKING_BAY = {
  left: 7.82,
  right: 10.18,
  top: 5.72,
  bottom: 11.2,
  center: { x: 9, y: 8.46 },
  heading: Math.PI / 2,
} as const

export type ParkingResult = {
  success: boolean
  fullyInside: boolean
  stopped: boolean
  centerError: number
  angleErrorDegrees: number
  collisionCount: number
  collisions: Collision[]
}

export function vehicleCorners(vehicle: VehicleState): Point[] {
  const cosine = Math.cos(vehicle.heading)
  const sine = Math.sin(vehicle.heading)
  const forward = { x: cosine, y: sine }
  const side = { x: -sine, y: cosine }
  const halfLength = VEHICLE_DIMENSIONS.length / 2
  const halfWidth = VEHICLE_DIMENSIONS.width / 2

  return [
    [halfLength, halfWidth],
    [halfLength, -halfWidth],
    [-halfLength, halfWidth],
    [-halfLength, -halfWidth],
  ].map(([length, width]) => ({
    x: vehicle.x + forward.x * length + side.x * width,
    y: vehicle.y + forward.y * length + side.y * width,
  }))
}

export function isVehicleInsideParkingBay(vehicle: VehicleState) {
  const epsilon = 1e-9
  return vehicleCorners(vehicle).every((corner) => (
    corner.x >= TARGET_PARKING_BAY.left - epsilon
    && corner.x <= TARGET_PARKING_BAY.right + epsilon
    && corner.y >= TARGET_PARKING_BAY.top - epsilon
    && corner.y <= TARGET_PARKING_BAY.bottom + epsilon
  ))
}

function axisAngleError(heading: number) {
  const difference = heading - TARGET_PARKING_BAY.heading
  const wrapped = ((difference + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2
  return Math.abs(wrapped)
}

export function evaluateParking(vehicle: VehicleState, collisions: Collision[]): ParkingResult {
  const fullyInside = isVehicleInsideParkingBay(vehicle)
  const stopped = vehicle.braking && Math.abs(vehicle.speed) < 0.05
  return {
    success: fullyInside && stopped,
    fullyInside,
    stopped,
    centerError: Math.hypot(
      vehicle.x - TARGET_PARKING_BAY.center.x,
      vehicle.y - TARGET_PARKING_BAY.center.y,
    ),
    angleErrorDegrees: axisAngleError(vehicle.heading) * 180 / Math.PI,
    collisionCount: collisions.length,
    collisions,
  }
}
