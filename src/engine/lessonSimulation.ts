import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'
import {
  DEFAULT_VEHICLE_CONFIG,
  INITIAL_VEHICLE_STATE,
  updateVehicle,
  type VehicleState,
} from './vehiclePhysics.ts'
import type { ScenarioRuntime } from '../types/practice.ts'

export type LessonSimulationStage = {
  states: VehicleState[]
  path: { x: number; y: number }[]
}

const TIME_STEP = 0.05
const DRIVER_SHOULDER_FROM_CENTER = 0.8
const ENTRY_ANGLE = 25 * Math.PI / 180
const FINAL_CENTER_Y = 10.42

function stopped(state: VehicleState, changes: Partial<VehicleState> = {}): VehicleState {
  return { ...state, ...changes, speed: 0, braking: true }
}

function simulateUntil(
  start: VehicleState,
  input: { steeringDirection: -1 | 0 | 1 },
  reached: (state: VehicleState) => boolean,
  maximumSteps = 900,
) {
  const states = [{ ...start }]
  let state = { ...start, speed: 0, braking: false }
  for (let index = 0; index < maximumSteps; index += 1) {
    state = updateVehicle(state, { ...input, braking: false }, TIME_STEP)
    states.push({ ...state })
    if (reached(state)) break
  }
  states[states.length - 1] = stopped(states[states.length - 1])
  return states
}

function mirrorState(state: VehicleState): VehicleState {
  return {
    ...state,
    x: 30 - state.x,
    heading: Math.PI - state.heading,
    steeringAngle: -state.steeringAngle,
  }
}

function toStage(states: VehicleState[]): LessonSimulationStage {
  return { states, path: states.map(({ x, y }) => ({ x, y })) }
}

export function buildLessonSimulation(runtime: ScenarioRuntime): LessonSimulationStage[] {
  const entryCenterX = TARGET_PARKING_BAY.right - DRIVER_SHOULDER_FROM_CENTER
  const initial = stopped({ ...INITIAL_VEHICLE_STATE, x: 5.5, y: 4, heading: 0, gear: 'D' })

  const approach = simulateUntil(initial, { steeringDirection: 0 }, (state) => state.x >= entryCenterX)
  approach[approach.length - 1] = stopped({
    ...approach[approach.length - 1],
    x: entryCenterX,
    steeringAngle: 0,
  })

  const angle = simulateUntil(
    approach[approach.length - 1],
    { steeringDirection: -1 },
    (state) => state.heading <= -ENTRY_ANGLE,
  )
  const angleStop = stopped(angle[angle.length - 1])

  const prepareReverse = [
    stopped(angleStop, {
      gear: 'R',
      steeringAngle: DEFAULT_VEHICLE_CONFIG.maxSteeringAngle,
    }),
  ]

  const curvedReverse = simulateUntil(
    prepareReverse[0],
    { steeringDirection: 0 },
    (state) => state.heading <= TARGET_PARKING_BAY.heading,
  )
  curvedReverse[curvedReverse.length - 1] = stopped({
    ...curvedReverse[curvedReverse.length - 1],
    heading: TARGET_PARKING_BAY.heading,
  })

  const straightStart = stopped(curvedReverse[curvedReverse.length - 1], { steeringAngle: 0, gear: 'R' })
  const straightReverse = simulateUntil(
    straightStart,
    { steeringDirection: 0 },
    (state) => state.y >= FINAL_CENTER_Y,
  )

  const stages = [
    toStage(approach),
    toStage(angle),
    toStage(prepareReverse),
    toStage(curvedReverse),
    toStage(straightReverse),
  ]

  if (runtime.startSide !== 'right') return stages
  return stages.map((stage) => toStage(stage.states.map(mirrorState)))
}

export function lessonDriverShoulder(state: VehicleState) {
  return {
    x: state.x + Math.cos(state.heading) * DRIVER_SHOULDER_FROM_CENTER,
    y: state.y + Math.sin(state.heading) * DRIVER_SHOULDER_FROM_CENTER,
  }
}
