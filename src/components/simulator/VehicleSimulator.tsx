import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GearSelector } from '../controls/GearSelector'
import { SteeringWheel } from '../controls/SteeringWheel'
import { useVehicleSimulation } from '../../hooks/useVehicleSimulation'
import { ParkingLotCanvas } from './ParkingLotCanvas'

export function VehicleSimulator() {
  const fullscreenAttemptedRef = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true
  const canUseFullscreen = !isIos && document.fullscreenEnabled
  const {
    vehicle,
    braking,
    canShift,
    setSteeringAngle,
    setBraking,
    setGear,
    centerSteering,
    reset,
  } = useVehicleSimulation()

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

  return (
    <div className="vehicle-simulator" onPointerUp={enterImmersiveMode}>
      <ParkingLotCanvas vehicle={vehicle} />
      {canUseFullscreen && !isFullscreen && (
        <button
          type="button"
          className="immersive-control ios-install-control"
          onPointerUp={(event) => event.stopPropagation()}
          onClick={requestImmersiveMode}
        >
          ⛶ 전체화면
        </button>
      )}
      {isIos && !isStandalone && (
        <button
          type="button"
          className="immersive-control"
          onPointerUp={(event) => event.stopPropagation()}
          onClick={() => setShowInstallGuide(true)}
        >
          Safari 공유 □↑ → 홈 화면에 추가
        </button>
      )}
      {showInstallGuide && (
        <div
          className="install-guide-backdrop"
          role="presentation"
          onPointerUp={(event) => event.stopPropagation()}
        >
          <section className="install-guide" role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
            <strong id="install-guide-title">아이폰 전체 화면 사용</strong>
            <ol>
              <li>Safari 하단의 공유 버튼 <b>□↑</b>을 누르세요.</li>
              <li><b>홈 화면에 추가</b>를 선택하세요.</li>
              <li>홈 화면에 생긴 Parking Coach 아이콘으로 실행하세요.</li>
            </ol>
            <button type="button" onClick={() => setShowInstallGuide(false)}>확인</button>
          </section>
        </div>
      )}
      <div className="driving-console" aria-label="차량 운전 조작부">
        <SteeringWheel
          steeringAngle={vehicle.steeringAngle}
          onChange={setSteeringAngle}
          onCenter={centerSteering}
        />

        <div className="instrument-panel" aria-live="polite">
          <span className="dashboard-label">차량 상태</span>
          <div className="gear-display">{vehicle.gear}</div>
          <strong>{Math.abs(vehicle.speed).toFixed(1)} <small>m/s</small></strong>
          <span>{braking ? '브레이크 작동' : `${vehicle.gear === 'R' ? '후진' : '전진'} 크리프`}</span>
          <button type="button" className="reset-control" onClick={reset}>처음 위치</button>
        </div>

        <GearSelector
          gear={vehicle.gear}
          braking={braking}
          canShift={canShift}
          onChange={setGear}
          onBrakeChange={setBraking}
        />
      </div>
      <p className="driving-help">
        핸들을 손가락으로 원을 그리듯 돌리세요. 브레이크를 작동한 뒤 기어를 선택하고, 브레이크를 해제하면 천천히 움직입니다.
      </p>
      <p className="keyboard-help">키보드: ←/A · →/D 조향, Space/S 브레이크, F 전진, R 후진, C 중앙</p>
    </div>
  )
}
