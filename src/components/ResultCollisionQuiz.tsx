import { useMemo, useState } from 'react'
import { buildResultCollisionQuiz } from '../engine/resultCollisionQuiz'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { ScenarioRuntime } from '../types/practice'
import { JudgmentQuiz } from './JudgmentQuiz'

export function ResultCollisionQuiz({
  event,
  runtime,
  onRetry,
}: {
  event: ReplayEvent
  runtime: ScenarioRuntime
  onRetry: () => void
}) {
  const quiz = useMemo(() => buildResultCollisionQuiz(event, runtime), [event, runtime])
  const [stage, setStage] = useState<1 | 2 | 'complete'>(1)

  return (
    <section className="result-collision-quiz" aria-labelledby="result-collision-quiz-title">
      <div className="result-collision-quiz-heading">
        <span>실제 충돌 장면 미니 퀴즈</span>
        <h2 id="result-collision-quiz-title">위험을 찾고 안전한 수정 경로를 선택하세요</h2>
        <p>저장된 차량 위치와 장애물 배치로 선택 결과를 다시 계산합니다.</p>
      </div>
      {stage === 1 && <JudgmentQuiz
        key={quiz.risk.id}
        scenario={quiz.risk}
        runtime={runtime}
        questionNumber={1}
        total={2}
        onComplete={() => setStage(2)}
      />}
      {stage === 2 && <JudgmentQuiz
        key={quiz.correction.id}
        scenario={quiz.correction}
        runtime={runtime}
        questionNumber={2}
        total={2}
        onComplete={() => setStage('complete')}
      />}
      {stage === 'complete' && <div className="result-collision-quiz-complete">
        <strong>실제 충돌 지점과 안전한 수정 경로를 확인했습니다.</strong>
        <p>{quiz.correction.takeaway}</p>
        <button type="button" className="primary-button" onClick={onRetry}>충돌 직전부터 직접 수정</button>
      </div>}
    </section>
  )
}
