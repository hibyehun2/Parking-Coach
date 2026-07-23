import { useEffect, useRef } from 'react'
import { renderParkingLot } from '../../engine/parkingLotRenderer'
import type { VehicleState } from '../../engine/vehiclePhysics'
import type { ScenarioRuntime } from '../../types/practice'

type RearSide = 'left' | 'right'

function rearSideFocus(vehicle: VehicleState, sideName: RearSide) {
  const sideSign = sideName === 'left' ? -1 : 1
  const cosine = Math.cos(vehicle.heading)
  const sine = Math.sin(vehicle.heading)
  const forwardOffset = -1.25
  const sideOffset = 1.15
  return {
    x: vehicle.x + cosine * forwardOffset + -sine * sideOffset * sideSign,
    y: vehicle.y + sine * forwardOffset + cosine * sideOffset * sideSign,
  }
}

function RearSideCanvas({ vehicle, sideName, runtime }: { vehicle: VehicleState; sideName: RearSide; runtime: ScenarioRuntime }) {
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
        focus: { ...focus, span: 6.8, heading: vehicle.heading },
        assistanceSide: sideName,
        runtime,
      })
      const innerEdge = sideName === 'left' ? width : 0
      const direction = sideName === 'left' ? -1 : 1
      const body = context.createLinearGradient(innerEdge, 0, innerEdge + direction * width * .28, 0)
      body.addColorStop(0, 'rgba(7, 50, 35, .98)')
      body.addColorStop(0.72, 'rgba(18, 131, 86, .78)')
      body.addColorStop(1, 'rgba(18, 131, 86, 0)')
      context.fillStyle = body
      context.beginPath()
      context.moveTo(innerEdge, height * .08)
      context.lineTo(innerEdge + direction * width * .13, height * .2)
      context.lineTo(innerEdge + direction * width * .24, height)
      context.lineTo(innerEdge, height)
      context.closePath()
      context.fill()

      context.fillStyle = '#ff5148'
      const lampX = sideName === 'left' ? width - width * .1 : width * .1
      context.fillRect(lampX - 7, height * .7, 14, 4)
      context.fillStyle = 'rgba(255,255,255,.9)'
      context.font = `800 ${Math.max(8, width / 28)}px sans-serif`
      context.textAlign = sideName === 'left' ? 'right' : 'left'
      context.fillText('내 차', sideName === 'left' ? width - 7 : 7, height - 8)

      const vignette = context.createLinearGradient(0, 0, 0, height)
      vignette.addColorStop(0, 'rgba(6,12,10,.25)')
      vignette.addColorStop(.45, 'rgba(6,12,10,0)')
      vignette.addColorStop(1, 'rgba(6,12,10,.2)')
      context.fillStyle = vignette
      context.fillRect(0, 0, width, height)
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [runtime, sideName, vehicle])

  return <canvas ref={canvasRef} aria-hidden="true" />
}

export function CornerAssistance({ vehicle, runtime }: { vehicle: VehicleState; runtime: ScenarioRuntime }) {
  return (
    <div className="corner-assistance" aria-label="좌우 후방 간격 보조 화면">
      {(['left', 'right'] as const).map((sideName) => (
        <div className={`corner-view corner-view-${sideName}`} key={sideName}>
          <div className="mirror-glass">
            <span>{sideName === 'left' ? '좌측 후방 간격뷰' : '우측 후방 간격뷰'}</span>
            <RearSideCanvas vehicle={vehicle} sideName={sideName} runtime={runtime} />
          </div>
        </div>
      ))}
    </div>
  )
}
