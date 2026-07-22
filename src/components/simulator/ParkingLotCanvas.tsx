import { useEffect, useRef, type ReactNode } from 'react'
import { renderParkingLot } from '../../engine/parkingLotRenderer'
import type { VehicleState } from '../../engine/vehiclePhysics'
import type { Collision } from '../../engine/collisionDetection'

type ParkingLotCanvasProps = {
  vehicle: VehicleState
  danger: Collision | null
  collisions: Collision[]
  wheelStopActive?: boolean
  children?: ReactNode
}

export function ParkingLotCanvas({ vehicle, danger, collisions, wheelStopActive = false, children }: ParkingLotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vehicleRef = useRef(vehicle)
  const renderOptionsRef = useRef({ danger, collisions, wheelStopActive })

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
      const compactLandscape = height <= 520
      renderParkingLot(context, width, height, vehicleRef.current, {
        ...renderOptionsRef.current,
        topInsetRatio: compactLandscape ? 0.29 : 0.2,
        bottomInsetRatio: 0.02,
      })
    }
    drawRef.current = draw

    const resizeObserver = new ResizeObserver(draw)
    resizeObserver.observe(canvas)
    draw()

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    vehicleRef.current = vehicle
    renderOptionsRef.current = { danger, collisions, wheelStopActive }
    drawRef.current()
  }, [collisions, danger, vehicle, wheelStopActive])

  return (
    <div className="parking-canvas-frame">
      <canvas
        ref={canvasRef}
        className="parking-canvas"
        aria-label="옥상 주차장 탑뷰. 중앙 연습 주차칸, 좌우 주차 차량, 빈 주차칸, 전기차 충전 구역과 사용자 차량이 표시되어 있습니다."
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
