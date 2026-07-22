import { useEffect, useRef } from 'react'
import { renderParkingLot } from '../../engine/parkingLotRenderer'
import { TARGET_PARKING_BAY } from '../../engine/parkingEvaluation'
import type { VehicleState } from '../../engine/vehiclePhysics'

type RearSide = 'left' | 'right'

function rearSideFocus(vehicle: VehicleState, sideName: RearSide) {
  const sideSign = sideName === 'left' ? -1 : 1
  const cosine = Math.cos(vehicle.heading)
  const sine = Math.sin(vehicle.heading)
  const parkingProgress = Math.min(1, Math.max(0, (
    vehicle.y - (TARGET_PARKING_BAY.top - 1.5)
  ) / 3.5))
  const rearOffset = -0.45 + parkingProgress * 0.3
  const sideOffset = 0.9
  return {
    x: vehicle.x + cosine * rearOffset + -sine * sideOffset * sideSign,
    y: vehicle.y + sine * rearOffset + cosine * sideOffset * sideSign,
  }
}

function RearSideCanvas({ vehicle, sideName }: { vehicle: VehicleState; sideName: RearSide }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(bounds.width))
      const height = Math.max(1, Math.round(bounds.height))
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const focus = rearSideFocus(vehicle, sideName)
      renderParkingLot(context, width, height, vehicle, {
        focus: { ...focus, span: 6, viewWidth: 7.2, heading: vehicle.heading },
      })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [sideName, vehicle])

  return <canvas ref={canvasRef} aria-hidden="true" />
}

export function CornerAssistance({ vehicle }: { vehicle: VehicleState }) {
  return (
    <div className="corner-assistance" aria-label="좌우 후방 평면 보조 화면">
      {(['left', 'right'] as const).map((sideName) => (
        <div className="corner-view" key={sideName}>
          <span>{sideName === 'left' ? '좌측 후방 평면뷰' : '우측 후방 평면뷰'}</span>
          <RearSideCanvas vehicle={vehicle} sideName={sideName} />
          <small>내 차 후측면 · 주차선 간격</small>
        </div>
      ))}
    </div>
  )
}
