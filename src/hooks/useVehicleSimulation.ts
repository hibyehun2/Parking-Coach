import { useCallback, useEffect, useRef, useState } from 'react'
import { createSimulationLoop } from '../engine/simulationLoop'
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

export function useVehicleSimulation() {
  const stateRef = useRef<VehicleState>({ ...INITIAL_VEHICLE_STATE })
  const inputRef = useRef<VehicleInput>({ ...INITIAL_INPUT })
  const [vehicle, setVehicle] = useState<VehicleState>(() => ({ ...INITIAL_VEHICLE_STATE }))
  const [braking, setBrakingState] = useState(INITIAL_INPUT.braking)

  useEffect(() => {
    const loop = createSimulationLoop({
      step(deltaTime) {
        stateRef.current = updateVehicle(stateRef.current, inputRef.current, deltaTime)
      },
      render() {
        setVehicle(stateRef.current)
      },
    })
    loop.start()
    return loop.stop
  }, [])

  const setSteeringDirection = useCallback((direction: -1 | 0 | 1) => {
    inputRef.current = { ...inputRef.current, steeringDirection: direction }
  }, [])

  const setBraking = useCallback((braking: boolean) => {
    inputRef.current = { ...inputRef.current, braking }
    setBrakingState(braking)
  }, [])

  const toggleBrake = useCallback(() => {
    const braking = !inputRef.current.braking
    inputRef.current = { ...inputRef.current, braking }
    setBrakingState(braking)
  }, [])

  const setGear = useCallback((gear: Gear) => {
    if (!inputRef.current.braking || Math.abs(stateRef.current.speed) >= 0.05) return
    stateRef.current = withGear(stateRef.current, gear)
    setVehicle(stateRef.current)
  }, [])

  const setSteeringAngle = useCallback((steeringAngle: number) => {
    stateRef.current = withSteeringAngle(stateRef.current, steeringAngle)
    setVehicle(stateRef.current)
  }, [])

  const centerSteering = useCallback(() => {
    stateRef.current = withCenteredSteering(stateRef.current)
    setVehicle(stateRef.current)
  }, [])

  const reset = useCallback(() => {
    stateRef.current = { ...INITIAL_VEHICLE_STATE }
    inputRef.current = { ...INITIAL_INPUT }
    setBrakingState(INITIAL_INPUT.braking)
    setVehicle(stateRef.current)
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
    canShift: braking && Math.abs(vehicle.speed) < 0.05,
    setSteeringDirection,
    setSteeringAngle,
    setBraking,
    toggleBrake,
    setGear,
    centerSteering,
    reset,
  }
}
