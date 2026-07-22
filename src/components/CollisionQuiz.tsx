import { useState } from 'react'
import type { ReplayEvent } from '../engine/sessionReplay'

const STEPS = [
  {
    question: '차량이 닿을 것 같을 때 가장 먼저 할 행동은?',
    choices: ['그대로 아주 천천히 후진', '브레이크로 완전히 정지', '핸들을 더 많이 돌리기'],
    answer: 1,
    feedback: '먼저 완전히 멈춰야 주변 간격과 수정 방향을 안전하게 판단할 수 있어요.',
  },
  {
    question: '좁아진 간격을 다시 만들려면?',
    choices: ['핸들을 중앙으로 풀고 짧게 전진', '후진하며 핸들을 반대로 돌리기', '차량이 있는 쪽으로 더 붙이기'],
    answer: 0,
    feedback: '정지 후 핸들을 중앙으로 풀고 짧게 전진하면 차체가 옆으로 더 밀리는 것을 줄일 수 있어요.',
  },
  {
    question: '다시 후진하기 전 확인할 것은?',
    choices: ['후방 화면 한쪽만 확인', '양쪽 간격과 수정된 진입각 확인', '핸들이 최대 조향인지 확인'],
    answer: 1,
    feedback: '양쪽 간격이 확보됐는지 확인한 뒤 주차 방향으로 다시 조향해 천천히 후진하세요.',
  },
] as const

export function CollisionQuiz({ event }: { event: ReplayEvent }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const item = STEPS[step]
  const impactVehicle = event.impactVehicle ?? event.vehicle
  const correct = selected === item.answer
  const isWall = event.collision?.kind === 'wall'
  const hitLeft = event.collision?.contactZone?.includes('left')
    ?? event.collision?.obstacleId.includes('left')
    ?? false

  return (
    <section className="collision-quiz" aria-labelledby="collision-quiz-title">
      <header><span>수정 주차 그림 퀴즈</span><h2 id="collision-quiz-title">충돌 전에 어떻게 고칠까요?</h2></header>
      <div className="quiz-layout">
        <svg viewBox="0 0 300 220" role="img" aria-label="충돌 직전 차량과 장애물의 위치를 단순화한 탑뷰">
          <rect className="quiz-road" width="300" height="220" rx="18" />
          <path className="quiz-lines" d="M90 218V45H210V218M150 45V218" />
          {isWall ? (
            <rect className="quiz-wall" x={hitLeft ? 72 : 216} y="42" width="12" height="176" rx="3" />
          ) : (
            <rect className="quiz-obstacle" x={hitLeft ? 94 : 170} y="105" width="36" height="92" rx="8" />
          )}
          <g className="quiz-car" transform={`translate(150 104) rotate(${impactVehicle.steeringAngle * 38})`}>
            <rect x="-23" y="-45" width="46" height="90" rx="11" />
            <rect className="quiz-glass" x="-17" y="-21" width="34" height="45" rx="7" />
          </g>
          <circle className="quiz-impact" cx={hitLeft ? 127 : 173} cy="125" r="13" />
          {selected !== null && <>
            <path className="quiz-wrong-path" d="M150 150Q150 175 145 204" />
            {correct && <path className="quiz-correction-path" d="M150 150Q150 120 150 86" />}
          </>}
        </svg>
        <div className="quiz-copy">
          <small>{step + 1} / {STEPS.length}</small>
          <strong>{item.question}</strong>
          <div className="quiz-choices">
            {item.choices.map((choice, index) => (
              <button key={choice} type="button" className={selected === index ? (correct ? 'correct' : 'wrong') : ''} onClick={() => setSelected(index)}>{choice}</button>
            ))}
          </div>
          {selected !== null && <p className={correct ? 'quiz-correct-copy' : 'quiz-wrong-copy'}>{correct ? '정답이에요. ' : '다시 생각해보세요. '}{item.feedback}</p>}
          {correct && step < STEPS.length - 1 && <button type="button" className="quiz-next" onClick={() => { setStep(step + 1); setSelected(null) }}>다음 문제</button>}
          {correct && step === STEPS.length - 1 && <strong className="quiz-complete">정지 → 중앙 복귀 → 짧은 전진 → 재확인 순서를 익혔어요.</strong>}
        </div>
      </div>
    </section>
  )
}
