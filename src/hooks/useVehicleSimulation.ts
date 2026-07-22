import { useCallback, useEffect, useRef, useState } from 'react'
import { createSimulationLoop } from '../engine/simulationLoop'
import { resolveVehicleCollision, type Collision } from '../engine/collisionDetection'
import {
  INITIAL_VEHICLE_STATE,
  updateVehicle,
  withCenteredSteering,
  withGear,
  withSteeringAngle,
  type Gear,
  type VehicleInput,
  type VehicleState,
} from '../engine/vehiclePhysics'

const INITIAL_INPUT: VehicleInput = {
  steeringDirection: 0,
  braking: true,
}

export function useVehicleSimulation(initialVehicle: VehicleState = INITIAL_VEHICLE_STATE) {
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
        const next = updateVehicle(previous, inputRef.current, deltaTime)
        const resolved = resolveVehicleCollision(previous, next)
        stateRef.current = resolved.vehicle
        if (resolved.collision) {
          inputRef.current = { ...inputRef.current, braking: true }
          setBrakingState(true)
          setCollisions((current) => [...current, resolved.collision!])
        }
      },
      render() {
        setVehicle(stateRef.current)
      },
    })
    loop.start()
    return loop.stop
  }, [])

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
    stateRef.current = { ...INITIAL_VEHICLE_STATE }
    inputRef.current = { ...INITIAL_INPUT }
    setBrakingState(INITIAL_INPUT.braking)
    setCollisions([])
    setVehicle(stateRef.current)
  }, [])

  const setControlsLocked = useCallback((locked: boolean) => {
    controlsLockedRef.current = locked
    if (!locked) return
    inputRef.current = { ...inputRef.current, braking: true, steeringDirection: 0 }
    setBrakingState(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && ['KeyR', 'KeyF', 'KeyC'].includes(event.code)) return
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault()

      if (event.code === 'ArrowLeft' || event.code === 'KeyA') setSteeringDirection(-1)
      if (event.code === 'ArrowRight' || event.code === 'KeyD') setSteeringDirection(1)
      if (event.code === 'Space' || event.code === 'KeyS') setBraking(true)
      if (event.code === 'KeyR') setGear('R')
      if (event.code === 'KeyF') setGear('D')
      if (event.code === 'KeyC') centerSteering()
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') setSteeringDirection(0)
      if (event.code === 'ArrowRight' || event.code === 'KeyD') setSteeringDirection(0)
      if (event.code === 'Space' || event.code === 'KeyS') setBraking(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [centerSteering, setBraking, setGear, setSteeringDirection])

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
