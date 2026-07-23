import { useState } from 'react'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { ScenarioRuntime } from '../types/practice'

const STEPS = [
  {
    label: '위험 발견',
    question: '빨간색으로 표시된 모서리의 간격이 더 좁아질 때 가장 먼저 할 행동은?',
    choices: ['그대로 아주 천천히 후진', '브레이크로 완전히 정지', '핸들을 더 많이 돌리기'],
    answer: 1,
    feedback: '먼저 완전히 멈춰야 가까운 모서리와 반대쪽 간격을 안전하게 판단할 수 있어요.',
  },
  {
    label: '공간 확보',
    question: '정지한 차량이 녹색 방향으로 안전하게 간격을 다시 만들려면?',
    choices: ['핸들을 중앙으로 풀고 짧게 전진', '후진하며 핸들을 반대로 돌리기', '장애물이 있는 쪽으로 더 붙이기'],
    answer: 0,
    feedback: '정지 후 핸들을 중앙으로 풀고 짧게 전진하면 가까워진 모서리의 간격을 다시 확보할 수 있어요.',
  },
  {
    label: '재진입 확인',
    question: '짧게 전진한 뒤 다시 R로 바꾸기 전에 그림에서 확인할 것은?',
    choices: ['후방 화면 한쪽만 확인', '양쪽 간격과 수정된 차체 각도 확인', '무조건 최대 조향인지 확인'],
    answer: 1,
    feedback: '양쪽 간격이 확보됐는지 확인한 뒤 주차 공간 방향으로 조향해 천천히 후진하세요.',
  },
] as const

const SCALE = 13

function degrees(radians: number) {
  return radians * 180 / Math.PI
}

function contactCorner(zone: string | undefined) {
  return {
    x: zone?.includes('left') ? -15 : 15,
    y: zone?.includes('front') ? -37 : 37,
  }
}

