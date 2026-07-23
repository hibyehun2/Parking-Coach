import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CollisionQuiz } from './CollisionQuiz'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { ScenarioRuntime } from '../types/practice'
import { recordCorrectionSession } from '../engine/practiceHistory'

export function CorrectionPractice({ runtime }: { runtime: ScenarioRuntime }) {
  const navigate = useNavigate()
  const [questionIndex, setQuestionIndex] = useState(0)
  const cases = useMemo(() => {
    const baseSide = runtime.seed % 2 ? 'right' : 'left'
    const oppositeSide = baseSide === 'left' ? 'right' : 'left'
    const isNarrow = runtime.scenarioId === 'narrow-aisle'
    const definitions: Array<{ gear: 'D' | 'R'; side: 'left' | 'right'; step: number; title: string; kind?: 'vehicle' | 'wall' }> = [
      { gear: 'R', side: baseSide, step: 0, title: '곡선 후진 중 가까워지는 모서리 발견' },
      { gear: 'R', side: oppositeSide, step: 0, title: '반대쪽 차량과의 간격 감소' },
      { gear: 'D', side: baseSide, step: 0, title: isNarrow ? '전진 수정 중 반대편 벽 접근' : '전진 수정 중 앞 모서리 위험', kind: isNarrow ? 'wall' : 'vehicle' },
      { gear: 'R', side: baseSide, step: 1, title: '후진 위험에서 안전거리 회복' },
      { gear: 'D', side: oppositeSide, step: 1, title: '전진 위험에서 안전거리 회복' },
      { gear: 'R', side: oppositeSide, step: 1, title: '반대 조향보다 안전한 수정 선택' },
      { gear: 'R', side: baseSide, step: 2, title: '짧은 전진 뒤 재출발 확인' },
      { gear: 'D', side: oppositeSide, step: 2, title: '반대 진행 뒤 양쪽 간격 확인' },
      { gear: 'R', side: oppositeSide, step: 0, title: '재진입 중 새로운 위험 발견' },
      { gear: 'R', side: baseSide, step: 2, title: '최종 재진입 전 종합 확인' },
    ]
    return definitions.map((definition, index) => {
      const direction = definition.side === 'left' ? -1 : 1
      const vehicle = {
        ...runtime.initialVehicle,
        x: (definition.side === 'left' ? 14 : 16) + direction * (index % 3) * .08,
        y: 5,
        heading: (definition.side === 'left' ? -0.9 : -2.24) + direction * (index % 2) * .04,
        steeringAngle: definition.side === 'left' ? .48 : -.48,
        gear: definition.gear,
        braking: true,
        speed: 0,
      }
      const event: ReplayEvent = {
        id: `practice-near-miss-${index}`,
        elapsedSeconds: index,
        type: 'collision',
        label: definition.title,
        vehicle,
        collision: {
          obstacleId: definition.kind === 'wall' ? 'narrow-opposite-wall' : `parked-${definition.side}`,
          kind: definition.kind ?? 'vehicle',
          position: { x: vehicle.x, y: vehicle.y },
          contactZone: `front-${definition.side}`,
        },
        phase: definition.gear === 'R' ? 'turning-reverse' : 'approach',
      }
      return { ...definition, event }
    })
  }, [runtime])
  const current = cases[questionIndex]
  const complete = () => {
    if (questionIndex < cases.length - 1) {
      setQuestionIndex((value) => value + 1)
      return
    }
    recordCorrectionSession(cases.length, cases.length, runtime)
    navigate('/result?tab=current', {
      state: { challengeComplete: true, challengeScore: cases.length, challengeTotal: cases.length, scenarioId: runtime.scenarioId, mode: 'practice', runtime },
    })
  }

  return (
    <section className="correction-practice">
      <div className="correction-progress"><span>{questionIndex + 1} / {cases.length}</span><strong>{current.title}</strong><progress value={questionIndex + 1} max={cases.length} /></div>
      <p className="page-description">충돌 직전 상황입니다. 선택한 행동의 결과를 움직이는 탑뷰로 확인하세요.</p>
      <CollisionQuiz
        key={current.event.id}
        event={current.event}
        runtime={runtime}
        onlyStep={current.step}
        onComplete={complete}
        completionLabel={questionIndex === cases.length - 1 ? '훈련 결과 보기' : '다음 문제'}
      />
    </section>
  )
}
