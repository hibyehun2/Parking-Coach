import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveVehicleCollision } from '../engine/collisionDetection'
import { renderParkingLot } from '../engine/parkingLotRenderer'
import type { ReplayEvent } from '../engine/sessionReplay'
import { updateVehicle, type VehicleState } from '../engine/vehiclePhysics'
import type { ScenarioRuntime } from '../types/practice'

const STEPS = [
  {
    label: '위험 발견',
    question: '빨간 원으로 표시된 모서리가 가까워질 때 가장 먼저 할 행동은?',
    choices: ['그대로 아주 천천히 후진', '브레이크로 완전히 정지', '핸들을 더 많이 돌리기'],
    answer: 1,
    feedback: '먼저 완전히 멈춰야 가까운 모서리와 반대쪽 간격을 안전하게 판단할 수 있어요.',
  },
  {
    label: '수정 진로 선택',
    question: '어느 진로가 가까워진 모서리의 간격을 안전하게 다시 만들까요?',
    choices: ['녹색: 핸들 중앙 후 짧게 전진', '빨간색: 현재 조향으로 계속 후진', '주황색: 후진하며 반대 조향'],
    answer: 0,
    feedback: '녹색 진로처럼 정지 후 핸들을 중앙으로 풀고 짧게 전진하면 가까워진 모서리의 간격을 확보할 수 있어요.',
  },
  {
    label: '재진입 확인',
    question: '짧게 전진한 뒤 녹색 후진 진로로 들어가기 전에 무엇을 확인해야 할까요?',
    choices: ['후방 화면 한쪽만 확인', '양쪽 간격과 수정된 차체 각도 확인', '무조건 최대 조향인지 확인'],
    answer: 1,
    feedback: '양쪽 간격이 확보됐는지 확인한 뒤 주차 공간 방향으로 조향해 천천히 후진하세요.',
  },
] as const

type PreviewPath = {
  points: { x: number; y: number }[]
  states: VehicleState[]
  end: VehicleState
}

function simulate(start: VehicleState, seconds: number, runtime?: ScenarioRuntime): PreviewPath {
  let vehicle = { ...start, speed: 0, braking: false }
  const points = [{ x: vehicle.x, y: vehicle.y }]
  const states = [{ ...vehicle }]
  const steps = Math.ceil(seconds / .1)
  for (let index = 0; index < steps; index += 1) {
    const next = updateVehicle(vehicle, { steeringDirection: 0, braking: false }, .1)
    const resolved = resolveVehicleCollision(vehicle, next, runtime)
    vehicle = resolved.vehicle
    points.push({ x: vehicle.x, y: vehicle.y })
    states.push({ ...vehicle })
    if (resolved.collision) break
  }
  return { points, states, end: { ...vehicle, speed: 0, braking: true } }
}

