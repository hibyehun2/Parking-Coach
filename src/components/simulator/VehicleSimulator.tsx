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
import type { PracticeMode, ScenarioId } from '../../types/practice'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type VehicleSimulatorProps = {
  learningMode: boolean
  scenarioId: ScenarioId
  mode: PracticeMode
}

export function VehicleSimulator({ learningMode, scenarioId, mode }: VehicleSimulatorProps) {
  const navigate = useNavigate()
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobile = isIos || isAndroid
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true
  const fullscreenAttemptedRef = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isInstalled, setIsInstalled] = useState(isStandalone)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
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
  } = useVehicleSimulation()
  const danger = learningMode ? detectCollision(vehicle, 0.42) : null
  const parkingEvaluation = evaluateParking(vehicle, collisions)

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
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const markInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState)
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', markInstalled)
    syncFullscreenState()

    return () => {
      document.documentElement.classList.remove('simulator-active')
      document.body.classList.remove('simulator-active')
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', markInstalled)
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

  const installToHomeScreen = async () => {
    if (!installPrompt) {
      setShowInstallGuide(true)
      return
    }

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setIsInstalled(true)
      setInstallPrompt(null)
    } catch {
      setInstallPrompt(null)
      setShowInstallGuide(true)
    }
  }

  const resetSimulation = () => {
    setParkedResult(null)
    reset()
  }

  const completeParking = () => {
    if (!parkingEvaluation.success || parkedResult) return
    setControlsLocked(true)
    setParkedResult(parkingEvaluation)
  }

  const showParkingResult = () => {
    if (!parkedResult) return
    navigate('/result', { state: { result: parkedResult, scenarioId, mode } })
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

          <div className="instrument-panel reset-panel">
            <button type="button" className="reset-control" onClick={resetSimulation}>처음 위치</button>
          </div>

          <GearSelector
            gear={vehicle.gear}
            braking={braking}
            canShift={canShift}
            parkingReady={parkingEvaluation.success}
            parkingCompleted={Boolean(parkedResult)}
            onChange={parkedResult ? () => undefined : setGear}
            onBrakeChange={parkedResult ? () => undefined : setBraking}
            onPark={completeParking}
            onShowResult={showParkingResult}
          />
        </div>
      </ParkingLotCanvas>
      {canUseFullscreen && !isFullscreen && (!isMobile || isInstalled) && (
        <button
          type="button"
          className="immersive-control"
          onPointerUp={(event) => event.stopPropagation()}
          onClick={requestImmersiveMode}
        >
          ⛶ 전체화면
        </button>
      )}
      {isMobile && !isInstalled && (
        <button
          type="button"
          className="immersive-control mobile-install-control"
          onPointerUp={(event) => event.stopPropagation()}
          onClick={() => void installToHomeScreen()}
        >
          {isIos ? '공유 □↑ → 홈 화면에 추가' : '홈 화면에 앱 설치'}
        </button>
      )}
      {showInstallGuide && (
        <div
          className="install-guide-backdrop"
          role="presentation"
          onPointerUp={(event) => event.stopPropagation()}
        >
          <section className="install-guide" role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
            <strong id="install-guide-title">홈 화면에서 앱으로 사용</strong>
            {isIos ? (
              <ol>
                <li>현재 브라우저의 공유 버튼 <b>□↑</b> 또는 공유 메뉴를 여세요.</li>
                <li><b>홈 화면에 추가</b>를 선택하고, 표시되면 <b>웹 앱으로 열기</b>를 켜세요.</li>
                <li>홈 화면의 Parking Coach 아이콘으로 실행하세요.</li>
              </ol>
            ) : (
              <ol>
                <li>브라우저의 메뉴 <b>⋮</b>를 여세요.</li>
                <li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택하세요.</li>
                <li>홈 화면의 Parking Coach 아이콘으로 실행하세요.</li>
              </ol>
            )}
            <button type="button" onClick={() => setShowInstallGuide(false)}>확인</button>
          </section>
        </div>
      )}
      <p className="driving-help">
        핸들을 손가락으로 원을 그리듯 돌리세요. 브레이크를 작동한 뒤 기어를 선택하고, 브레이크를 해제하면 천천히 움직입니다.
      </p>
      <p className="keyboard-help">키보드: ←/A · →/D 조향, Space/S 브레이크, F 전진, R 후진, C 중앙 · 1/2/3 미러·카메라</p>
    </div>
  )
}
