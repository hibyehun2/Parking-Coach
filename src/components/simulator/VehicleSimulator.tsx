import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
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
import { recordPracticeSession } from '../../engine/practiceHistory'
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

const CONTROL_HELP_SEEN_KEY = 'parking-coach:control-help-seen:v1'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [parkedResult, setParkedResult] = useState<ReturnType<typeof evaluateParking> | null>(null)
  const [wheelStopActive, setWheelStopActive] = useState(false)
  const [showControlHelp, setShowControlHelp] = useState(
    () => learningMode && window.localStorage.getItem(CONTROL_HELP_SEEN_KEY) !== 'true',
  )
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
    if (!showControlHelp) return
    setBraking(true)
    setControlsLocked(true)
  }, [setBraking, setControlsLocked, showControlHelp])

  useEffect(() => {
    if (!showControlHelp) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      window.localStorage.setItem(CONTROL_HELP_SEEN_KEY, 'true')
      setShowControlHelp(false)
      if (!parkedResult) setControlsLocked(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [parkedResult, setControlsLocked, showControlHelp])

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
    setParkedResult(null)
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
    if (parkedResult) return
    setControlsLocked(true)
    setParkedResult(result)
    replayRef.current.push({
      id: 'finish',
      elapsedSeconds: (Date.now() - sessionStartedAtRef.current) / 1000,
      type: 'finish',
      phase: 'finish',
      label: result.success ? '주차 완료' : '미완료 상태로 연습 종료',
      vehicle: cloneVehicleState(vehicle),
      clip: sessionTrajectoryRef.current.slice(-18).map(({ vehicle: snapshot }) => snapshot),
    })
    recordPracticeSession(result, scenarioId, mode, undefined, new Date(), runtime, replayRef.current)
  }

  const completeParking = () => {
    if (!parkingEvaluation.success) return
    finishSession(parkingEvaluation)
  }

  const navigateToResult = (result: ReturnType<typeof evaluateParking>) => {
    navigate('/result', { state: { result, scenarioId, mode, replay: replayRef.current, runtime } })
  }

  const finishIncompletePractice = () => {
    finishSession(parkingEvaluation)
    navigateToResult(parkingEvaluation)
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
    navigateToResult(parkedResult)
  }

  const openControlHelp = () => {
    setBraking(true)
    setControlsLocked(true)
    setShowControlHelp(true)
  }

  const closeControlHelp = () => {
    window.localStorage.setItem(CONTROL_HELP_SEEN_KEY, 'true')
    setShowControlHelp(false)
    if (!parkedResult) setControlsLocked(false)
  }

  return (
    <div className="vehicle-simulator" onPointerUp={enterImmersiveMode}>
      <div className="simulator-toolbar" aria-label="연습 도구">
        <div>
          <button type="button" className="lesson-replay-control" onClick={onShowLesson}>단계별 안내</button>
          {learningMode && <button type="button" className="control-help-button" onClick={openControlHelp}>? 조작 도움말</button>}
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
      {showControlHelp && createPortal(
        <div className="control-help-backdrop">
          <section className="control-help-dialog" role="dialog" aria-modal="true" aria-labelledby="control-help-title">
            <header>
              <div><span>초보자용</span><h2 id="control-help-title">조작 도움말</h2></div>
              <button type="button" onClick={closeControlHelp} aria-label="조작 도움말 닫기">×</button>
            </header>
            <p>차는 도움말을 보는 동안 멈춰 있어요. 아래 순서대로 천천히 조작해 보세요.</p>
            <ol>
              <li><b>1</b><span><strong>브레이크로 완전히 정지</strong><small>기어를 바꾸기 전 속도가 0인지 확인해요.</small></span></li>
              <li><b>2</b><span><strong>D 또는 R 선택</strong><small>D는 전진, R은 후진이에요.</small></span></li>
              <li><b>3</b><span><strong>핸들을 돌리고 브레이크 해제</strong><small>핸들은 원을 그리듯 돌리고, 차는 천천히 움직여요.</small></span></li>
              <li><b>4</b><span><strong>간격뷰와 후방 화면을 나눠 확인</strong><small>좌우 간격은 간격뷰로, 뒤쪽 깊이는 후방 화면으로 확인해요. 불안하면 바로 멈춰요.</small></span></li>
            </ol>
            <button type="button" className="control-help-start" onClick={closeControlHelp}>확인하고 연습하기</button>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}
