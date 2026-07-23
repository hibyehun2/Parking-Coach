import { DEFAULT_VEHICLE_CONFIG, type VehicleState } from './vehiclePhysics.ts'

export const WHEEL_STOP = {
  segments: [
    { left: 14.02, right: 14.62 },
    { left: 15.38, right: 15.98 },
  ],
  y: 11.85,
} as const

function rearAxle(vehicle: Pick<VehicleState, 'x' | 'y' | 'heading'>) {
  return {
    x: vehicle.x - Math.cos(vehicle.heading) * DEFAULT_VEHICLE_CONFIG.wheelbase / 2,
    y: vehicle.y - Math.sin(vehicle.heading) * DEFAULT_VEHICLE_CONFIG.wheelbase / 2,
  }
}

export function isRearWheelAtStop(vehicle: Pick<VehicleState, 'x' | 'y' | 'heading'>) {
  const axle = rearAxle(vehicle)
  return axle.x >= WHEEL_STOP.segments[0].left - 0.2
    && axle.x <= WHEEL_STOP.segments[1].right + 0.2
    && Math.abs(axle.y - WHEEL_STOP.y) <= 0.16
}

export function resolveWheelStop(previous: VehicleState, next: VehicleState) {
  if (next.gear !== 'R') return { vehicle: next, contacted: false }
  const previousAxle = rearAxle(previous)
  const nextAxle = rearAxle(next)
  const insideWidth = nextAxle.x >= WHEEL_STOP.segments[0].left - 0.2
    && nextAxle.x <= WHEEL_STOP.segments[1].right + 0.2
  const movingTowardStop = nextAxle.y > previousAxle.y
  const crossed = previousAxle.y <= WHEEL_STOP.y && nextAxle.y >= WHEEL_STOP.y
  if (!insideWidth || !movingTowardStop || !crossed) return { vehicle: next, contacted: false }

  const delta = nextAxle.y - previousAxle.y
  const progress = delta <= 0 ? 0 : (WHEEL_STOP.y - previousAxle.y) / delta
  const heading = previous.heading + (next.heading - previous.heading) * progress
  return {
    contacted: true,
    vehicle: {
      ...next,
      x: previous.x + (next.x - previous.x) * progress,
      y: previous.y + (next.y - previous.y) * progress,
      heading,
      speed: 0,
      braking: true,
    },
  }
}
