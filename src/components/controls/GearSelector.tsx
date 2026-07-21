import { useRef } from 'react'
import type { Gear } from '../../engine/vehiclePhysics'

type GearSelectorProps = {
  gear: Gear
  braking: boolean
  canShift: boolean
  onChange: (gear: Gear) => void
  onBrakeChange: (braking: boolean) => void
}

export function GearSelector({ gear, braking, canShift, onChange, onBrakeChange }: GearSelectorProps) {
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
      <span className="dashboard-label">브레이크 · 기어</span>
      <div className="gear-control-cluster" role="group" aria-label="브레이크와 기어 선택">
        <button
          type="button"
          className={`integrated-brake${braking ? ' active' : ''}`}
          aria-label={braking ? '브레이크 해제' : '브레이크 작동'}
          aria-pressed={braking}
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
            disabled={!canShift && gear !== 'R'}
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
            disabled={!canShift && gear !== 'D'}
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
      <small className="shift-help">브레이크 작동 후 기어 변경</small>
    </div>
  )
}
