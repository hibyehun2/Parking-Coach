import { useEffect, useRef } from 'react'
import { renderParkingLot } from '../../engine/parkingLotRenderer'
import { VEHICLE_DIMENSIONS } from '../../engine/collisionDetection'
import { activeCorners, type CornerName } from '../../engine/cornerAssistance'
import type { VehicleState } from '../../engine/vehiclePhysics'

const LABELS: Record<CornerName, string> = {
  'left-front': '왼쪽 앞 간격',
  'right-front': '오른쪽 앞 간격',
  'left-rear': '왼쪽 뒤 간격',
  'right-rear': '오른쪽 뒤 간격',
}

function cornerPoint(vehicle: VehicleState, corner: CornerName) {
  const forwardSign = corner.endsWith('front') ? 1 : -1
  const sideSign = corner.startsWith('left') ? -1 : 1
  const cosine = Math.cos(vehicle.heading)
  const sine = Math.sin(vehicle.heading)
  return {
    x: vehicle.x + cosine * VEHICLE_DIMENSIONS.length / 2 * forwardSign + -sine * VEHICLE_DIMENSIONS.width / 2 * sideSign,
    y: vehicle.y + sine * VEHICLE_DIMENSIONS.length / 2 * forwardSign + cosine * VEHICLE_DIMENSIONS.width / 2 * sideSign,
  }
}

function CornerCanvas({ vehicle, corner }: { vehicle: VehicleState; corner: CornerName }) {
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
      const focus = cornerPoint(vehicle, corner)
      renderParkingLot(context, width, height, vehicle, { focus: { ...focus, span: 4.3 } })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [corner, vehicle])

  return <canvas ref={canvasRef} aria-hidden="true" />
}

export function CornerAssistance({ vehicle }: { vehicle: VehicleState }) {
  const corners = activeCorners(vehicle)

  return (
    <div className="corner-assistance" aria-label="자동 차량 모서리 간격 화면">
      {corners.map((corner) => (
        <div className="corner-view" key={corner}>
          <span>{LABELS[corner]}</span>
          <CornerCanvas vehicle={vehicle} corner={corner} />
        </div>
      ))}
    </div>
  )
}
