import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { DEFAULT_VEHICLE_CONFIG, radiansToDegrees } from '../../engine/vehiclePhysics'

type SteeringWheelProps = {
  steeringAngle: number
  onChange: (angle: number) => void
  onCenter: () => void
}

const MAX_WHEEL_ROTATION = 450
const DRAG_PIXELS_FOR_FULL_LOCK = 180
const TOUCH_DRAG_RATIO = 0.65
const MIN_TOUCH_DRAG_PIXELS = 72

export function SteeringWheel({ steeringAngle, onChange, onCenter }: SteeringWheelProps) {
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startAngle: number
    pixelsForFullLock: number
  } | null>(null)
  const maxSteeringAngle = DEFAULT_VEHICLE_CONFIG.maxSteeringAngle
  const wheelRotation = steeringAngle / maxSteeringAngle * MAX_WHEEL_ROTATION
  const steeringDegrees = Math.round(radiansToDegrees(steeringAngle))

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const touchWidth = event.currentTarget.getBoundingClientRect().width * TOUCH_DRAG_RATIO
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startAngle: steeringAngle,
      pixelsForFullLock: event.pointerType === 'touch'
        ? Math.max(MIN_TOUCH_DRAG_PIXELS, touchWidth)
        : DRAG_PIXELS_FOR_FULL_LOCK,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const delta = (event.clientX - drag.startX) / drag.pixelsForFullLock
    onChange(drag.startAngle + delta * maxSteeringAngle)
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = Math.PI / 90
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onChange(steeringAngle - step)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onChange(steeringAngle + step)
    }
    if (event.key === 'Home' || event.key === 'Enter') onCenter()
  }

  return (
    <div className="steering-module">
      <div className="steering-readout">
        <span>핸들</span>
        <strong>{steeringDegrees > 0 ? '+' : ''}{steeringDegrees}°</strong>
      </div>
      <div
        className="steering-wheel-touch-area"
        role="slider"
        tabIndex={0}
        aria-label="가상 핸들"
        aria-valuemin={-35}
        aria-valuemax={35}
        aria-valuenow={steeringDegrees}
        aria-valuetext={`${steeringDegrees}도`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onKeyDown={handleKeyDown}
      >
        <div className="steering-wheel" style={{ transform: `rotate(${wheelRotation}deg)` }}>
          <span className="wheel-rim" />
          <span className="wheel-spoke spoke-left" />
          <span className="wheel-spoke spoke-right" />
          <span className="wheel-spoke spoke-bottom" />
          <span className="wheel-hub">P</span>
          <span className="wheel-center-mark" />
        </div>
      </div>
      <button type="button" className="center-steering-button" onClick={onCenter}>핸들 중앙</button>
    </div>
  )
}
