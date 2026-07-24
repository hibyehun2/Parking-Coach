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

function allItems(drills: CorrectionDrill[]): PracticeItem[] {
  return drills.flatMap((drill) => drill.steps.map((step) => ({ drill, step })))
}

export function CorrectionPractice({ runtime }: { runtime: ScenarioRuntime }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'select' | 'guide' | 'practice'>('select')
  const [selectedSkills, setSelectedSkills] = useState<JudgmentSkill[]>([])
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
    if (correct / recent.length < .7) return { label: '다시 보면 좋아요', tone: 'review' }
    if (recent.length >= 3 && correct / recent.length >= .8) return { label: '안정적이에요', tone: 'steady' }
    return { label: '연습 완료', tone: 'complete' }
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
    setPhase('guide')
  }

  const toggleSkill = (skill: JudgmentSkill) => {
    setSelectedSkills((current) => current.includes(skill)
      ? current.filter((item) => item !== skill)
      : [...current, skill])
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
          <p>추천 구성을 바로 시작하거나, 필요한 판단을 골라 다시 연습할 수 있습니다.</p>
        </header>
        <button type="button" className="recommended-practice" onClick={() => start(recommendedSkills, true)}>
          <span>추천 연습 · 최대 6문제</span>
          <strong>처음이거나 다시 볼 판단부터 시작</strong>
          <small>{recommendedSkills.map((skill) => JUDGMENT_SKILL_INFO[skill].title).join(' · ')}</small>
        </button>
        <div className="judgment-skill-grid">
          {availableSkills.map((skill) => {
            const info = JUDGMENT_SKILL_INFO[skill]
            const status = skillStatus(skill)
            const selected = selectedSkills.includes(skill)
            const count = items.filter((item) => item.step.skill === skill).length
            return (
              <button
                key={skill}
                type="button"
                className={`judgment-skill-card${selected ? ' selected' : ''}`}
                aria-pressed={selected}
                onClick={() => toggleSkill(skill)}
              >
                <span className={`skill-status ${status.tone}`}>{status.label}</span>
                <strong>{info.title}</strong>
                <p>{info.description}</p>
                <small>{count}문제 · {selected ? '선택됨' : '선택하기'}</small>
              </button>
            )
          })}
        </div>
        <footer>
          <span>{selectedSkills.length
            ? `${selectedSkills.length}개 판단 · ${items.filter((item) => selectedSkills.includes(item.step.skill)).length}문제`
            : '하나 이상의 판단을 선택하세요.'}</span>
          <button
            type="button"
            className="primary-button"
            disabled={!selectedSkills.length}
            onClick={() => start(selectedSkills)}
          >
            선택한 판단 연습하기
          </button>
        </footer>
      </section>
    )
  }

  if (phase === 'guide') {
    return (
      <section className="correction-practice">
        <div className="correction-progress">
          <span>예시</span>
          <strong>{guide.title}</strong>
          <progress value={0} max={practiceItems.length} />
        </div>
        <p className="page-description">안전하게 자세를 바로잡는 예시를 먼저 본 뒤 선택한 판단 연습을 시작합니다.</p>
        <JudgmentGuide scenario={guide} runtime={runtime} onStart={() => setPhase('practice')} />
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
