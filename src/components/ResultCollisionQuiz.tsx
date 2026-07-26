import { useMemo, useState } from 'react'
import { buildResultCollisionCorrectionQuiz } from '../engine/resultCollisionQuiz'
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
  const quiz = useMemo(() => buildResultCollisionCorrectionQuiz(event, runtime), [event, runtime])
  const [complete, setComplete] = useState(false)

  return (
    <section id="collision-judgment-quiz" className="result-collision-quiz" aria-labelledby="result-collision-quiz-title">
      <div className="result-collision-quiz-heading">
        <span>실제 충돌 장면 판단 복기</span>
        <h2 id="result-collision-quiz-title" tabIndex={-1}>충돌 전, 어떤 수정이 안전했을까요?</h2>
        <p>실제 충돌 직전의 위치와 주변 공간을 기준으로 판단해보세요.</p>
      </div>
      {!complete && <JudgmentQuiz
        key={quiz.correction.id}
        scenario={quiz.correction}
        runtime={runtime}
        questionNumber={1}
        total={1}
        completionLabel="복기 완료"
        onComplete={() => setComplete(true)}
      />}
      {complete && <div className="result-collision-quiz-complete">
        <strong>실제 충돌 장면에서 안전한 수정 경로를 확인했습니다.</strong>
        <p>{quiz.correction.takeaway}</p>
        <button type="button" className="primary-button" onClick={onRetry}>충돌 직전부터 직접 수정</button>
      </div>}
    </section>
  )
}
