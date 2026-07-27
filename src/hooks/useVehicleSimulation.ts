import { useCallback, useEffect, useRef, useState } from 'react'
import { createSimulationLoop } from '../engine/simulationLoop'
import { resolveVehicleCollision, type Collision } from '../engine/collisionDetection'
import type { ScenarioRuntime } from '../types/practice'
import { resolveWheelStop } from '../engine/wheelStop'
import {
  INITIAL_VEHICLE_STATE,
  updateVehicle,
  withCenteredSteering,
  withGear,
  withSteeringAngle,
  type Gear,
  type VehicleInput,
  type VehicleSpeedProfile,
  type VehicleState,
} from '../engine/vehiclePhysics'

const INITIAL_INPUT: VehicleInput = {
  steeringDirection: 0,
  braking: true,
}

export function useVehicleSimulation(
  initialVehicle: VehicleState = INITIAL_VEHICLE_STATE,
  runtime?: ScenarioRuntime,
  speedProfile?: VehicleSpeedProfile,
) {
  const startingVehicle = { ...initialVehicle, speed: 0, braking: true }
  const stateRef = useRef<VehicleState>(startingVehicle)
  const inputRef = useRef<VehicleInput>({ ...INITIAL_INPUT })
  const controlsLockedRef = useRef(false)
  const [vehicle, setVehicle] = useState<VehicleState>(startingVehicle)
  const [braking, setBrakingState] = useState(INITIAL_INPUT.braking)
  const [collisions, setCollisions] = useState<Collision[]>([])

  useEffect(() => {
    const loop = createSimulationLoop({
      step(deltaTime) {
        const previous = stateRef.current
        const next = updateVehicle(previous, inputRef.current, deltaTime, undefined, speedProfile)
        const resolved = resolveVehicleCollision(previous, next, runtime)
        const wheelStop = resolved.collision
          ? { vehicle: resolved.vehicle, contacted: false }
          : resolveWheelStop(previous, resolved.vehicle)
        stateRef.current = wheelStop.vehicle
        if (resolved.collision) {
          inputRef.current = { ...inputRef.current, braking: true }
          setBrakingState(true)
          setCollisions((current) => [...current, resolved.collision!])
        } else if (wheelStop.contacted) {
          inputRef.current = { ...inputRef.current, braking: true }
          setBrakingState(true)
        }
      },
      render() {
        setVehicle(stateRef.current)
      },
    })
    loop.start()
    return loop.stop
  }, [runtime, speedProfile])

  const setSteeringDirection = useCallback((direction: -1 | 0 | 1) => {
    if (controlsLockedRef.current) return
    inputRef.current = { ...inputRef.current, steeringDirection: direction }
  }, [])

  const setBraking = useCallback((braking: boolean) => {
    if (controlsLockedRef.current) return
    inputRef.current = { ...inputRef.current, braking }
    setBrakingState(braking)
  }, [])

  const toggleBrake = useCallback(() => {
    if (controlsLockedRef.current) return
    const braking = !inputRef.current.braking
    inputRef.current = { ...inputRef.current, braking }
    setBrakingState(braking)
  }, [])

  const setGear = useCallback((gear: Gear) => {
    if (controlsLockedRef.current) return
    if (!inputRef.current.braking || Math.abs(stateRef.current.speed) >= 0.05) return
    stateRef.current = withGear(stateRef.current, gear)
    setVehicle(stateRef.current)
  }, [])

  const setSteeringAngle = useCallback((steeringAngle: number) => {
    if (controlsLockedRef.current) return
    stateRef.current = withSteeringAngle(stateRef.current, steeringAngle)
    setVehicle(stateRef.current)
  }, [])

  const centerSteering = useCallback(() => {
    if (controlsLockedRef.current) return
    stateRef.current = withCenteredSteering(stateRef.current)
    setVehicle(stateRef.current)
  }, [])

  const reset = useCallback(() => {
    controlsLockedRef.current = false
    stateRef.current = { ...initialVehicle, speed: 0, braking: true }
    inputRef.current = { ...INITIAL_INPUT }
    setBrakingState(INITIAL_INPUT.braking)
    setCollisions([])
    setVehicle(stateRef.current)
  }, [initialVehicle])

  const setControlsLocked = useCallback((locked: boolean) => {
    controlsLockedRef.current = locked
    if (!locked) return
    inputRef.current = { ...inputRef.current, braking: true, steeringDirection: 0 }
    setBrakingState(true)
  }, [])

  useEffect(() => {
    const hasInteractiveTarget = (event: KeyboardEvent) => {
      const target = event.target
      return target instanceof HTMLElement && (
        target.isContentEditable
        || target.matches('button, input, textarea, select, a[href]')
      )
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (hasInteractiveTarget(event)) return
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault()
      if (event.repeat && ['Space', 'KeyS', 'KeyR', 'KeyD', 'KeyF', 'KeyC'].includes(event.code)) return

      if (event.code === 'ArrowLeft') setSteeringDirection(-1)
      if (event.code === 'ArrowRight') setSteeringDirection(1)
      if (event.code === 'Space' || event.code === 'KeyS') toggleBrake()
      if (event.code === 'KeyR') setGear('R')
      if (event.code === 'KeyD' || event.code === 'KeyF') setGear('D')
      if (event.code === 'KeyC') centerSteering()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (hasInteractiveTarget(event)) return
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault()
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') setSteeringDirection(0)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [centerSteering, setGear, setSteeringDirection, toggleBrake])

  return {
    vehicle,
    braking,
    collisions,
    collisionCount: collisions.length,
    canShift: braking && Math.abs(vehicle.speed) < 0.05,
    setSteeringDirection,
    setSteeringAngle,
    setBraking,
    toggleBrake,
    setGear,
    centerSteering,
    setControlsLocked,
    reset,
  }
}
