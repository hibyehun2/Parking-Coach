import { VEHICLE_DIMENSIONS } from './collisionDetection.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'
import type { VehicleState, VehicleSpeedProfile } from './vehiclePhysics.ts'
import type { ScenarioRuntime } from '../types/practice.ts'

const PRECISION_ZOOM = 1.24
const ZOOM_TRANSITION_DISTANCE = 1.8

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value: number) {
  const progress = clamp01(value)
  return progress * progress * (3 - 2 * progress)
}

export function directPracticePrecisionProgress(vehicle: VehicleState, runtime: ScenarioRuntime) {
  const halfLength = VEHICLE_DIMENSIONS.length / 2
  const passedEntrance = runtime.startSide === 'right'
    ? TARGET_PARKING_BAY.right - (vehicle.x - halfLength)
    : vehicle.x + halfLength - TARGET_PARKING_BAY.left
  return smoothstep(passedEntrance / ZOOM_TRANSITION_DISTANCE)
}

export function directPracticeCamera(vehicle: VehicleState, runtime: ScenarioRuntime) {
  const progress = directPracticePrecisionProgress(vehicle, runtime)
  return {
    x: TARGET_PARKING_BAY.center.x,
    y: 7 + progress * 0.45,
    zoom: 1 + (PRECISION_ZOOM - 1) * progress,
  }
}

export function directPracticeSpeedProfile(runtime: ScenarioRuntime): VehicleSpeedProfile {
  return {
    approachSpeed: 0.34,
    alignmentSpeed: 0.24,
    startSide: runtime.startSide,
  }
}
