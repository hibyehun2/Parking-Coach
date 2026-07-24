import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { buildCorrectionDrills, type CorrectionDrill } from '../engine/correctionDrills'
import {
  buildJudgmentGuide,
  type JudgmentChoice,
  type JudgmentScenario,
} from '../engine/judgmentScenarios'
import {
  loadPracticeHistory,
  recordCorrectionSession,
  type CorrectionAttempt,
} from '../engine/practiceHistory'
import type { ScenarioRuntime } from '../types/practice'
import { JudgmentCanvas, JudgmentGuide, JudgmentQuiz } from './JudgmentQuiz'

type PracticeItem = {
  drill: CorrectionDrill
  step: JudgmentScenario
}

function PreviousQuestionReview({
  attempt,
  position,
  total,
  runtime,
  onPrevious,
  onNext,
  onClose,
}: {
  attempt: CorrectionAttempt
  position: number
  total: number
  runtime: ScenarioRuntime
  onPrevious: () => void
  onNext: () => void
  onClose: () => void
}) {
  const snapshot = attempt.reviewSnapshot
  if (!snapshot) return null

  return createPortal(
    <div className="previous-quiz-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="previous-quiz-dialog" role="dialog" aria-modal="true" aria-labelledby="previous-quiz-title">
        <header>
          <div>
            <span>이전 문제 {position + 1} / {total}</span>
            <h2 id="previous-quiz-title">{snapshot.scenario.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="이전 문제 보기 닫기">×</button>
        </header>
        <div className="previous-quiz-layout">
          <div className="previous-quiz-figure">
            <JudgmentCanvas
              scenario={snapshot.scenario}
              choice={snapshot.correctChoice}
              correct
              runtime={runtime}
            />
            <small>안전한 선택의 움직임</small>
          </div>
          <div className="previous-quiz-copy">
            <p>{snapshot.scenario.situation}</p>
            <strong>{snapshot.scenario.question}</strong>
            <dl>
              <div><dt>내 첫 선택</dt><dd>{snapshot.firstChoice.label}</dd></div>
              <div><dt>안전한 선택</dt><dd>{snapshot.correctChoice.label}</dd></div>
            </dl>
            {snapshot.correctChoice.steps?.length && (
              <ol>{snapshot.correctChoice.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            )}
            <p className="previous-quiz-takeaway">{snapshot.scenario.takeaway}</p>
          </div>
        </div>
        <footer>
          <button type="button" onClick={onPrevious} disabled={position === 0}>이전</button>
          <button type="button" onClick={onNext} disabled={position === total - 1}>다음</button>
          <button type="button" className="primary" onClick={onClose}>현재 문제로 돌아가기</button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}

function CourseIcon({ course }: { course: CorrectionDrill['id'] }) {
  const paths: Record<CorrectionDrill['id'], React.ReactNode> = {
    'near-side': <><path d="M4 4v12M8 10h9" /><path d="m13 6 4 4-4 4" /></>,
    'far-side': <><path d="M16 4v12M12 10H3" /><path d="m7 6-4 4 4 4" /></>,
    'off-center': <><path d="M3 4v12M17 4v12M7 10h6" /><path d="m10 7 3 3-3 3" /></>,
    crooked: <><path d="M4 4v12M16 4v12" /><path d="m7 14 6-8" /></>,
    'narrow-multipoint': <><path d="M3 5h14M3 15h14" /><path d="m7 12 3-3 3 3" /></>,
  }
  return <svg viewBox="0 0 20 20" aria-hidden="true">{paths[course]}</svg>
}

export function CorrectionPractice({ runtime }: { runtime: ScenarioRuntime }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'select' | 'guide' | 'practice'>('select')
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([])
  const [itemIndex, setItemIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState<CorrectionAttempt[]>([])
  const [reviewAttemptIndex, setReviewAttemptIndex] = useState<number | null>(null)
  const guide = useMemo(() => buildJudgmentGuide(runtime), [runtime])
  const drills = useMemo(() => buildCorrectionDrills(runtime), [runtime])
  const history = useMemo(() => loadPracticeHistory(), [])
  const pastAttempts = useMemo(
    () => history.sessions
      .filter((session) => session.mode === 'practice' && session.scenarioId === runtime.scenarioId)
      .flatMap((session) => session.correctionAttempts ?? []),
    [history.sessions, runtime.scenarioId],
  )
  const courseStatus = (drill: CorrectionDrill) => {
    const matching = pastAttempts.filter((attempt) => attempt.drillId === drill.id)
    if (!matching.length) return { label: '처음', tone: 'new' }
    const recent = matching.slice(0, 10)
    const correct = recent.filter((attempt) => attempt.firstTryCorrect).length
    if (correct / recent.length < .7) return { label: '복습 추천', tone: 'review' }
    if (recent.length >= 3 && correct / recent.length >= .8) return { label: '안정적', tone: 'steady' }
    return { label: '연습 완료', tone: 'complete' }
  }
  const courseProgress = (drill: CorrectionDrill) => {
    const recent = pastAttempts.filter((attempt) => attempt.drillId === drill.id).slice(0, drill.steps.length * 3)
    if (!recent.length) return null
    return {
      correct: recent.filter((attempt) => attempt.firstTryCorrect).length,
      total: recent.length,
    }
  }
  const recommendedCourse = useMemo(() => {
    const priority = [...drills].sort((left, right) => {
      const rank = (drill: CorrectionDrill) => {
        const status = courseStatus(drill).tone
        return status === 'review' ? 0 : status === 'new' ? 1 : status === 'complete' ? 2 : 3
      }
      return rank(left) - rank(right)
    })
    return priority[0]
  // pastAttempts is intentionally part of the recommendation input.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drills, pastAttempts])

  useEffect(() => {
    if (reviewAttemptIndex === null) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReviewAttemptIndex(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [reviewAttemptIndex])

  const start = (drill: CorrectionDrill) => {
    const chosen = drill.steps.map((step) => ({ drill, step }))
    if (!chosen.length) return
    setPracticeItems(chosen)
    setItemIndex(0)
    setScore(0)
    setAttempts([])
    setReviewAttemptIndex(null)
    setPhase('practice')
  }

  const showGuide = () => {
    setPracticeItems([])
    setPhase('guide')
  }

  const complete = (firstTryCorrect: boolean, answer: JudgmentChoice, firstChoice: JudgmentChoice) => {
    const current = practiceItems[itemIndex]
    const nextScore = score + (firstTryCorrect ? 1 : 0)
    const nextAttempts = [...attempts, {
      drillId: current.drill.id,
      drillTitle: current.drill.title,
      stepId: current.step.id,
      stepTitle: current.step.title,
      firstTryCorrect,
      firstChoiceLabel: firstChoice.label,
      correctChoiceLabel: answer.label,
      takeaway: current.step.takeaway,
      skill: current.step.skill,
      reviewSnapshot: {
        scenario: current.step,
        firstChoice,
        correctChoice: answer,
      },
    }]
    if (itemIndex < practiceItems.length - 1) {
      setScore(nextScore)
      setAttempts(nextAttempts)
      setItemIndex((value) => value + 1)
      return
    }
    recordCorrectionSession(nextScore, practiceItems.length, runtime, undefined, undefined, nextAttempts)
    navigate('/result?tab=current', {
      state: {
        challengeComplete: true,
        challengeScore: nextScore,
        challengeTotal: practiceItems.length,
        scenarioId: runtime.scenarioId,
        mode: 'practice',
        runtime,
      },
    })
  }

  if (phase === 'select') {
    return (
      <section className="judgment-skill-picker" aria-labelledby="judgment-skill-title">
        <header>
          <div><span>판단 연습</span><h2 id="judgment-skill-title">어떤 수정 과정을 연습할까요?</h2></div>
          <p>한 상황의 판단과 움직임을 처음부터 끝까지 이어서 연습해요.</p>
        </header>
        <div className="judgment-picker-options">
          <div className="judgment-picker-lead">
            <button type="button" className="recommended-practice" onClick={() => recommendedCourse && start(recommendedCourse)}>
              <span>오늘의 추천 · 연속 수정</span>
              <strong>{recommendedCourse?.title ?? '수정 과정을 이어서 연습해요'}</strong>
              <small>{recommendedCourse ? `${recommendedCourse.steps.length}단계를 한 차량 상태로 이어서 연습해요` : '추천 코스를 준비하고 있어요'}</small>
              <b>바로 시작 <span aria-hidden="true">→</span></b>
            </button>
            <button type="button" className="judgment-example-card" onClick={showGuide}>
              <span>{pastAttempts.length ? '필요할 때 다시 보기' : '처음이라면 추천'}</span>
              <strong>안전 수정 순서 보기</strong>
              <small>핸들 원위치부터 공간 만들기와 재진입 순서를 확인해요.</small>
              <i aria-hidden="true">›</i>
            </button>
          </div>
          <section className="judgment-skill-list" aria-labelledby="judgment-skill-list-title">
            <h3 id="judgment-skill-list-title">유형별 연습</h3>
            <div className="judgment-skill-grid">
              {drills.map((drill) => {
                const status = courseStatus(drill)
                const progress = courseProgress(drill)
                return (
                  <button
                    key={drill.id}
                    type="button"
                    className={`judgment-skill-card course-${drill.id}`}
                    aria-label={`${drill.title}, ${status.label}, ${drill.steps.length}단계 연습 시작`}
                    onClick={() => start(drill)}
                  >
                    <span className="skill-card-top">
                      <b className="skill-icon"><CourseIcon course={drill.id} /></b>
                      <span className={`skill-status ${status.tone}`}>{status.label}</span>
                    </span>
                    <strong>{drill.title}</strong>
                    <p>{drill.description}</p>
                    <span className="skill-card-footer">
                      <small>{progress ? `최근 ${progress.correct}/${progress.total} 정답 · ` : ''}{drill.steps.length}단계</small>
                      <span className="skill-progress" aria-hidden="true"><i style={{ width: `${progress ? progress.correct / progress.total * 100 : 0}%` }} /></span>
                      <b aria-hidden="true">›</b>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </section>
    )
  }

  if (phase === 'guide') {
    return (
      <section className="correction-practice">
        <div className="correction-progress">
          <span>예시</span>
          <strong>{guide.title}</strong>
          <progress value={0} max={1} />
        </div>
        <p className="page-description">간격을 회복하는 기본 순서를 확인한 뒤 연습할 수정 유형을 선택합니다.</p>
        <JudgmentGuide scenario={guide} runtime={runtime} onStart={() => setPhase('select')} buttonLabel="유형별 연습 고르기" />
      </section>
    )
  }

  const current = practiceItems[itemIndex]
  return (
    <section className="correction-practice">
      <div className="correction-progress">
        <span>{itemIndex + 1} / {practiceItems.length}</span>
        <strong>{current.drill.title} · {current.step.title}</strong>
        <progress value={itemIndex + 1} max={practiceItems.length} />
        {attempts.length > 0 && (
          <button
            type="button"
            className="previous-quiz-control"
            onClick={() => setReviewAttemptIndex(attempts.length - 1)}
          >
            이전 문제 보기
          </button>
        )}
      </div>
      <p className="page-description">{current.drill.description} 선택한 안전 동작의 결과가 다음 판단 단계로 이어집니다.</p>
      <JudgmentQuiz
        key={`${current.drill.id}-${current.step.id}`}
        scenario={current.step}
        runtime={runtime}
        questionNumber={itemIndex + 1}
        total={practiceItems.length}
        onComplete={complete}
      />
      {reviewAttemptIndex !== null && attempts[reviewAttemptIndex] && (
        <PreviousQuestionReview
          attempt={attempts[reviewAttemptIndex]}
          position={reviewAttemptIndex}
          total={attempts.length}
          runtime={runtime}
          onPrevious={() => setReviewAttemptIndex((index) => Math.max(0, (index ?? 0) - 1))}
          onNext={() => setReviewAttemptIndex((index) => Math.min(attempts.length - 1, (index ?? 0) + 1))}
          onClose={() => setReviewAttemptIndex(null)}
        />
      )}
    </section>
  )
}
