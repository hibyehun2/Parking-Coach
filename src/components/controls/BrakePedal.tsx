import type { PointerEvent } from 'react'

type BrakePedalProps = {
  active: boolean
  onChange: (active: boolean) => void
}

export function BrakePedal({ active, onChange }: BrakePedalProps) {
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    onChange(true)
  }

  const release = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onChange(false)
  }

  return (
    <div className="pedal-module">
      <span className="dashboard-label">페달</span>
      <button
        type="button"
        className={`brake-pedal${active ? ' pressed' : ''}`}
        aria-label="브레이크 페달"
        aria-pressed={active}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span className="pedal-face"><i /><i /><i /><i /></span>
        <strong>BRAKE</strong>
      </button>
      <small>{active ? '정지 중' : '크리프 이동 중'}</small>
    </div>
  )
}
