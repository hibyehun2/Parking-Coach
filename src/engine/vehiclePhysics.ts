import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'

export type Gear = 'D' | 'R'

export type VehicleState = {
  x: number
  y: number
  heading: number
  steeringAngle: number
  speed: number
  gear: Gear
  braking: boolean
}

export type VehicleInput = {
  steeringDirection: -1 | 0 | 1
  braking: boolean
}

export type VehicleConfig = {
  wheelbase: number
  maxSteeringAngle: number
  steeringSpeed: number
  creepSpeed: number
}

export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  wheelbase: 2.7,
  maxSteeringAngle: degreesToRadians(35),
  steeringSpeed: degreesToRadians(65),
  creepSpeed: 0.6,
}

export const PARKING_APPROACH_SPEED = 0.4
export const PARKING_ALIGNMENT_SPEED = 0.28

export function parkingCreepSpeed(state: VehicleState, config: VehicleConfig = DEFAULT_VEHICLE_CONFIG) {
  const inApproachLane = state.x >= TARGET_PARKING_BAY.left - 2.5
    && state.x <= TARGET_PARKING_BAY.right + 2.5
    && state.y >= 1
    && state.y <= TARGET_PARKING_BAY.bottom + 0.3
  if (!inApproachLane) return config.creepSpeed

  const aligning = state.x >= TARGET_PARKING_BAY.left - 0.9
    && state.x <= TARGET_PARKING_BAY.right + 0.9
    && state.y >= TARGET_PARKING_BAY.top - 0.4
  return aligning ? PARKING_ALIGNMENT_SPEED : PARKING_APPROACH_SPEED
}

function moveTowards(current: number, target: number, maximumChange: number) {
  if (Math.abs(target - current) <= maximumChange) return target
  return current + Math.sign(target - current) * maximumChange
}

export const INITIAL_VEHICLE_STATE: VehicleState = {
  x: 5.5,
  y: 4,
  heading: 0,
  steeringAngle: 0,
  speed: 0,
  gear: 'D',
  braking: true,
}

export function degreesToRadians(degrees: number) {
  return degrees * Math.PI / 180
}

export function radiansToDegrees(radians: number) {
  return radians * 180 / Math.PI
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function updateVehicle(
  state: VehicleState,
  input: VehicleInput,
  deltaTime: number,
  config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
): VehicleState {
  if (deltaTime <= 0) return state

  const steeringAngle = clamp(
    state.steeringAngle + input.steeringDirection * config.steeringSpeed * deltaTime,
    -config.maxSteeringAngle,
    config.maxSteeringAngle,
  )
  const direction = state.gear === 'D' ? 1 : -1
  const targetSpeed = parkingCreepSpeed(state, config) * direction
  const speed = input.braking
    ? 0
    : moveTowards(state.speed, targetSpeed, 1.2 * deltaTime)

  if (speed === 0) {
    return { ...state, steeringAngle, speed, braking: true }
  }

  const distance = (state.speed + speed) / 2 * deltaTime
  const headingDelta = distance / config.wheelbase * Math.tan(steeringAngle)
  const middleHeading = state.heading + headingDelta / 2

  return {
    ...state,
    x: state.x + Math.cos(middleHeading) * distance,
    y: state.y + Math.sin(middleHeading) * distance,
    heading: state.heading + headingDelta,
    steeringAngle,
    speed,
    braking: false,
  }
}

export function withGear(state: VehicleState, gear: Gear): VehicleState {
  return { ...state, gear }
}

export function withCenteredSteering(state: VehicleState): VehicleState {
  return { ...state, steeringAngle: 0 }
}

export function withSteeringAngle(
  state: VehicleState,
  steeringAngle: number,
  config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
): VehicleState {
  return {
    ...state,
    steeringAngle: clamp(
      steeringAngle,
      -config.maxSteeringAngle,
      config.maxSteeringAngle,
    ),
  }
}
