import { useEffect, useMemo, useRef, useState } from 'react'
import { buildLessonSimulation, lessonDriverShoulder } from '../engine/lessonSimulation'
import { TARGET_PARKING_BAY } from '../engine/parkingEvaluation'
import { renderParkingLot } from '../engine/parkingLotRenderer'
import type { ScenarioRuntime } from '../types/practice'

export function LessonParkingCanvas({ runtime, stepIndex }: { runtime: ScenarioRuntime; stepIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stages = useMemo(() => buildLessonSimulation(runtime), [runtime])
  const stage = stages[stepIndex]
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (stage.states.length < 2) return
    const timer = window.setInterval(() => {
      setFrame((current) => {
        if (current >= stage.states.length - 1) {
          window.clearInterval(timer)
          return current
        }
        return current + 1
      })
    }, 24)
    return () => window.clearInterval(timer)
  }, [stage])

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
      const vehicle = stage.states[Math.min(frame, stage.states.length - 1)]
      const first = stage.states[0]
      const last = stage.states.at(-1)!
      renderParkingLot(context, width, height, vehicle, {
        runtime,
        focus: { x: 15, y: 7.1, span: 14, heading: -Math.PI / 2 },
        candidatePaths: stage.path.length > 1
          ? [{ points: stage.path, color: '#9aefd1', dashed: true }]
          : [],
        ghostVehicles: [
          ...(frame > 0 ? [{ vehicle: first, color: '#a7b4af' }] : []),
          ...(frame < stage.states.length - 1 ? [{ vehicle: last, color: '#55d8a8' }] : []),
        ],
      })

      if (stepIndex !== 0) return
      const shoulder = lessonDriverShoulder(last)
      const scale = Math.max(width, height) / 14
      const worldLeft = 15 - width / scale / 2
      const worldTop = 7.1 - height / scale / 2
      const screenX = (shoulder.x - worldLeft) * scale
      const screenY = (shoulder.y - worldTop) * scale
      const boundaryX = runtime.startSide === 'right' ? TARGET_PARKING_BAY.left : TARGET_PARKING_BAY.right
      const lineX = (boundaryX - worldLeft) * scale
      context.save()
      context.strokeStyle = '#ffe078'
      context.lineWidth = 2
      context.setLineDash([6, 5])
      context.beginPath()
      context.moveTo(lineX, Math.max(8, screenY - 48))
      context.lineTo(lineX, Math.min(height - 8, screenY + 48))
      context.stroke()
      context.setLineDash([])
      context.fillStyle = '#ffe078'
      context.beginPath()
      context.arc(screenX, screenY, 5, 0, Math.PI * 2)
      context.fill()
      context.font = '800 11px sans-serif'
      context.textAlign = 'center'
      context.fillText('운전자 어깨 ↔ 끝 선', lineX, Math.max(16, screenY - 54))
      context.restore()
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [frame, runtime, stage, stepIndex])

  return <canvas role="img" ref={canvasRef} aria-label={`${stepIndex + 1}단계 실제 주차화면 탑뷰 시뮬레이션`} />
}
