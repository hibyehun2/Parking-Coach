import { useCallback, useEffect, useRef, useState } from 'react'
import {
  rearSensorDistance,
  renderDriverView,
  type DriverView,
} from '../../engine/driverAssistance'
import type { VehicleState } from '../../engine/vehiclePhysics'

type DriverAssistanceProps = {
  vehicle: VehicleState
}

type ViewCheck = {
  view: DriverView
  source: 'touch' | 'click' | 'keyboard'
  checkedAt: number
}

const VIEW_STORAGE_KEY = 'parking-coach:view-checks'
const VIEWS: { id: DriverView; label: string; shortcut: string }[] = [
  { id: 'left', label: '좌측 미러', shortcut: '1' },
  { id: 'rear', label: '후방카메라', shortcut: '2' },
  { id: 'right', label: '우측 미러', shortcut: '3' },
]

function AssistanceCanvas({ vehicle, view }: { vehicle: VehicleState; view: DriverView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vehicleRef = useRef(vehicle)
  const viewRef = useRef(view)
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
      renderDriverView(context, width, height, vehicleRef.current, viewRef.current)
    }
    drawRef.current = draw
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    vehicleRef.current = vehicle
    viewRef.current = view
    drawRef.current()
  }, [vehicle, view])

  return <canvas ref={canvasRef} aria-hidden="true" />
}

export function DriverAssistance({ vehicle }: DriverAssistanceProps) {
  const lastTouchRef = useRef(0)
  const [expandedView, setExpandedView] = useState<DriverView | null>(null)
  const [checkCount, setCheckCount] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(VIEW_STORAGE_KEY) ?? '[]').length as number
    } catch {
      return 0
    }
  })
  const sensorDistance = rearSensorDistance(vehicle)

  const openView = useCallback((view: DriverView, source: ViewCheck['source']) => {
    setExpandedView(view)
    let checks: ViewCheck[]
    try {
      checks = JSON.parse(sessionStorage.getItem(VIEW_STORAGE_KEY) ?? '[]') as ViewCheck[]
    } catch {
      checks = []
    }
    const next = [...checks, { view, source, checkedAt: Date.now() }]
    sessionStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(next))
    setCheckCount(next.length)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const view = VIEWS.find((item) => item.shortcut === event.key)
      if (!view) return
      event.preventDefault()
      openView(view.id, 'keyboard')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openView])

  return (
    <div className="driver-assistance" aria-label="미러와 후방카메라">
      <div className="driver-view-list">
        {VIEWS.map((view) => (
          <button
            type="button"
            className="driver-view"
            key={view.id}
            onTouchStart={(event) => {
              event.preventDefault()
              lastTouchRef.current = Date.now()
              openView(view.id, 'touch')
            }}
            onClick={(event) => {
              if (Date.now() - lastTouchRef.current < 700) return
              const pointerType = (event.nativeEvent as PointerEvent).pointerType
              openView(view.id, pointerType === 'touch' ? 'touch' : 'click')
            }}
            aria-label={`${view.label} 확대, 단축키 ${view.shortcut}`}
          >
            <span>{view.label}<kbd>{view.shortcut}</kbd></span>
            <AssistanceCanvas vehicle={vehicle} view={view.id} />
            {view.id === 'rear' && (
              <strong className={sensorDistance !== null && sensorDistance < 1 ? 'sensor-close' : ''}>
                {sensorDistance === null ? '후방 5m 이상' : `후방 ${sensorDistance.toFixed(1)}m`}
              </strong>
            )}
          </button>
        ))}
      </div>
      <small className="view-check-count">확인 기록 {checkCount}회</small>

      {expandedView && (
        <div className="driver-view-backdrop" role="presentation" onClick={() => setExpandedView(null)}>
          <section
            className="driver-view-expanded"
            role="dialog"
            aria-modal="true"
            aria-label={`${VIEWS.find((view) => view.id === expandedView)?.label} 확대 화면`}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <strong>{VIEWS.find((view) => view.id === expandedView)?.label}</strong>
              <button type="button" onClick={() => setExpandedView(null)}>닫기</button>
            </header>
            <AssistanceCanvas vehicle={vehicle} view={expandedView} />
            {expandedView === 'rear' && (
              <p>{sensorDistance === null ? '후방 장애물이 5m 이내에 없습니다.' : `가장 가까운 후방 장애물까지 ${sensorDistance.toFixed(1)}m`}</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
