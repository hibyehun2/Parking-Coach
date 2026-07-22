import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type TouchEvent } from 'react'
import { DEFAULT_VEHICLE_CONFIG, radiansToDegrees } from '../../engine/vehiclePhysics'

type SteeringWheelProps = {
  steeringAngle: number
  onChange: (angle: number) => void
  onCenter: () => void
  disabled?: boolean
}

const MAX_WHEEL_ROTATION = 450
const LOCK_ENTER_MARGIN = Math.PI / 720
const LOCK_RELEASE_MARGIN = Math.PI / 60

function inputAngle(element: HTMLDivElement, clientX: number, clientY: number) {
  const bounds = element.getBoundingClientRect()
  const centerX = bounds.left + bounds.width / 2
  const centerY = bounds.top + bounds.height / 2
  return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI
}

function shortestAngleDelta(previous: number, current: number) {
  return (current - previous + 540) % 360 - 180
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function SteeringWheel({ steeringAngle, onChange, onCenter, disabled = false }: SteeringWheelProps) {
  const announcedLockRef = useRef<-1 | 0 | 1>(0)
  const dragRef = useRef<{
    pointerId: number
    pointerAngle: number
    wheelRotation: number
  } | null>(null)
  const touchDragRef = useRef<{
    identifier: number
    touchAngle: number
    wheelRotation: number
  } | null>(null)
  const maxSteeringAngle = DEFAULT_VEHICLE_CONFIG.maxSteeringAngle
  const wheelRotation = steeringAngle / maxSteeringAngle * MAX_WHEEL_ROTATION
  const steeringDegrees = Math.round(radiansToDegrees(steeringAngle))
  const absoluteAngle = Math.abs(steeringAngle)
  const lockDirection: -1 | 0 | 1 = absoluteAngle >= maxSteeringAngle - LOCK_ENTER_MARGIN
    ? steeringAngle < 0 ? -1 : 1
    : 0

  useEffect(() => {
    if (lockDirection !== 0 && announcedLockRef.current !== lockDirection) {
      announcedLockRef.current = lockDirection
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(35)
      }
      return
    }

    if (lockDirection === 0 && absoluteAngle <= maxSteeringAngle - LOCK_RELEASE_MARGIN) {
      announcedLockRef.current = 0
    }
  }, [absoluteAngle, lockDirection, maxSteeringAngle])

  const steeringStatus = lockDirection === -1
    ? '좌측 최대 35°'
    : lockDirection === 1
      ? '우측 최대 35°'
      : `${steeringDegrees > 0 ? '+' : ''}${steeringDegrees}°`

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.pointerType === 'touch' || event.button !== 0 || dragRef.current) return
    event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      pointerAngle: inputAngle(event.currentTarget, event.clientX, event.clientY),
      wheelRotation,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // iOS 홈 화면 웹앱에서는 캡처가 거부돼도 영역 안의 터치는 계속 처리한다.
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const currentPointerAngle = inputAngle(event.currentTarget, event.clientX, event.clientY)
    const delta = shortestAngleDelta(drag.pointerAngle, currentPointerAngle)
    drag.pointerAngle = currentPointerAngle
    drag.wheelRotation = clamp(
      drag.wheelRotation + delta,
      -MAX_WHEEL_ROTATION,
      MAX_WHEEL_ROTATION,
    )
    onChange(drag.wheelRotation / MAX_WHEEL_ROTATION * maxSteeringAngle)
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (disabled || touchDragRef.current) return
    const touch = event.changedTouches.item(0)
    if (!touch) return
    event.preventDefault()
    touchDragRef.current = {
      identifier: touch.identifier,
      touchAngle: inputAngle(event.currentTarget, touch.clientX, touch.clientY),
      wheelRotation,
    }
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const drag = touchDragRef.current
    if (!drag) return
    const touch = Array.from(event.touches).find((item) => item.identifier === drag.identifier)
    if (!touch) return
    event.preventDefault()
    const currentTouchAngle = inputAngle(event.currentTarget, touch.clientX, touch.clientY)
    drag.wheelRotation = clamp(
      drag.wheelRotation + shortestAngleDelta(drag.touchAngle, currentTouchAngle),
      -MAX_WHEEL_ROTATION,
      MAX_WHEEL_ROTATION,
    )
    drag.touchAngle = currentTouchAngle
    onChange(drag.wheelRotation / MAX_WHEEL_ROTATION * maxSteeringAngle)
  }

  const finishTouch = (event: TouchEvent<HTMLDivElement>) => {
    const drag = touchDragRef.current
    if (!drag) return
    const ended = Array.from(event.changedTouches).some((item) => item.identifier === drag.identifier)
    if (ended) touchDragRef.current = null
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
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
      <div className="steering-readout" aria-live="polite">
        <span>핸들</span>
        <strong className={lockDirection ? 'at-lock' : ''}>{steeringStatus}</strong>
      </div>
      <div
        className={`steering-wheel-touch-area${lockDirection ? ' at-lock' : ''}`}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="가상 핸들"
        aria-valuemin={-35}
        aria-valuemax={35}
        aria-valuenow={steeringDegrees}
        aria-valuetext={steeringStatus}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishTouch}
        onTouchCancel={finishTouch}
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
      <button type="button" className="center-steering-button" onClick={onCenter} disabled={disabled}>핸들 중앙</button>
    </div>
  )
}
