import { useEffect, useMemo, useRef, useState } from 'react'
import { renderParkingLot } from '../engine/parkingLotRenderer'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { ScenarioRuntime } from '../types/practice'

function coaching(event: ReplayEvent) {
  if (event.type === 'collision') {
    const zone = event.collision?.contactZone?.replace('front', '앞').replace('rear', '뒤').replace('left', '왼쪽').replace('right', '오른쪽')
    const correction = event.vehicle.gear === 'R' ? '앞쪽을 확인한 뒤 짧게 전진' : '뒤쪽을 확인한 뒤 짧게 후진'
    return `${zone ? `${zone} 모서리가` : '차량이'} 장애물에 가까워졌습니다. 위험 지점 전에 완전히 정지하고 ${correction}해 간격을 확보하세요.`
  }
  if (event.phase === 'finish') return '최종 차체 각도와 양쪽 주차선 간격을 비교하세요. 평행 상태에서 핸들을 중앙으로 풀어야 합니다.'
  return '차량 위치와 조향 시점을 확인하세요.'
}

export function ReplayMomentCard({
  event,
  runtime,
  onRetry,
}: {
  event: ReplayEvent
  runtime?: ScenarioRuntime
  onRetry?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frames = useMemo(
    () => event.clip?.length ? event.clip : [event.vehicle, event.impactVehicle ?? event.vehicle],
    [event],
  )
  const [frame, setFrame] = useState(0)
  const [playKey, setPlayKey] = useState(0)

  useEffect(() => {
    if (frames.length < 2) return
    const timer = window.setInterval(() => {
      setFrame((current) => {
        if (current >= frames.length - 1) {
          window.clearInterval(timer)
          return current
        }
        return current + 1
      })
    }, 120)
    return () => window.clearInterval(timer)
  }, [frames.length, playKey])

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
      const vehicle = frames[Math.min(frame, frames.length - 1)]
      const xs = frames.map((item) => item.x)
      const ys = frames.map((item) => item.y)
      renderParkingLot(context, width, height, vehicle, {
        runtime,
        focus: {
          x: (Math.min(...xs) + Math.max(...xs)) / 2,
          y: (Math.min(...ys) + Math.max(...ys)) / 2,
          span: 11,
          heading: -Math.PI / 2,
        },
        candidatePaths: [{ points: frames.map(({ x, y }) => ({ x, y })), color: event.type === 'collision' ? '#ff5d52' : '#32a8ff' }],
        highlightContactZone: event.type === 'collision' ? event.collision?.contactZone : undefined,
      })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [event, frame, frames, runtime])

  return (
    <article className={`replay-moment-card replay-${event.type}`}>
      <canvas ref={canvasRef} role="img" aria-label={`${event.label} 전후 차량 움직임`} />
      <div>
        <span>{event.elapsedSeconds.toFixed(1)}초 · {event.type === 'collision' ? '우선 수정할 순간' : '최종 자세'}</span>
        <strong>{event.label}</strong>
        <p>{coaching(event)}</p>
        <div>
          <button type="button" onClick={() => { setFrame(0); setPlayKey((value) => value + 1) }}>다시 보기</button>
          {onRetry && <button type="button" className="replay-primary-action" onClick={onRetry}>충돌 직전에서 직접 수정</button>}
        </div>
      </div>
    </article>
  )
}
