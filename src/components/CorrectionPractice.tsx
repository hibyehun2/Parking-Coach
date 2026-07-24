import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildCorrectionDrills, type CorrectionDrill } from '../engine/correctionDrills'
import {
  JUDGMENT_SKILL_INFO,
  buildJudgmentGuide,
  type JudgmentChoice,
  type JudgmentScenario,
  type JudgmentSkill,
} from '../engine/judgmentScenarios'
import {
  loadPracticeHistory,
  recordCorrectionSession,
  type CorrectionAttempt,
} from '../engine/practiceHistory'
import type { ScenarioRuntime } from '../types/practice'
import { JudgmentGuide, JudgmentQuiz } from './JudgmentQuiz'

type PracticeItem = {
  drill: CorrectionDrill
  step: JudgmentScenario
}

function SkillIcon({ skill }: { skill: JudgmentSkill }) {
  const paths: Record<JudgmentSkill, React.ReactNode> = {
    'hazard-prediction': <><path d="M2.5 10s2.8-4.5 7.5-4.5 7.5 4.5 7.5 4.5-2.8 4.5-7.5 4.5S2.5 10 2.5 10Z" /><circle cx="10" cy="10" r="2.2" /></>,
    'stop-timing': <><path d="M6 3.5h8l2.5 2.5v8L14 16.5H6L3.5 14V6Z" /><path d="M8 7v6M12 7v6" /></>,
    'correction-space': <><path d="M3 10h14M3 10l3-3M3 10l3 3M17 10l-3-3M17 10l-3 3" /></>,
    'first-correction': <><path d="M4 15c0-6 3-10 9-10h3" /><path d="m13 2 3 3-3 3" /><path d="M5 15h4" /></>,
    recheck: <><circle cx="10" cy="10" r="7" /><path d="m6.5 10 2.2 2.2 4.8-5" /></>,
    'reentry-decision': <><path d="M16 6H9a5 5 0 0 0-5 5v4" /><path d="m7 12-3 3-3-3" /><path d="M12 10h4v5h-4z" /></>,
  }
  return <svg viewBox="0 0 20 20" aria-hidden="true">{paths[skill]}</svg>
}

function allItems(drills: CorrectionDrill[]): PracticeItem[] {
  return drills.flatMap((drill) => drill.steps.map((step) => ({ drill, step })))
}

export function CorrectionPractice({ runtime }: { runtime: ScenarioRuntime }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'select' | 'guide' | 'practice'>('select')
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([])
  const [itemIndex, setItemIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState<CorrectionAttempt[]>([])
  const guide = useMemo(() => buildJudgmentGuide(runtime), [runtime])
  const drills = useMemo(() => buildCorrectionDrills(runtime), [runtime])
  const items = useMemo(() => allItems(drills), [drills])
  const history = useMemo(() => loadPracticeHistory(), [])
  const availableSkills = useMemo(
    () => Object.keys(JUDGMENT_SKILL_INFO)
      .filter((skill): skill is JudgmentSkill => items.some((item) => item.step.skill === skill)),
    [items],
  )
  const pastAttempts = useMemo(
    () => history.sessions
      .filter((session) => session.mode === 'practice' && session.scenarioId === runtime.scenarioId)
      .flatMap((session) => session.correctionAttempts ?? []),
    [history.sessions, runtime.scenarioId],
  )
  const skillStatus = (skill: JudgmentSkill) => {
    const matching = pastAttempts.filter((attempt) => attempt.skill === skill)
    if (!matching.length) return { label: '처음', tone: 'new' }
    const recent = matching.slice(0, 10)
    const correct = recent.filter((attempt) => attempt.firstTryCorrect).length
    if (correct / recent.length < .7) return { label: '복습 추천', tone: 'review' }
    if (recent.length >= 3 && correct / recent.length >= .8) return { label: '안정적', tone: 'steady' }
    return { label: '연습 완료', tone: 'complete' }
  }
  const skillProgress = (skill: JudgmentSkill) => {
    const recent = pastAttempts.filter((attempt) => attempt.skill === skill).slice(0, 3)
    if (!recent.length) return null
    return {
      correct: recent.filter((attempt) => attempt.firstTryCorrect).length,
      total: recent.length,
    }
  }
  const recommendedSkills = useMemo(() => {
    const priority = [...availableSkills].sort((left, right) => {
      const rank = (skill: JudgmentSkill) => {
        const status = skillStatus(skill).tone
        return status === 'review' ? 0 : status === 'new' ? 1 : status === 'complete' ? 2 : 3
      }
      return rank(left) - rank(right)
    })
    return priority.slice(0, Math.min(3, priority.length))
  // pastAttempts is intentionally part of the recommendation input.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSkills, pastAttempts])

  const start = (skills: JudgmentSkill[], recommended = false) => {
    const matching = items.filter((item) => skills.includes(item.step.skill))
    const chosen = recommended ? matching.slice(0, 6) : matching
    if (!chosen.length) return
    setPracticeItems(chosen)
    setItemIndex(0)
    setScore(0)
    setAttempts([])
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
          <div><span>판단 연습</span><h2 id="judgment-skill-title">어떤 판단을 연습할까요?</h2></div>
          <p>추천 구성을 시작하거나, 필요한 판단 하나를 골라 집중해서 연습해요.</p>
        </header>
        <div className="judgment-picker-options">
          <div className="judgment-picker-lead">
            <button type="button" className="recommended-practice" onClick={() => start(recommendedSkills, true)}>
              <span>오늘의 추천 · 최대 6문제</span>
              <strong>필요한 판단부터 이어서 연습해요</strong>
              <small>{recommendedSkills.map((skill) => JUDGMENT_SKILL_INFO[skill].title).join(' · ')}</small>
              <b>바로 시작 <span aria-hidden="true">→</span></b>
            </button>
            <button type="button" className="judgment-example-card" onClick={showGuide}>
              <span>{pastAttempts.length ? '필요할 때 다시 보기' : '처음이라면 추천'}</span>
              <strong>안전 수정 예시 보기</strong>
              <small>위험할 때 멈추고 공간을 회복하는 과정을 확인해요.</small>
              <i aria-hidden="true">›</i>
            </button>
          </div>
          <section className="judgment-skill-list" aria-labelledby="judgment-skill-list-title">
            <h3 id="judgment-skill-list-title">판단 유형별 연습</h3>
            <div className="judgment-skill-grid">
              {availableSkills.map((skill) => {
                const info = JUDGMENT_SKILL_INFO[skill]
                const status = skillStatus(skill)
                const progress = skillProgress(skill)
                const count = items.filter((item) => item.step.skill === skill).length
                return (
                  <button
                    key={skill}
                    type="button"
                    className={`judgment-skill-card skill-${skill}`}
                    aria-label={`${info.title}, ${status.label}, ${count}문제 연습 시작`}
                    onClick={() => start([skill])}
                  >
                    <span className="skill-card-top">
                      <b className="skill-icon"><SkillIcon skill={skill} /></b>
                      <span className={`skill-status ${status.tone}`}>{status.label}</span>
                    </span>
                    <strong>{info.title}</strong>
                    <p>{info.description}</p>
                    <span className="skill-card-footer">
                      <small>{progress ? `최근 ${progress.correct}/${progress.total} 정답 · ` : ''}{count}문제</small>
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
        <p className="page-description">안전하게 자세를 바로잡는 과정을 확인한 뒤 연습할 판단 유형을 선택합니다.</p>
        <JudgmentGuide scenario={guide} runtime={runtime} onStart={() => setPhase('select')} buttonLabel="판단 유형 고르기" />
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
    </section>
  )
}
