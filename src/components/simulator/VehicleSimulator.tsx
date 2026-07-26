import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { GearSelector } from '../controls/GearSelector'
import { SteeringWheel } from '../controls/SteeringWheel'
import { useVehicleSimulation } from '../../hooks/useVehicleSimulation'
import { LearningHintPanel } from './LearningHintPanel'
import { ParkingLotCanvas } from './ParkingLotCanvas'
import { CornerAssistance } from './CornerAssistance'
import { detectCollision } from '../../engine/collisionDetection'
import { evaluateParking } from '../../engine/parkingEvaluation'
import { isRearWheelAtStop } from '../../engine/parkingLotRenderer'
import { recordPracticeSessionDb } from '../../engine/practiceHistory'
import { directPracticeSpeedProfile } from '../../engine/directPracticeAssist'
import { cloneVehicleState, type ReplayEvent } from '../../engine/sessionReplay'
import { type Gear, type VehicleState } from '../../engine/vehiclePhysics'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../../types/practice'

type VehicleSimulatorProps = {
  learningMode: boolean
  scenarioId: ScenarioId
  mode: PracticeMode
  initialVehicle?: VehicleState
  onShowLesson: () => void
  runtime: ScenarioRuntime
}

export function VehicleSimulator({ learningMode, scenarioId, mode, initialVehicle, onShowLesson, runtime }: VehicleSimulatorProps) {
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
      vehicle: cloneVehicleState(initialVehicle ?? runtime.initialVehicle),
  }])
  const recordedCollisionCountRef = useRef(0)
  const safeSnapshotsRef = useRef<{ recordedAt: number; vehicle: VehicleState }[]>([])
  const sessionTrajectoryRef = useRef<{ recordedAt: number; vehicle: VehicleState }[]>([])
  const wheelStopContactRef = useRef(false)
  const wheelStopTimerRef = useRef<number | null>(null)
  const sessionSaveRef = useRef<Promise<boolean> | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [parkedResult, setParkedResult] = useState<ReturnType<typeof evaluateParking> | null>(null)
  const [wheelStopActive, setWheelStopActive] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const canUseFullscreen = !isIos && document.fullscreenEnabled
  const mobileDirectAssist = learningMode
    && window.matchMedia('(pointer: coarse), (hover: none)').matches
  const speedProfile = useMemo(
    () => mobileDirectAssist ? directPracticeSpeedProfile(runtime) : undefined,
    [mobileDirectAssist, runtime],
  )
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
  } = useVehicleSimulation(initialVehicle ?? runtime.initialVehicle, runtime, speedProfile)
  const danger = learningMode ? detectCollision(vehicle, 0.42, runtime) : null
  const parkingEvaluation = evaluateParking(vehicle, collisions)

  useEffect(() => {
    sessionStartedAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (detectCollision(vehicle, 0, runtime)) return
    const now = Date.now()
    const previous = safeSnapshotsRef.current.at(-1)
    if (previous && now - previous.recordedAt < 250) return
    safeSnapshotsRef.current = [...safeSnapshotsRef.current, { recordedAt: now, vehicle: cloneVehicleState(vehicle) }]
      .filter((snapshot) => now - snapshot.recordedAt <= 2500)
    const lastTrajectory = sessionTrajectoryRef.current.at(-1)
    if (!lastTrajectory || now - lastTrajectory.recordedAt >= 200) {
      sessionTrajectoryRef.current = [...sessionTrajectoryRef.current, { recordedAt: now, vehicle: cloneVehicleState(vehicle) }]
        .slice(-1500)
    }
  }, [runtime, vehicle])

  useEffect(() => {
    const touching = isRearWheelAtStop(vehicle)
    if (touching && !wheelStopContactRef.current) {
      setWheelStopActive(true)
      if ('vibrate' in navigator) navigator.vibrate(35)
      if (wheelStopTimerRef.current !== null) window.clearTimeout(wheelStopTimerRef.current)
      wheelStopTimerRef.current = window.setTimeout(() => setWheelStopActive(false), 480)
    }
    wheelStopContactRef.current = touching
  }, [vehicle])

  useEffect(() => () => {
    if (wheelStopTimerRef.current !== null) window.clearTimeout(wheelStopTimerRef.current)
  }, [])

  useEffect(() => {
    const collision = collisions.at(-1)
    if (!collision || collisions.length <= recordedCollisionCountRef.current) return
    recordedCollisionCountRef.current = collisions.length
    const retrySnapshot = safeSnapshotsRef.current
      .slice()
      .reverse()
      .find((snapshot) => Date.now() - snapshot.recordedAt >= 700)
    replayRef.current.push({
      id: `collision-${collisions.length}`,
      elapsedSeconds: (Date.now() - sessionStartedAtRef.current) / 1000,
      type: 'collision',
      label: `${collision.kind === 'vehicle' ? '주차 차량' : collision.kind === 'pillar' ? '기둥' : '벽'} 충돌`,
      vehicle: cloneVehicleState(retrySnapshot?.vehicle ?? vehicle),
      collision,
      impactVehicle: cloneVehicleState(vehicle),
      clip: [...safeSnapshotsRef.current.map(({ vehicle: snapshot }) => snapshot), cloneVehicleState(vehicle)],
      phase: vehicle.gear === 'R'
        ? (Math.abs(vehicle.steeringAngle) >= .12 ? 'turning-reverse' : 'straight-reverse')
        : 'approach',
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
    sessionSaveRef.current = null
    setParkedResult(null)
    setSaveError(false)
    setWheelStopActive(false)
    wheelStopContactRef.current = false
    reset()
    sessionStartedAtRef.current = Date.now()
    recordedCollisionCountRef.current = 0
    safeSnapshotsRef.current = []
    sessionTrajectoryRef.current = []
    replayRef.current = [{
      id: 'start',
      elapsedSeconds: 0,
      type: 'start',
      label: '처음 위치에서 새 세션 시작',
      vehicle: cloneVehicleState(runtime.initialVehicle),
    }]
  }

  const finishSession = (result: ReturnType<typeof evaluateParking>) => {
    if (sessionSaveRef.current) return sessionSaveRef.current
    setControlsLocked(true)
    setParkedResult(result)
    setSaveError(false)
    if (!replayRef.current.some((event) => event.id === 'finish')) {
      replayRef.current.push({
        id: 'finish',
        elapsedSeconds: (Date.now() - sessionStartedAtRef.current) / 1000,
        type: 'finish',
        phase: 'finish',
        label: result.success ? '주차 완료' : '미완료 상태로 연습 종료',
        vehicle: cloneVehicleState(vehicle),
        clip: sessionTrajectoryRef.current.slice(-18).map(({ vehicle: snapshot }) => snapshot),
      })
    }
    const savePromise = recordPracticeSessionDb(result, scenarioId, mode, new Date(), runtime, replayRef.current)
      .then((session) => {
        const saved = Boolean(session)
        if (!saved) {
          sessionSaveRef.current = null
          setSaveError(true)
        }
        return saved
      })
    sessionSaveRef.current = savePromise
    return savePromise
  }

  const completeParking = () => {
    if (!parkingEvaluation.success) return
    void finishSession(parkingEvaluation)
  }

  const navigateToResult = async (result: ReturnType<typeof evaluateParking>) => {
    const saved = await (sessionSaveRef.current ?? finishSession(result))
    if (!saved) return
    navigate('/result', { state: { result, scenarioId, mode, replay: replayRef.current, runtime } })
  }

  const finishIncompletePractice = async () => {
    const saved = await finishSession(parkingEvaluation)
    if (saved) await navigateToResult(parkingEvaluation)
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
    void navigateToResult(parkedResult)
  }

  return (
    <div className={`vehicle-simulator${mobileDirectAssist ? ' touch-driving-ui' : ''}`} onPointerUp={enterImmersiveMode}>
      <div className="simulator-toolbar" aria-label="연습 도구">
        <div>
          <button type="button" className="lesson-replay-control" onClick={onShowLesson}>단계별 안내</button>
        </div>
        <div>
          <button type="button" className="reset-control top-reset-control" onClick={resetSimulation}>↺ 처음 위치</button>
          {!parkedResult && (
            <button type="button" className="finish-practice-control" onClick={finishIncompletePractice}>연습 종료</button>
          )}
        </div>
      </div>
      <ParkingLotCanvas vehicle={vehicle} danger={danger} collisions={collisions} wheelStopActive={wheelStopActive} runtime={runtime} precisionAssist={mobileDirectAssist}>
        <CornerAssistance vehicle={vehicle} runtime={runtime} />
        {learningMode && <LearningHintPanel vehicle={vehicle} scenarioId={scenarioId} runtime={runtime} />}
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
      {saveError && <div className="practice-save-toast" role="alert">기록을 저장하지 못했습니다. 연결을 확인한 뒤 결과 확인을 다시 눌러주세요.</div>}
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
