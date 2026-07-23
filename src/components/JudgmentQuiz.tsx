import { useEffect, useMemo, useRef, useState } from 'react'
import { simulateJudgmentChoice, type JudgmentChoice, type JudgmentScenario } from '../engine/judgmentScenarios'
import { renderParkingLot } from '../engine/parkingLotRenderer'
import type { ScenarioRuntime } from '../types/practice'

export function JudgmentCanvas({
  scenario,
  choice,
  correct,
  runtime,
}: {
  scenario: JudgmentScenario
  choice: JudgmentChoice | null
  correct: boolean
  runtime: ScenarioRuntime
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState(0)
  const simulation = useMemo(
    () => choice ? simulateJudgmentChoice(scenario.vehicle, choice, runtime) : { states: [scenario.vehicle], points: [], collided: false },
    [choice, runtime, scenario],
  )

  useEffect(() => {
    if (!choice || simulation.states.length < 2) return
    const timer = window.setInterval(() => {
      setFrame((current) => {
        if (current >= simulation.states.length - 1) {
          window.clearInterval(timer)
          return current
        }
        return current + 1
      })
    }, 38)
    return () => window.clearInterval(timer)
  }, [choice, simulation.states.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(bounds.width))
      const height = Math.max(1, Math.round(bounds.height))
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const displayed = simulation.states[Math.min(frame, simulation.states.length - 1)] ?? scenario.vehicle
      renderParkingLot(context, width, height, displayed, {
        runtime,
        focus: { x: scenario.vehicle.x, y: scenario.vehicle.y, span: 14, heading: -Math.PI / 2 },
        candidatePaths: simulation.points.length > 1
          ? [{ points: simulation.points, color: correct ? '#31d38b' : '#ff6b62', dashed: !correct }]
          : undefined,
        ghostVehicles: simulation.states.length > 1
          ? [{ vehicle: simulation.states[simulation.states.length - 1], color: correct ? '#31d38b' : '#ff6b62' }]
          : undefined,
        highlightContactZone: scenario.focusZone ?? choice?.focusZone,
      })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [choice?.focusZone, correct, frame, runtime, scenario, simulation])

  return <canvas ref={canvasRef} role="img" aria-label={`${scenario.title} 상황의 차량 위치와 선택 결과`} />
}

export function JudgmentGuide({
  scenario,
  runtime,
  onStart,
}: {
  scenario: JudgmentScenario
  runtime: ScenarioRuntime
  onStart: () => void
}) {
  const answer = scenario.choices[0]
  return (
    <section className="collision-quiz judgment-quiz judgment-guide" aria-labelledby="judgment-guide-title">
      <header><span>안내 예시</span><h2 id="judgment-guide-title">{scenario.situation}</h2></header>
      <div className="quiz-layout">
        <div className="quiz-figure">
          <JudgmentCanvas scenario={scenario} choice={answer} correct runtime={runtime} />
          <div className="quiz-legend"><span><i className="safe" />안전거리 회복 경로</span><b>{scenario.takeaway}</b></div>
        </div>
        <div className="quiz-copy">
          <small>먼저 정답 이동을 확인하세요</small>
          <strong>{scenario.question}</strong>
          <div className="guided-action">
            <b>{answer.label}</b>
            {answer.steps && <ol>{answer.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
            <p>{answer.feedback}</p>
          </div>
          <button type="button" className="quiz-next" onClick={onStart}>수정 주차 연습 시작</button>
        </div>
      </div>
    </section>
  )
}

export function JudgmentQuiz({
  scenario,
  runtime,
  questionNumber,
  total,
  onComplete,
}: {
  scenario: JudgmentScenario
  runtime: ScenarioRuntime
  questionNumber: number
  total: number
  onComplete: (firstTryCorrect: boolean, answer: JudgmentChoice, firstChoice: JudgmentChoice) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [firstTryCorrect, setFirstTryCorrect] = useState(false)
  const [firstSelectedId, setFirstSelectedId] = useState<string | null>(null)
  const selected = scenario.choices.find((choice) => choice.id === selectedId) ?? null
  const correct = selectedId === scenario.answer

  const select = (choice: JudgmentChoice) => {
    if (correct) return
    if (!attempted) {
      setAttempted(true)
      setFirstTryCorrect(choice.id === scenario.answer)
      setFirstSelectedId(choice.id)
    }
    setSelectedId(choice.id)
  }

  return (
    <section className="collision-quiz judgment-quiz" aria-labelledby="judgment-question">
      <header>
        <span>{questionNumber} / {total} · {scenario.title}</span>
        <h2 id="judgment-question">{scenario.situation}</h2>
      </header>
      <div className="quiz-layout">
        <div className="quiz-figure">
          <JudgmentCanvas key={selectedId ?? 'idle'} scenario={scenario} choice={selected} correct={correct} runtime={runtime} />
          <div className="quiz-legend">
            <span><i className="danger" />{scenario.focusZone ? '빨간 원 · 먼저 확인할 모서리' : '위험한 선택 결과'}</span>
            <span><i className="safe" />안전한 선택 결과</span>
            <b>{scenario.takeaway}</b>
          </div>
        </div>
        <div className="quiz-copy">
          <small>판단 유형 · {scenario.title}</small>
          <strong>{scenario.question}</strong>
          <div className="quiz-choices">
            {scenario.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={selectedId === choice.id ? (correct ? 'correct' : 'wrong') : ''}
                onClick={() => select(choice)}
              >
                <span className="choice-title">{choice.label}</span>
                {choice.steps && <span className="choice-steps">
                  {choice.steps.map((step, index) => <span key={step}><b>{index + 1}</b>{step}</span>)}
                </span>}
              </button>
            ))}
          </div>
          {selected && <p className={correct ? 'quiz-correct-copy' : 'quiz-wrong-copy'}>{selected.feedback}</p>}
          {correct && selected && <button type="button" className="quiz-next" onClick={() => onComplete(
            firstTryCorrect,
            selected,
            scenario.choices.find((choice) => choice.id === firstSelectedId) ?? selected,
          )}>
            {questionNumber === total ? '훈련 결과 보기' : '다음 판단 문제'}
          </button>}
        </div>
      </div>
    </section>
  )
}