export function CollisionQuiz({ event, runtime }: { event: ReplayEvent; runtime?: ScenarioRuntime }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const item = STEPS[step]
  const impactVehicle = event.impactVehicle ?? event.vehicle
  const correct = selected === item.answer
  const collision = event.collision
  const corner = contactCorner(collision?.contactZone)
  const heading = impactVehicle.heading
  const forwardDistance = step === 2 ? 28 : 0
  const carX = 150 + Math.cos(heading) * forwardDistance
  const carY = 112 + Math.sin(heading) * forwardDistance
  const vehicleObstacle = runtime?.parkedVehicles.find(({ id }) => id === collision?.obstacleId)
  const wallObstacle = runtime?.walls.find(({ id }) => id === collision?.obstacleId)
  const obstacleX = vehicleObstacle ? 150 + (vehicleObstacle.x - impactVehicle.x) * SCALE : undefined
  const obstacleY = vehicleObstacle ? 112 + (vehicleObstacle.y - impactVehicle.y) * SCALE : undefined
  const hitLeft = collision?.contactZone?.includes('left') ?? collision?.obstacleId.includes('left') ?? false
  const fallbackObstacleX = hitLeft ? 91 : 184
  const wallIsVertical = wallObstacle ? wallObstacle.height >= wallObstacle.width : true
  const wallCenterX = wallObstacle ? 150 + (wallObstacle.x + wallObstacle.width / 2 - impactVehicle.x) * SCALE : (hitLeft ? 78 : 222)
  const wallCenterY = wallObstacle ? 112 + (wallObstacle.y + wallObstacle.height / 2 - impactVehicle.y) * SCALE : 130

  const next = () => {
    setStep((current) => current + 1)
    setSelected(null)
  }

  return (
    <section className="collision-quiz" aria-labelledby="collision-quiz-title">
      <header><span>수정 주차 그림 퀴즈</span><h2 id="collision-quiz-title">충돌 전에 어떻게 고칠까요?</h2></header>
      <div className="quiz-layout">
        <div className="quiz-figure">
          <svg viewBox="0 0 300 220" role="img" aria-label={`${item.label}: 충돌 직전 차량과 장애물, 이동 방향을 표시한 탑뷰`}>
            <defs>
              <marker id="quiz-arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" /></marker>
              <marker id="quiz-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" /></marker>
            </defs>
            <rect className="quiz-road" width="300" height="220" rx="18" />
            <path className="quiz-lines" d="M90 218V45H210V218M150 45V218" />
            {collision?.kind === 'wall' ? (
              wallIsVertical
                ? <rect className="quiz-wall" x={Math.max(8, Math.min(280, wallCenterX - 6))} y="24" width="12" height="192" rx="3" />
                : <rect className="quiz-wall" x="8" y={Math.max(8, Math.min(200, wallCenterY - 6))} width="284" height="12" rx="3" />
            ) : (
              <g className="quiz-obstacle-car" transform={`translate(${obstacleX ?? fallbackObstacleX} ${obstacleY ?? 142}) rotate(${degrees(vehicleObstacle?.heading ?? -Math.PI / 2) + 90})`}>
                <rect className="quiz-obstacle" x="-15" y="-37" width="30" height="74" rx="7" />
                <path d="M-11-20H11M-11 20H11" />
              </g>
            )}

            {step === 0 && <path className="quiz-reverse-path" d={`M${carX - Math.cos(heading) * 5} ${carY - Math.sin(heading) * 5}L${carX - Math.cos(heading) * 38} ${carY - Math.sin(heading) * 38}`} markerEnd="url(#quiz-arrow-red)" />}
            {step === 1 && <path className="quiz-correction-path" d={`M${carX} ${carY}L${carX + Math.cos(heading) * 42} ${carY + Math.sin(heading) * 42}`} markerEnd="url(#quiz-arrow-green)" />}
            {step === 2 && <>
              <line className="quiz-clearance" x1={carX - 52} y1={carY} x2={carX - 25} y2={carY} />
              <line className="quiz-clearance" x1={carX + 25} y1={carY} x2={carX + 52} y2={carY} />
            </>}

            <g className="quiz-car" transform={`translate(${carX} ${carY}) rotate(${degrees(heading) + 90})`}>
              <rect x="-17" y="-42" width="34" height="84" rx="9" />
              <rect className="quiz-glass" x="-12" y="-22" width="24" height="38" rx="6" />
              <path className="quiz-car-front" d="M-10-31H10" />
              {step < 2 && <circle className="quiz-impact" cx={corner.x} cy={corner.y} r="10" />}
            </g>

            {selected !== null && !correct && <path className="quiz-wrong-path" d={`M${carX} ${carY}Q${carX - 5} ${carY + 28} ${carX - 12} ${carY + 58}`} markerEnd="url(#quiz-arrow-red)" />}
          </svg>
          <div className="quiz-legend"><span><i className="danger" />충돌 위험</span><span><i className="safe" />안전한 수정 방향</span><b>{step === 0 ? 'R · 후진 중' : step === 1 ? '정지 · 핸들 중앙' : 'D 전진 완료 · 양쪽 재확인'}</b></div>
        </div>
        <div className="quiz-copy">
          <small>{step + 1} / {STEPS.length} · {item.label}</small>
          <strong>{item.question}</strong>
          <div className="quiz-choices">
            {item.choices.map((choice, index) => (
              <button key={choice} type="button" className={selected === index ? (correct ? 'correct' : 'wrong') : ''} onClick={() => setSelected(index)}>{choice}</button>
            ))}
          </div>
          {selected !== null && <p className={correct ? 'quiz-correct-copy' : 'quiz-wrong-copy'}>{correct ? '정답이에요. ' : '다시 생각해보세요. '}{item.feedback}</p>}
          {correct && step < STEPS.length - 1 && <button type="button" className="quiz-next" onClick={next}>다음 장면</button>}
          {correct && step === STEPS.length - 1 && <strong className="quiz-complete">정지 → 중앙 복귀 → 짧은 전진 → 양쪽 재확인 순서를 익혔어요.</strong>}
        </div>
      </div>
    </section>
  )
}
