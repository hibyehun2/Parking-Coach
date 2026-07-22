import type { VehicleState } from '../engine/vehiclePhysics'

export type ScenarioId = 'both-sides' | 'one-side' | 'wall-side' | 'tight-entry'

export type PracticeMode = 'learning' | 'practice'

export type Scenario = {
  id: ScenarioId
  title: string
  description: string
  difficulty: string
  visual: 'cars-both' | 'car-left' | 'wall-side' | 'tight-entry'
  available: boolean
}

export type ScenarioParkedVehicle = {
  id: string
  kind: 'vehicle'
  x: number
  y: number
  heading: number
  side: 'left' | 'right'
}

export type ScenarioWall = {
  id: string
  kind: 'wall'
  x: number
  y: number
  width: number
  height: number
}

export type ScenarioRuntime = {
  scenarioId: ScenarioId
  seed: number
  variant: 'fixed' | 'left' | 'right'
  startSide: 'left' | 'right'
  initialVehicle: VehicleState
  parkedVehicles: ScenarioParkedVehicle[]
  walls: ScenarioWall[]
}