function QuizParkingCanvas({
  event,
  runtime,
  step,
  selected,
  correct,
}: {
  event: ReplayEvent
  runtime?: ScenarioRuntime
  step: number
  selected: number | null
  correct: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playbackFrame, setPlaybackFrame] = useState(0)
  const [playbackKey, setPlaybackKey] = useState(0)
  const scene = useMemo(() => {
    const impact = {
      ...(event.impactVehicle ?? event.vehicle),
      speed: 0,
      braking: true,
    }
    const currentReverse = simulate({ ...impact, gear: 'R', braking: false }, 2.6, runtime)
    const oppositeReverse = simulate({
      ...impact,
      gear: 'R',
      steeringAngle: -impact.steeringAngle || (runtime?.startSide === 'right' ? .42 : -.42),
      braking: false,
    }, 2.6, runtime)
    const correction = simulate({
      ...impact,
      gear: 'D',
      steeringAngle: 0,
      braking: false,
    }, 3.2, runtime)
    const parkingSteering = runtime?.startSide === 'right' ? -.52 : .52
    const reentry = simulate({
      ...correction.end,
      gear: 'R',
      steeringAngle: parkingSteering,
      braking: false,
    }, 4.2, runtime)

    if (step === 0) {
      return {
        vehicle: impact,
        animationStates: selected === 0 ? currentReverse.states : [impact],
        paths: [{ points: currentReverse.points, color: '#ff5d52', dashed: true }],
        ghosts: selected !== null && !correct ? [{ vehicle: currentReverse.end, color: '#ff5d52' }] : [],
      }
    }
    if (step === 1) {
      return {
        vehicle: impact,
        animationStates: selected === 0 ? correction.states : selected === 1 ? currentReverse.states : selected === 2 ? oppositeReverse.states : [impact],
        paths: [
          { points: correction.points, color: '#31d38b' },
          { points: currentReverse.points, color: '#ff5d52', dashed: true },
          { points: oppositeReverse.points, color: '#ffb340', dashed: true },
        ],
        ghosts: [
          { vehicle: correction.end, color: '#31d38b' },
          ...(selected === 1 ? [{ vehicle: currentReverse.end, color: '#ff5d52' }] : []),
          ...(selected === 2 ? [{ vehicle: oppositeReverse.end, color: '#ffb340' }] : []),
        ],
      }
    }
    return {
      vehicle: correction.end,
      animationStates: selected === 1 ? reentry.states : [correction.end],
      paths: [{ points: reentry.points, color: '#31d38b' }],
      ghosts: [{ vehicle: impact, color: '#9ba7a2' }, { vehicle: reentry.end, color: '#31d38b' }],
    }
  }, [correct, event, runtime, selected, step])

  useEffect(() => {
    if (selected === null || scene.animationStates.length < 2) return
    const timer = window.setInterval(() => {
      setPlaybackFrame((current) => {
        if (current >= scene.animationStates.length - 1) {
          window.clearInterval(timer)
          return current
        }
        return current + 1
      })
    }, 45)
    return () => window.clearInterval(timer)
  }, [playbackKey, scene.animationStates, selected])

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
      const displayedVehicle = scene.animationStates[Math.min(playbackFrame, scene.animationStates.length - 1)] ?? scene.vehicle
      const allPoints = scene.paths.flatMap((path) => path.points)
      const xs = [displayedVehicle.x, ...allPoints.map((point) => point.x)]
      const ys = [displayedVehicle.y, ...allPoints.map((point) => point.y)]
      const minimumX = Math.min(...xs)
      const maximumX = Math.max(...xs)
      const minimumY = Math.min(...ys)
      const maximumY = Math.max(...ys)
      const span = Math.min(18, Math.max(10, maximumX - minimumX + 5, (maximumY - minimumY) / .75 + 5))
      renderParkingLot(context, width, height, displayedVehicle, {
        runtime,
        focus: {
          x: (minimumX + maximumX) / 2,
          y: (minimumY + maximumY) / 2,
          span,
          heading: -Math.PI / 2,
        },
        candidatePaths: scene.paths,
        ghostVehicles: scene.ghosts,
        highlightContactZone: step < 2 ? event.collision?.contactZone : undefined,
      })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [event.collision?.contactZone, playbackFrame, runtime, scene, step])

  return (
    <>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${STEPS[step].label}: 실제 연습 주차장 배치와 차량 진로를 표시한 탑뷰`}
      />
      {selected !== null && scene.animationStates.length > 1 && (
        <button type="button" className="quiz-replay-result" onClick={() => { setPlaybackFrame(0); setPlaybackKey((value) => value + 1) }}>선택 결과 다시 보기</button>
      )}
    </>
  )
}

export function CollisionQuiz({ event, runtime }: { event: ReplayEvent; runtime?: ScenarioRuntime }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const item = STEPS[step]
  const correct = selected === item.answer

  const next = () => {
    setStep((current) => current + 1)
    setSelected(null)
  }

  return (
    <section className="collision-quiz" aria-labelledby="collision-quiz-title">
      <header><span>수정 주차 그림 퀴즈</span><h2 id="collision-quiz-title">실제 주차 장면에서 안전한 진로를 찾아보세요</h2></header>
      <div className="quiz-layout">
        <div className="quiz-figure">
          <QuizParkingCanvas key={`${step}-${selected}`} event={event} runtime={runtime} step={step} selected={selected} correct={correct} />
          <div className="quiz-legend">
            <span><i className="danger" />충돌 위험 진로</span>
            <span><i className="safe" />안전한 수정 진로</span>
            <span><i className="caution" />불안정한 수정 진로</span>
            <b>{step === 0 ? 'R · 충돌 직전' : step === 1 ? '완전 정지 · 진로 비교' : '짧은 전진 완료 · 재진입 확인'}</b>
          </div>
        </div>
        <div className="quiz-copy">
          <small>{step + 1} / {STEPS.length} · {item.label}</small>
          <strong>{item.question}</strong>
          <div className="quiz-choices">
            {item.choices.map((choice, index) => (
              <button key={choice} type="button" className={selected === index ? (correct ? 'correct' : 'wrong') : ''} onClick={() => setSelected(index)}>{choice}</button>
            ))}
          </div>
          {selected !== null && <p className={correct ? 'quiz-correct-copy' : 'quiz-wrong-copy'}>{correct ? '정답이에요. ' : '그 진로를 그림에서 다시 확인해보세요. '}{item.feedback}</p>}
          {correct && step < STEPS.length - 1 && <button type="button" className="quiz-next" onClick={next}>다음 장면</button>}
          {correct && step === STEPS.length - 1 && <strong className="quiz-complete">정지 → 진로 비교 → 짧은 전진 → 양쪽 재확인 순서를 익혔어요.</strong>}
        </div>
      </div>
    </section>
  )
}
