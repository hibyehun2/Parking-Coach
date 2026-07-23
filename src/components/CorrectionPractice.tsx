import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CollisionQuiz } from './CollisionQuiz'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { ScenarioRuntime } from '../types/practice'

export function CorrectionPractice({ runtime }: { runtime: ScenarioRuntime }) {
  const navigate = useNavigate()
  const event = useMemo<ReplayEvent>(() => {
    const vehicle = { ...runtime.initialVehicle, braking: true, speed: 0 }
    const side = runtime.variant === 'right' ? 'right' : 'left'
    return {
      id: 'practice-near-miss',
      elapsedSeconds: 0,
      type: 'collision',
      label: '충돌 직전',
      vehicle,
      collision: {
        obstacleId: `parked-${side}`,
        kind: 'vehicle',
        position: { x: vehicle.x, y: vehicle.y },
        contactZone: `front-${side}`,
      },
      phase: 'turning-reverse',
    }
  }, [runtime])

  return (
    <section className="correction-practice">
      <p className="page-description">차량이 옆 차에 닿기 직전입니다. 선택한 행동의 결과를 움직이는 탑뷰로 확인하세요.</p>
      <CollisionQuiz
        event={event}
        runtime={runtime}
        onComplete={() => navigate('/result?tab=current', {
          state: { challengeComplete: true, scenarioId: 'both-sides', mode: 'practice', runtime },
        })}
      />
    </section>
  )
}
