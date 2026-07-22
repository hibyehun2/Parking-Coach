import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { GearSelector } from '../controls/GearSelector'
import { SteeringWheel } from '../controls/SteeringWheel'
import { useVehicleSimulation } from '../../hooks/useVehicleSimulation'
import { LearningHintPanel } from './LearningHintPanel'
import { ParkingLotCanvas } from './ParkingLotCanvas'
import { CornerAssistance } from './CornerAssistance'
import { detectCollision } from '../../engine/collisionDetection'
import { evaluateParking } from '../../engine/parkingEvaluation'
import { recordPracticeSession } from '../../engine/practiceHistory'
import { cloneVehicleState, type ReplayEvent } from '../../engine/sessionReplay'
import { INITIAL_VEHICLE_STATE, type Gear, type VehicleState } from '../../engine/vehiclePhysics'
import type { PracticeMode, ScenarioId } from '../../types/practice'

type VehicleSimulatorProps = {
  learningMode: boolean
  scenarioId: ScenarioId
  mode: PracticeMode
  initialVehicle?: VehicleState
}

export function VehicleSimulator({ learningMode, scenarioId, mode, initialVehicle }: VehicleSimulatorProps) {
  const navigate = useNavigate()
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const fullscreenAttemptedRef = useRef(false)
  const sessionStartedAtRef = useRef(0)
  const replayRef = useRef<ReplayEvent[]>([{
    id: 'start',
    elapsedSeconds: 0,
    type: 'start',
    label: initialVehicle ? '실수 지점에서 새 세션 시작' : '연습 시작',
    vehicle: cloneVehicleState(initialVehicle ?? INITIAL_VEHICLE_STATE),
  }])
  const recordedCollisionCountRef = useRef(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [parkedResult, setParkedResult] = useState<ReturnType<typeof evaluateParking> | null>(null)
  const canUseFullscreen = !isIos && document.fullscreenEnabled
  const {
    vehicle,
    braking,
    collisions,
    canShift,
    setSteeringAngle,
    setBraking,
    setGear,
    centerSteering,
    setControlsLocked,
    reset,
  } = useVehicleSimulation(initialVehicle)
  const danger = learningMode ? detectCollision(vehicle, 0.42) : null
  const parkingEvaluation = evaluateParking(vehicle, collisions)

  useEffect(() => {
    sessionStartedAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    const collision = collisions.at(-1)
    if (!collision || collisions.length <= recordedCollisionCountRef.current) return
    recordedCollisionCountRef.current = collisions.length
    replayRef.current.push({
      id: `collision-${collisions.length}`,
      elapsedSeconds: (Date.now() - sessionStartedAtRef.current) / 1000,
      type: 'collision',
      label: `${collision.kind === 'vehicle' ? '주차 차량' : collision.kind === 'pillar' ? '기둥' : '벽'} 충돌`,
      vehicle: cloneVehicleState(vehicle),
      collision,
    })
  }, [collisions, vehicle])

  useEffect(() => {
    document.documentElement.classList.add('simulator-active')
    document.body.classList.add('simulator-active')

    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null
    }
    const syncFullscreenState = () => {
      const fullscreen = Boolean(document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement)
      setIsFullscreen(fullscreen)
      if (!fullscreen) fullscreenAttemptedRef.current = false
    }
    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)
    syncFullscreenState()

    return () => {
      document.documentElement.classList.remove('simulator-active')
      document.body.classList.remove('simulator-active')
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
    }
  }, [])

  const requestImmersiveMode = () => {
    if (!canUseFullscreen) return
    const page = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
    }
    const requestFullscreen = page.requestFullscreen ?? page.webkitRequestFullscreen
    if (!requestFullscreen || document.fullscreenElement) return

    fullscreenAttemptedRef.current = true
    void Promise.resolve(requestFullscreen.call(page)).catch(() => {
      fullscreenAttemptedRef.current = false
    })
  }

  const enterImmersiveMode = (event: PointerEvent<HTMLDivElement>) => {
    if (!canUseFullscreen || event.pointerType !== 'touch' || fullscreenAttemptedRef.current || isFullscreen) return
    requestImmersiveMode()
  }

  const resetSimulation = () => {
    setParkedResult(null)
    reset()
    sessionStartedAtRef.current = Date.now()
    recordedCollisionCountRef.current = 0
    replayRef.current = [{
      id: 'start',
      elapsedSeconds: 0,
      type: 'start',
      label: '처음 위치에서 새 세션 시작',
      vehicle: cloneVehicleState(INITIAL_VEHICLE_STATE),
    }]
  }

  const finishSession = (result: ReturnType<typeof evaluateParking>) => {
    if (parkedResult) return
    setControlsLocked(true)
    setParkedResult(result)
    replayRef.current.push({
      id: 'finish',
      elapsedSeconds: (Date.now() - sessionStartedAtRef.current) / 1000,
      type: 'finish',
      label: result.success ? '주차 완료' : '미완료 상태로 연습 종료',
      vehicle: cloneVehicleState(vehicle),
    })
    recordPracticeSession(result, scenarioId, mode)
  }

  const completeParking = () => {
    if (!parkingEvaluation.success) return
    finishSession(parkingEvaluation)
  }

  const finishIncompletePractice = () => {
    finishSession(parkingEvaluation)
  }

  const changeGear = (gear: Gear) => {
    setGear(gear)
    replayRef.current.push({
      id: `gear-${replayRef.current.length}`,
      elapsedSeconds: (Date.now() - sessionStartedAtRef.current) / 1000,
      type: 'gear',
      label: `${gear} 기어 선택`,
      vehicle: cloneVehicleState({ ...vehicle, gear }),
    })
  }

  const showParkingResult = () => {
    if (!parkedResult) return
    navigate('/result', { state: { result: parkedResult, scenarioId, mode, replay: replayRef.current } })
  }

  return (
    <div className="vehicle-simulator" onPointerUp={enterImmersiveMode}>
      <ParkingLotCanvas vehicle={vehicle} danger={danger} collisions={collisions}>
        <CornerAssistance vehicle={vehicle} />
        {learningMode && <LearningHintPanel vehicle={vehicle} scenarioId={scenarioId} />}
        <div className="driving-console separate-console" aria-label="차량 운전 조작부">
          <SteeringWheel
            steeringAngle={vehicle.steeringAngle}
            onChange={parkedResult ? () => undefined : setSteeringAngle}
            onCenter={parkedResult ? () => undefined : centerSteering}
            disabled={Boolean(parkedResult)}
          />

          <GearSelector
            gear={vehicle.gear}
            braking={braking}
            canShift={canShift}
            parkingReady={parkingEvaluation.success}
            parkingCompleted={Boolean(parkedResult)}
            onChange={parkedResult ? () => undefined : changeGear}
            onBrakeChange={parkedResult ? () => undefined : setBraking}
            onPark={completeParking}
            onShowResult={showParkingResult}
          />
        </div>
      </ParkingLotCanvas>
      <button type="button" className="reset-control top-reset-control" onClick={resetSimulation}>처음 위치</button>
      {!parkedResult && (
        <button type="button" className="finish-practice-control" onClick={finishIncompletePractice}>연습 종료</button>
      )}
      {canUseFullscreen && !isFullscreen && (
        <button
          type="button"
          className="immersive-control"
          onPointerUp={(event) => event.stopPropagation()}
          onClick={requestImmersiveMode}
        >
          ⛶ 전체화면
        </button>
      )}
      <p className="driving-help">
        핸들을 손가락으로 원을 그리듯 돌리세요. 브레이크를 작동한 뒤 기어를 선택하고, 브레이크를 해제하면 천천히 움직입니다.
      </p>
      <p className="keyboard-help">키보드: ←/A · →/D 조향, Space/S 브레이크, F 전진, R 후진, C 중앙 · 1/2/3 미러·카메라</p>
    </div>
  )
}
