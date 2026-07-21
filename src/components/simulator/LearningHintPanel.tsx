import { useEffect, useRef, useState } from 'react'
import { getLearningHint, type LearningHint } from '../../engine/learningHints'
import type { VehicleState } from '../../engine/vehiclePhysics'
import type { ScenarioId } from '../../types/practice'

type LearningHintPanelProps = {
  vehicle: VehicleState
  scenarioId: ScenarioId
}

const REPEAT_DELAY = 8000

export function LearningHintPanel({ vehicle, scenarioId }: LearningHintPanelProps) {
  const candidate = getLearningHint(vehicle, scenarioId)
  const [visibleHint, setVisibleHint] = useState<LearningHint | null>(candidate)
  const lastShownRef = useRef(new Map<string, number>())
  const candidateId = candidate?.id
  const candidateLevel = candidate?.level
  const candidateTitle = candidate?.title
  const candidateMessage = candidate?.message

  useEffect(() => {
    const update = window.setTimeout(() => {
      if (!candidateId || !candidateLevel || !candidateTitle || !candidateMessage) {
        setVisibleHint(null)
        return
      }
      setVisibleHint((current) => {
        if (current?.id === candidateId) {
          return { id: candidateId, level: candidateLevel, title: candidateTitle, message: candidateMessage }
        }
        const now = Date.now()
        const lastShown = lastShownRef.current.get(candidateId) ?? 0
        if (candidateLevel !== 'danger' && now - lastShown < REPEAT_DELAY) return null
        lastShownRef.current.set(candidateId, now)
        return { id: candidateId, level: candidateLevel, title: candidateTitle, message: candidateMessage }
      })
    }, 0)
    return () => window.clearTimeout(update)
  }, [candidateId, candidateLevel, candidateMessage, candidateTitle])

  if (!visibleHint) return null

  const levelName = visibleHint.level === 'danger' ? '위험' : visibleHint.level === 'caution' ? '주의' : '안내'
  return (
    <aside className={`learning-hint hint-${visibleHint.level}`} role={visibleHint.level === 'danger' ? 'alert' : 'status'}>
      <span>{levelName}</span>
      <div><strong>{visibleHint.title}</strong><p>{visibleHint.message}</p></div>
    </aside>
  )
}
