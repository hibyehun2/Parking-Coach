import { useRef } from 'react'
import type { Gear } from '../../engine/vehiclePhysics'

type GearSelectorProps = {
  gear: Gear
  braking: boolean
  canShift: boolean
  parkingReady: boolean
  parkingCompleted: boolean
  onChange: (gear: Gear) => void
  onBrakeChange: (braking: boolean) => void
  onPark: () => void
  onShowResult: () => void
}

export function GearSelector({
  gear,
  braking,
  canShift,
  parkingReady,
  parkingCompleted,
  onChange,
  onBrakeChange,
  onPark,
  onShowResult,
}: GearSelectorProps) {
  const lastTouchRef = useRef(0)
  const handleTouch = (action: () => void) => {
    lastTouchRef.current = Date.now()
    action()
  }
  const handleAccessibleClick = (action: () => void) => {
    if (Date.now() - lastTouchRef.current > 700) action()
  }
  const toggleBrake = () => {
    if (!braking && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25)
    }
    onBrakeChange(!braking)
  }

  return (
    <div className="gear-module">
      <div className="gear-control-cluster" role="group" aria-label="브레이크와 기어 선택">
        <button
          type="button"
          className={`integrated-brake${braking ? ' active' : ''}`}
          aria-label={braking ? '브레이크 해제' : '브레이크 작동'}
          aria-pressed={braking}
          disabled={parkingCompleted}
          onTouchStart={(event) => {
            event.preventDefault()
            handleTouch(toggleBrake)
          }}
          onPointerUp={(event) => {
            if (event.pointerType !== 'touch' && event.button === 0) toggleBrake()
          }}
          onClick={(event) => {
            if (event.detail === 0) handleAccessibleClick(toggleBrake)
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>BRAKE</strong>
          <span aria-hidden="true">●</span>
          <small>{braking ? '작동 중' : '브레이크'}</small>
        </button>
        <div className="gear-gate" role="group" aria-label="기어 선택">
          <span className={`gear-lever gear-${gear.toLowerCase()}`} aria-hidden="true" />
          <button
            type="button"
            className={gear === 'R' ? 'active' : ''}
            aria-pressed={gear === 'R'}
            disabled={parkingCompleted || (!canShift && gear !== 'R')}
            onTouchStart={(event) => {
              event.preventDefault()
              handleTouch(() => onChange('R'))
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== 'touch' && event.button === 0) onChange('R')
            }}
            onClick={(event) => {
              if (event.detail === 0) handleAccessibleClick(() => onChange('R'))
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <strong>R</strong><small>후진</small>
          </button>
          <button
            type="button"
            className={gear === 'D' ? 'active' : ''}
            aria-pressed={gear === 'D'}
            disabled={parkingCompleted || (!canShift && gear !== 'D')}
            onTouchStart={(event) => {
              event.preventDefault()
              handleTouch(() => onChange('D'))
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== 'touch' && event.button === 0) onChange('D')
            }}
            onClick={(event) => {
              if (event.detail === 0) handleAccessibleClick(() => onChange('D'))
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <strong>D</strong><small>전진</small>
          </button>
        </div>
      </div>
      {!parkingCompleted ? (
        <button
          type="button"
          className="parking-control"
          disabled={!parkingReady}
          aria-label={parkingReady ? '주차 완료 확정' : '차량을 주차칸 안에 넣고 브레이크를 작동해야 파킹할 수 있습니다'}
          onClick={onPark}
        >
          파킹
        </button>
      ) : (
        <button type="button" className="result-control" onClick={onShowResult}>결과 확인</button>
      )}
    </div>
  )
}
