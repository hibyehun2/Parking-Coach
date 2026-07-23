import { useEffect, useMemo, useRef, useState } from 'react'
import { buildCollisionQuiz, type QuizAction } from '../engine/collisionQuiz'
import { resolveVehicleCollision } from '../engine/collisionDetection'
import { renderParkingLot } from '../engine/parkingLotRenderer'
import type { ReplayEvent } from '../engine/sessionReplay'
import { updateVehicle, type VehicleState } from '../engine/vehiclePhysics'
import type { ScenarioRuntime } from '../types/practice'

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
  steps,
}: {
  event: ReplayEvent
  runtime?: ScenarioRuntime
  step: number
  selected: number | null
  correct: boolean
  steps: ReturnType<typeof buildCollisionQuiz>
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
    const currentMotion = simulate({ ...impact, braking: false }, 2.6, runtime)
    const oppositeMotion = simulate({
      ...impact,
      steeringAngle: -impact.steeringAngle || (runtime?.startSide === 'right' ? .42 : -.42),
      braking: false,
    }, 2.6, runtime)
    const moreSteeringMotion = simulate({
      ...impact,
      steeringAngle: Math.sign(impact.steeringAngle || (runtime?.startSide === 'right' ? -1 : 1)) * .58,
      braking: false,
    }, 2.6, runtime)
    const recoveryGear = impact.gear === 'D' ? 'R' : 'D'
    const recovery = simulate({
      ...impact,
      gear: recoveryGear,
      steeringAngle: 0,
      braking: false,
    }, 3.2, runtime)
    const parkingSteering = runtime?.startSide === 'right' ? -.52 : .52
    const reentry = simulate({
      ...recovery.end,
      gear: 'R',
      steeringAngle: parkingSteering,
      braking: false,
    }, 4.2, runtime)
    const selectedAction: QuizAction | null = selected === null ? null : steps[step].choices[selected].id

    if (step === 0) {
      return {
        vehicle: impact,
        animationStates: selectedAction === 'continue' || selectedAction === 'steer-more' ? (selectedAction === 'continue' ? currentMotion.states : moreSteeringMotion.states) : [impact],
        paths: [{ points: currentMotion.points, color: '#ff5d52', dashed: true }],
        ghosts: selected !== null && !correct ? [{ vehicle: selectedAction === 'continue' ? currentMotion.end : moreSteeringMotion.end, color: '#ff5d52' }] : [],
      }
    }
    if (step === 1) {
      return {
        vehicle: impact,
        animationStates: selectedAction === 'forward-straight' || selectedAction === 'reverse-straight'
          ? recovery.states
          : selectedAction === 'continue'
            ? currentMotion.states
            : selectedAction === 'opposite-steering'
              ? oppositeMotion.states
              : [impact],
        paths: [
          { points: recovery.points, color: '#31d38b' },
          { points: currentMotion.points, color: '#ff5d52', dashed: true },
          { points: oppositeMotion.points, color: '#ffb340', dashed: true },
        ],
        ghosts: [
          { vehicle: recovery.end, color: '#31d38b' },
          ...(selectedAction === 'continue' ? [{ vehicle: currentMotion.end, color: '#ff5d52' }] : []),
          ...(selectedAction === 'opposite-steering' ? [{ vehicle: oppositeMotion.end, color: '#ffb340' }] : []),
        ],
      }
    }
    return {
      vehicle: recovery.end,
      animationStates: selectedAction === 'check-clearance' ? reentry.states : [recovery.end],
      paths: [{ points: reentry.points, color: '#31d38b' }],
      ghosts: [{ vehicle: impact, color: '#9ba7a2' }, ...(selectedAction === 'check-clearance' ? [{ vehicle: reentry.end, color: '#31d38b' }] : [])],
    }
  }, [correct, event, runtime, selected, step, steps])

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
        aria-label={`${steps[step].label}: 실제 연습 주차장 배치와 차량 진로를 표시한 탑뷰`}
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
  const steps = useMemo(() => buildCollisionQuiz(event), [event])
  const item = steps[step]
  const correct = selected !== null && item.choices[selected].id === item.answer

  const next = () => {
    setStep((current) => current + 1)
    setSelected(null)
  }

  return (
    <section className="collision-quiz" aria-labelledby="collision-quiz-title">
      <header><span>수정 주차 그림 퀴즈</span><h2 id="collision-quiz-title">실제 주차 장면에서 안전한 진로를 찾아보세요</h2></header>
      <div className="quiz-layout">
        <div className="quiz-figure">
          <QuizParkingCanvas key={`${step}-${selected}`} event={event} runtime={runtime} step={step} selected={selected} correct={correct} steps={steps} />
          <div className="quiz-legend">
            <span><i className="danger" />충돌 위험 진로</span>
            <span><i className="safe" />안전한 수정 진로</span>
            <span><i className="caution" />불안정한 수정 진로</span>
            <b>{step === 0 ? `${event.vehicle.gear} · 충돌 직전` : step === 1 ? '완전 정지 · 복구 진로 비교' : '안전거리 확보 · 재출발 확인'}</b>
          </div>
        </div>
        <div className="quiz-copy">
          <small>{step + 1} / {steps.length} · {item.label}</small>
          <strong>{item.question}</strong>
          <div className="quiz-choices">
            {item.choices.map((choice, index) => (
              <button key={choice.id} type="button" className={selected === index ? (correct ? 'correct' : 'wrong') : ''} onClick={() => setSelected(index)}>{choice.label}</button>
            ))}
          </div>
          {selected !== null && <p className={correct ? 'quiz-correct-copy' : 'quiz-wrong-copy'}>{correct ? '정답이에요. ' : '그 진로를 그림에서 다시 확인해보세요. '}{item.feedback}</p>}
          {correct && step < steps.length - 1 && <button type="button" className="quiz-next" onClick={next}>다음 장면</button>}
          {correct && step === steps.length - 1 && <strong className="quiz-complete">정지 → 방금 이동한 경로로 간격 회복 → 진행 방향과 양쪽 재확인 순서를 익혔어요.</strong>}
        </div>
      </div>
    </section>
  )
}
