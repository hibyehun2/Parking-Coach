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
        candidatePaths: [{ points: [vehicle], color: learningCase.title.includes('안전 완료') ? '#32a8ff' : '#ff5d52' }],
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(4px)' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', color: 'white', alignItems: 'center' }}>
            <strong style={{ fontSize: '1.1rem' }}>{learningCase.title} (크게 보기)</strong>
            <button type="button" onClick={() => setIsEnlarged(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', padding: '8px', cursor: 'pointer' }}>닫기 ✕</button>
          </header>
          <div style={{ flex: 1, minHeight: 0, padding: '0 20px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {canvasElement}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
