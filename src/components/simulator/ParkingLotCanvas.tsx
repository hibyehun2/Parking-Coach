import { useEffect, useRef, type ReactNode } from 'react'
import { renderParkingLot } from '../../engine/parkingLotRenderer'
import type { VehicleState } from '../../engine/vehiclePhysics'
import type { Collision } from '../../engine/collisionDetection'

type ParkingLotCanvasProps = {
  vehicle: VehicleState
  danger: Collision | null
  collisions: Collision[]
  children?: ReactNode
}

export function ParkingLotCanvas({ vehicle, danger, collisions, children }: ParkingLotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vehicleRef = useRef(vehicle)
  const renderOptionsRef = useRef({ danger, collisions })

  const drawRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(bounds.width))
      const height = Math.max(1, Math.round(bounds.height))
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)

      const context = canvas.getContext('2d')
      if (!context) return

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      renderParkingLot(context, width, height, vehicleRef.current, renderOptionsRef.current)
    }
    drawRef.current = draw

    const resizeObserver = new ResizeObserver(draw)
    resizeObserver.observe(canvas)
    draw()

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    vehicleRef.current = vehicle
    renderOptionsRef.current = { danger, collisions }
    drawRef.current()
  }, [collisions, danger, vehicle])

  return (
    <div className="parking-canvas-frame">
      <canvas
        ref={canvasRef}
        className="parking-canvas"
        aria-label="양옆에 차량이 있는 지하주차장 탑뷰. 중앙 연습 주차칸, 좌우 주차 차량, 사용자 차량과 오른쪽 기둥이 표시되어 있습니다."
        role="img"
      />
      <div className="canvas-legend" aria-hidden="true">
        <span><i className="legend-user" />내 차</span>
        <span><i className="legend-parked" />주차 차량</span>
        <span><i className="legend-target" />연습 주차칸</span>
      </div>
      {children}
    </div>
  )
}
