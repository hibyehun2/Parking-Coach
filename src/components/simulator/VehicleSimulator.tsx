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
  const keyboardPulseTimersRef = useRef<Record<string, number>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [parkedResult, setParkedResult] = useState<ReturnType<typeof evaluateParking> | null>(null)
  const [wheelStopActive, setWheelStopActive] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [pressedKeyboardControls, setPressedKeyboardControls] = useState<Set<string>>(() => new Set())
  const [confirmFinish, setConfirmFinish] = useState(false)
  const canUseFullscreen = !isIos && document.fullscreenEnabled
  const mobileDirectAssist = learningMode
    && window.matchMedia('(pointer: coarse), (hover: none)').matches
  const pcDirectControls = window.matchMedia('(hover: hover) and (pointer: fine)').matches
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
    const controlForCode = (code: string) => {
      if (code === 'ArrowLeft') return 'steering-left'
      if (code === 'ArrowRight') return 'steering-right'
      if (code === 'Space' || code === 'KeyS') return 'brake'
      if (code === 'KeyR') return 'reverse'
      if (code === 'KeyD' || code === 'KeyF') return 'drive'
      if (code === 'KeyC') return 'center'
      return null
    }
    const heldControls = new Set(['steering-left', 'steering-right'])
    const hasInteractiveTarget = (event: KeyboardEvent) => {
      const target = event.target
      return target instanceof HTMLElement && (
        target.isContentEditable
        || target.matches('button, input, textarea, select, a[href]')
      )
    }
    const setControlPressed = (control: string, pressed: boolean) => {
      setPressedKeyboardControls((current) => {
        const next = new Set(current)
        if (pressed) next.add(control)
        else next.delete(control)
        return next
      })
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (hasInteractiveTarget(event)) return
      const control = controlForCode(event.code)
      if (!control || event.repeat) return
      setControlPressed(control, true)
      if (heldControls.has(control)) return
      window.clearTimeout(keyboardPulseTimersRef.current[control])
      keyboardPulseTimersRef.current[control] = window.setTimeout(() => {
        setControlPressed(control, false)
        delete keyboardPulseTimersRef.current[control]
      }, 520)
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (hasInteractiveTarget(event)) return
      const control = controlForCode(event.code)
      if (control && heldControls.has(control)) setControlPressed(control, false)
    }
    const clearPressedControls = () => setPressedKeyboardControls(new Set())
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearPressedControls)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearPressedControls)
      Object.values(keyboardPulseTimersRef.current).forEach((timer) => window.clearTimeout(timer))
      keyboardPulseTimersRef.current = {}
    }
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
    setConfirmFinish(false)
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
    setConfirmFinish(false)
    const saved = await finishSession(parkingEvaluation)
    if (saved) await navigateToResult(parkingEvaluation)
  }

  const requestFinishIncompletePractice = () => {
    if (pcDirectControls && Math.abs(vehicle.speed) >= .05) {
      setConfirmFinish(true)
      return
    }
    void finishIncompletePractice()
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
            <button type="button" className="finish-practice-control" onClick={requestFinishIncompletePractice}>연습 종료</button>
          )}
        </div>
      </div>
      {confirmFinish && (
        <section className="finish-practice-confirm" role="dialog" aria-modal="false" aria-labelledby="finish-practice-confirm-title">
          <strong id="finish-practice-confirm-title">주행 중 연습을 종료할까요?</strong>
          <p>현재 위치까지 기록하고 결과 화면으로 이동합니다.</p>
          <div>
            <button type="button" className="secondary-button" onClick={() => setConfirmFinish(false)}>계속 연습</button>
            <button type="button" className="finish-practice-confirm-action" onClick={() => void finishIncompletePractice()}>종료하기</button>
          </div>
        </section>
      )}
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
      <aside className="pc-control-guide" aria-label="PC 운전 조작 가이드">
        <header>
          <div><span>PC 조작</span><strong>운전 조작 가이드</strong></div>
          <p aria-live="polite">
            {parkedResult
              ? '연습이 종료되었습니다'
              : braking
                ? canShift
                  ? '브레이크 작동 중 · R 또는 D를 선택할 수 있습니다'
                  : '브레이크 작동 중 · 완전히 멈추면 기어를 바꿀 수 있습니다'
                : `${vehicle.gear} 기어 이동 중 · 브레이크를 클릭하면 정지합니다`}
          </p>
        </header>
        <div className="pc-control-sequence" aria-label="마우스 조작 순서">
          <span className={braking ? 'active' : ''}><i>1</i><b>브레이크 클릭</b><small>작동 유지</small></span>
          <em aria-hidden="true">›</em>
          <span className={braking && canShift ? 'active' : ''}><i>2</i><b>R · D 선택</b><small>이동 방향</small></span>
          <em aria-hidden="true">›</em>
          <span className={!braking ? 'active' : ''}><i>3</i><b>브레이크 클릭</b><small>해제 후 출발</small></span>
        </div>
        <div className="pc-keyboard-shortcuts" aria-label="키보드 단축키">
          <span className={`keyboard-tile steering-tile${pressedKeyboardControls.has('steering-left') || pressedKeyboardControls.has('steering-right') ? ' is-pressed' : ''}`}>
            <span><kbd className={pressedKeyboardControls.has('steering-left') ? 'is-pressed' : ''}>←</kbd><kbd className={pressedKeyboardControls.has('steering-right') ? 'is-pressed' : ''}>→</kbd></span>
            <small>조향</small>
          </span>
          <span className={`keyboard-tile brake-tile${pressedKeyboardControls.has('brake') ? ' is-pressed' : ''}${braking ? ' is-selected' : ''}`}>
            <kbd>Space</kbd><small>브레이크</small>
          </span>
          <span className={`keyboard-tile${pressedKeyboardControls.has('reverse') ? ' is-pressed' : ''}${vehicle.gear === 'R' ? ' is-selected' : ''}`}>
            <kbd>R</kbd><small>후진</small>
          </span>
          <span className={`keyboard-tile${pressedKeyboardControls.has('drive') ? ' is-pressed' : ''}${vehicle.gear === 'D' ? ' is-selected' : ''}`}>
            <kbd>D</kbd><small>전진</small>
          </span>
          <span className={`keyboard-tile center-tile${pressedKeyboardControls.has('center') ? ' is-pressed' : ''}`}>
            <kbd>C</kbd><small>핸들 중앙</small>
          </span>
        </div>
      </aside>
    </div>
  )
}
