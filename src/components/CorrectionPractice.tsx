import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildJudgmentGuide, buildJudgmentScenarios } from '../engine/judgmentScenarios'
import type { ScenarioRuntime } from '../types/practice'
import { recordCorrectionSession } from '../engine/practiceHistory'
import { JudgmentGuide, JudgmentQuiz } from './JudgmentQuiz'

export function CorrectionPractice({ runtime }: { runtime: ScenarioRuntime }) {
  const navigate = useNavigate()
  const [showGuide, setShowGuide] = useState(true)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const guide = useMemo(() => buildJudgmentGuide(runtime), [runtime])
  const scenarios = useMemo(() => buildJudgmentScenarios(runtime), [runtime])
  const current = scenarios[questionIndex]

  const complete = (firstTryCorrect: boolean) => {
    const nextScore = score + (firstTryCorrect ? 1 : 0)
    if (questionIndex < scenarios.length - 1) {
      setScore(nextScore)
      setQuestionIndex((value) => value + 1)
      return
    }
    recordCorrectionSession(nextScore, scenarios.length, runtime)
    navigate('/result?tab=current', {
      state: {
        challengeComplete: true,
        challengeScore: nextScore,
        challengeTotal: scenarios.length,
        scenarioId: runtime.scenarioId,
        mode: 'practice',
        runtime,
      },
    })
  }

  return (
    <section className="correction-practice">
      <div className="correction-progress">
        <span>{showGuide ? '예시' : `${questionIndex + 1} / ${scenarios.length}`}</span>
        <strong>{showGuide ? guide.title : current.title}</strong>
        <progress value={showGuide ? 0 : questionIndex + 1} max={scenarios.length} />
      </div>
      <p className="page-description">안전한 수정 예시를 먼저 본 뒤 6가지 장면에서 위험 예측부터 재접근까지 판단하세요.</p>
      {showGuide
        ? <JudgmentGuide scenario={guide} runtime={runtime} onStart={() => setShowGuide(false)} />
        : <JudgmentQuiz
          key={current.id}
          scenario={current}
          runtime={runtime}
          questionNumber={questionIndex + 1}
          total={scenarios.length}
          onComplete={complete}
        />}
    </section>
  )
}
