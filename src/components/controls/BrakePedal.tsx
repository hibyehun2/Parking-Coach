type BrakePedalProps = {
  active: boolean
  onChange: (active: boolean) => void
}

export function BrakePedal({ active, onChange }: BrakePedalProps) {
  return (
    <div className="pedal-module">
      <span className="dashboard-label">페달</span>
      <button
        type="button"
        className={`brake-pedal${active ? ' pressed' : ''}`}
        aria-label="브레이크 페달"
        aria-pressed={active}
        onClick={() => onChange(!active)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="pedal-face"><i /><i /><i /><i /></span>
        <strong>BRAKE</strong>
      </button>
      <small>{active ? '작동 중 · 탭하여 해제' : '탭하여 정지'}</small>
    </div>
  )
}
