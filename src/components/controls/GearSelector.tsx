import type { Gear } from '../../engine/vehiclePhysics'

type GearSelectorProps = {
  gear: Gear
  braking: boolean
  canShift: boolean
  onChange: (gear: Gear) => void
  onBrakeChange: (braking: boolean) => void
}

export function GearSelector({ gear, braking, canShift, onChange, onBrakeChange }: GearSelectorProps) {
  return (
    <div className="gear-module">
      <span className="dashboard-label">기어</span>
      <div className="gear-gate" role="group" aria-label="기어 선택">
        <span className={`gear-lever gear-${gear.toLowerCase()}`} aria-hidden="true" />
        <button
          type="button"
          className={gear === 'R' ? 'active' : ''}
          aria-pressed={gear === 'R'}
          disabled={!canShift && gear !== 'R'}
          onPointerUp={(event) => {
            if (event.button === 0) onChange('R')
          }}
          onClick={(event) => {
            if (event.detail === 0) onChange('R')
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
          onPointerUp={(event) => {
            if (event.button === 0) onChange('D')
          }}
          onClick={(event) => {
            if (event.detail === 0) onChange('D')
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>D</strong><small>전진</small>
        </button>
        <button
          type="button"
          className={`stop-control${braking ? ' active' : ''}`}
          aria-label={braking ? '브레이크 해제' : '차량 정지'}
          aria-pressed={braking}
          onPointerUp={(event) => {
            if (event.button === 0) onBrakeChange(!braking)
          }}
          onClick={(event) => {
            if (event.detail === 0) onBrakeChange(!braking)
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>■</strong><small>{braking ? '정지 해제' : '정지'}</small>
        </button>
      </div>
      <small className="shift-help">정지 후 기어 변경</small>
    </div>
  )
}
