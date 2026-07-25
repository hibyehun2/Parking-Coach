import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { renderParkingLot } from '../engine/parkingLotRenderer'
import type { LearningCase } from '../data/learningCases'

export function LearningCaseViewer({
  learningCase,
}: {
  learningCase: LearningCase
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEnlarged, setIsEnlarged] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !learningCase.runtime || !learningCase.vehicleSnapshot) return

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
      
      const vehicle = learningCase.vehicleSnapshot!
      
      renderParkingLot(context, width, height, vehicle, {
        runtime: learningCase.runtime,
        focus: {
          x: vehicle.x,
          y: vehicle.y,
          span: 12,
          heading: -Math.PI / 2,
        },
        candidatePaths: [{ points: [vehicle], color: learningCase.title.includes('안전 주차') || learningCase.title.includes('연습 완료') ? '#32a8ff' : '#ff5d52' }],
      })
    }
    
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [learningCase, isEnlarged])

  if (!learningCase.runtime || !learningCase.vehicleSnapshot) {
    return null
  }

  const canvasElement = <canvas ref={canvasRef} role="img" aria-label="주차 최종 위치" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

  return (
    <div className="learning-case-viewer" style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#59635f', borderRadius: '13px', overflow: 'hidden', marginTop: '12px' }}>
      {!isEnlarged && canvasElement}
      {!isEnlarged && (
        <button 
          type="button" 
          onClick={() => setIsEnlarged(true)} 
          style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
        >
          크게 보기
        </button>
      )}
      
      {isEnlarged && createPortal(
        <div className="review-topview-backdrop" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setIsEnlarged(false)
        }}>
          <section className="review-topview-dialog" role="dialog" aria-modal="true">
            <header>
              <div><span>{learningCase.scenario}</span><h3>{learningCase.title}</h3></div>
              <button type="button" aria-label="큰 탑뷰 닫기" onClick={() => setIsEnlarged(false)}>×</button>
            </header>
            <figure>
              {canvasElement}
              <figcaption>{learningCase.summary}</figcaption>
            </figure>
            <div className="expanded-review-copy">
              <p className="correction-memory"><b>기억할 기준</b><span>{learningCase.takeaway}</span></p>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  )
}
