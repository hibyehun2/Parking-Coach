import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildCorrectionDrills } from '../engine/correctionDrills'
import { buildJudgmentGuide } from '../engine/judgmentScenarios'
import type { ScenarioRuntime } from '../types/practice'
import { recordCorrectionSession, type CorrectionAttempt } from '../engine/practiceHistory'
import type { JudgmentChoice } from '../engine/judgmentScenarios'
import { JudgmentGuide, JudgmentQuiz } from './JudgmentQuiz'

export function CorrectionPractice({ runtime }: { runtime: ScenarioRuntime }) {
  const navigate = useNavigate()
  const [showGuide, setShowGuide] = useState(true)
  const [drillIndex, setDrillIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState<CorrectionAttempt[]>([])
  const guide = useMemo(() => buildJudgmentGuide(runtime), [runtime])
  const drills = useMemo(() => buildCorrectionDrills(runtime), [runtime])
  const drill = drills[drillIndex]
  const step = drill.steps[stepIndex]
  const totalSteps = drills.reduce((total, item) => total + item.steps.length, 0)
  const completedBefore = drills.slice(0, drillIndex).reduce((total, item) => total + item.steps.length, 0)
  const currentNumber = completedBefore + stepIndex + 1

  const complete = (firstTryCorrect: boolean, answer: JudgmentChoice, firstChoice: JudgmentChoice) => {
    const nextScore = score + (firstTryCorrect ? 1 : 0)
    const nextAttempts = [...attempts, {
      drillId: drill.id,
      drillTitle: drill.title,
      stepId: step.id,
      stepTitle: step.title,
      firstTryCorrect,
      firstChoiceLabel: firstChoice.label,
      correctChoiceLabel: answer.label,
      takeaway: step.takeaway,
    }]
    if (stepIndex < drill.steps.length - 1) {
      setScore(nextScore)
      setAttempts(nextAttempts)
      setStepIndex((value) => value + 1)
      return
    }
    if (drillIndex < drills.length - 1) {
      setScore(nextScore)
      setAttempts(nextAttempts)
      setDrillIndex((value) => value + 1)
      setStepIndex(0)
      return
    }
    recordCorrectionSession(nextScore, totalSteps, runtime, undefined, undefined, nextAttempts)
    navigate('/result?tab=current', {
      state: {
        challengeComplete: true,
        challengeScore: nextScore,
        challengeTotal: totalSteps,
        scenarioId: runtime.scenarioId,
        mode: 'practice',
        runtime,
      },
    })
  }

  return (
    <section className="correction-practice">
      <div className="correction-progress">
        <span>{showGuide ? '예시' : `${currentNumber} / ${totalSteps}`}</span>
        <strong>{showGuide ? guide.title : `${drill.title} · ${step.title}`}</strong>
        <progress value={showGuide ? 0 : currentNumber} max={totalSteps} />
      </div>
      <p className="page-description">{showGuide
        ? '안전하게 자세를 바로잡는 예시를 먼저 본 뒤 수정 주차 연습을 시작합니다.'
        : `${drill.description} 선택한 안전 동작의 결과가 다음 판단 단계로 이어집니다.`}</p>
      {showGuide
        ? <JudgmentGuide scenario={guide} runtime={runtime} onStart={() => setShowGuide(false)} />
        : <JudgmentQuiz
          key={`${drill.id}-${step.id}`}
          scenario={step}
          runtime={runtime}
          questionNumber={currentNumber}
          total={totalSteps}
          onComplete={complete}
        />}
    </section>
  )
}
