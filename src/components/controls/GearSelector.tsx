import type { Gear } from '../../engine/vehiclePhysics'

type GearSelectorProps = {
  gear: Gear
  canShift: boolean
  onChange: (gear: Gear) => void
}

export function GearSelector({ gear, canShift, onChange }: GearSelectorProps) {
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
          onClick={() => onChange('R')}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>R</strong><small>후진</small>
        </button>
        <button
          type="button"
          className={gear === 'D' ? 'active' : ''}
          aria-pressed={gear === 'D'}
          disabled={!canShift && gear !== 'D'}
          onClick={() => onChange('D')}
          onContextMenu={(event) => event.preventDefault()}
        >
          <strong>D</strong><small>전진</small>
        </button>
      </div>
      <small className="shift-help">브레이크 작동 후 변경</small>
    </div>
  )
}
