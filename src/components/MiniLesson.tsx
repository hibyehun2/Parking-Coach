import { useState } from 'react'
import { LESSON_TRAJECTORIES, lessonDuration, type MiniLesson } from '../data/lessons'
import type { ScenarioRuntime } from '../types/practice'
import { LessonParkingCanvas } from './LessonParkingCanvas'

type MiniLessonProps = {
  lesson: MiniLesson
  runtime: ScenarioRuntime
  onFinish: () => void
}

export const ALWAYS_SKIP_LESSONS_KEY = 'parking-coach:always-skip-lessons'
export const SEEN_LESSONS_KEY = 'parking-coach:seen-lessons'

export function MiniLessonView({ lesson, runtime, onFinish }: MiniLessonProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [alwaysSkip, setAlwaysSkip] = useState(
    () => localStorage.getItem(ALWAYS_SKIP_LESSONS_KEY) === 'true',
  )
  const step = lesson.steps[stepIndex]
  const isCorrectionLesson = lesson.scenarioId === 'tight-entry' || lesson.scenarioId === 'narrow-aisle'
  const mirrored = runtime.startSide === 'right' || (isCorrectionLesson && runtime.variant === 'right')
  const obstacleSide = runtime.variant === 'right' ? 'right' : 'left'
  const sceneObstacleSide = mirrored ? (obstacleSide === 'left' ? 'right' : 'left') : obstacleSide
  const showLeftVehicle = lesson.scenarioId === 'both-sides' || lesson.scenarioId === 'tight-entry'
    || (lesson.scenarioId === 'one-side' && sceneObstacleSide === 'left')
    || (lesson.scenarioId === 'wall-side' && sceneObstacleSide === 'right')
  const showRightVehicle = lesson.scenarioId === 'both-sides' || lesson.scenarioId === 'tight-entry'
    || (lesson.scenarioId === 'one-side' && sceneObstacleSide === 'right')
    || (lesson.scenarioId === 'wall-side' && sceneObstacleSide === 'left')
  const displayedSteering = mirrored
    ? step.steering === '좌측 끝까지' ? '우측 끝까지' : step.steering === '우측 끝까지' ? '좌측 끝까지' : step.steering
    : step.steering

  const finish = () => {
    let seen: string[]
    try {
      const saved = JSON.parse(localStorage.getItem(SEEN_LESSONS_KEY) ?? '[]') as unknown
      seen = Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string') : []
    } catch {
      seen = []
    }
    localStorage.setItem(SEEN_LESSONS_KEY, JSON.stringify([...new Set([...seen, lesson.scenarioId])]))
    if (alwaysSkip) localStorage.setItem(ALWAYS_SKIP_LESSONS_KEY, 'true')
    onFinish()
  }

  const updateAlwaysSkip = (checked: boolean) => {
    setAlwaysSkip(checked)
    localStorage.setItem(ALWAYS_SKIP_LESSONS_KEY, String(checked))
  }

  return (
    <div className="lesson-backdrop" role="presentation">
      <section className="mini-lesson" role="dialog" aria-modal="true" aria-labelledby="lesson-title">
        <header className="lesson-header">
          <div>
            <span>{lesson.steps.length}단계 · 약 {lessonDuration(lesson)}초</span>
            <strong id="lesson-title">{lesson.title}</strong>
          </div>
          <button type="button" className="lesson-skip" onClick={finish}>건너뛰고 시작</button>
        </header>

        <div className={`lesson-animation lesson-scene-${lesson.scenarioId} lesson-obstacle-${sceneObstacleSide} lesson-stage-${stepIndex}`} aria-hidden="true">
          {!isCorrectionLesson
            ? <LessonParkingCanvas key={`${runtime.seed}-${stepIndex}`} runtime={runtime} stepIndex={stepIndex} />
            : <svg key={`${lesson.scenarioId}-${runtime.variant}-${runtime.startSide}-${stepIndex}`} className={mirrored ? 'lesson-mirrored' : undefined} viewBox="0 0 320 260">
            <defs>
              <marker id="lesson-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            <rect className="lesson-road" width="320" height="260" />
            <g className="lesson-scene-content" transform={mirrored ? 'translate(320 0) scale(-1 1)' : undefined}>
            <path className="lesson-bay-lines" d="M72 258V120H248V258 M130 120V258 M190 120V258" />
            {showLeftVehicle && <g className="lesson-parked lesson-parked-left">
              <rect x="88" y="154" width="34" height="84" rx="7" />
              <path d="M93 169H117M93 221H117" />
            </g>}
            {showRightVehicle && <g className="lesson-parked lesson-parked-right">
              <rect x="198" y="154" width="34" height="84" rx="7" />
              <path d="M203 169H227M203 221H227" />
            </g>}
            {lesson.scenarioId === 'wall-side' && <rect className="lesson-wall" x={sceneObstacleSide === 'left' ? 73 : 239} y="121" width="10" height="137" rx="2" />}
            <g className="lesson-motion-content">
            <path className="lesson-motion-path lesson-path-approach" d={LESSON_TRAJECTORIES.approach} markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-angle" d={LESSON_TRAJECTORIES.angle} markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-reverse-turn" d={LESSON_TRAJECTORIES.reverseTurn} markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-straight" d={LESSON_TRAJECTORIES.straightReverse} markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-correction-forward" d={LESSON_TRAJECTORIES.correctionForward} markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-correction-reverse" d={LESSON_TRAJECTORIES.correctionReverse} markerEnd="url(#lesson-arrow)" />
            <line className="lesson-reference lesson-reference-entry" x1="137" y1="30" x2="137" y2="120" />
            <line className="lesson-reference lesson-reference-middle" x1="130" y1="134" x2="190" y2="134" />
            <g className="lesson-stop lesson-stop-entry" transform="translate(137 90)"><circle r="13" /><text y="4">정지</text></g>
            <g className="lesson-stop lesson-stop-angle" transform="translate(178.01 73.01)"><circle r="13" /><text y="4">정지</text></g>
            <g className="lesson-stop lesson-stop-align" transform="translate(161.02 114.02)"><circle r="13" /><text y="4">정지</text></g>
            <g className="lesson-mirror-check lesson-mirror-left" transform="translate(48 130)"><path d="M-16 0Q0-13 16 0Q0 13-16 0Z" /><circle r="4" /><text y="25">{mirrored ? '우측' : '좌측'}</text></g>
            <g className="lesson-mirror-check lesson-mirror-right" transform="translate(272 130)"><path d="M-16 0Q0-13 16 0Q0 13-16 0Z" /><circle r="4" /><text y="25">{mirrored ? '좌측' : '우측'}</text></g>
            <circle className="lesson-danger lesson-danger-left" cx="102" cy="150" r="15" />
            <circle className="lesson-danger lesson-danger-right" cx="216" cy="150" r="15" />
            <g className="lesson-reverse-guide">
              <path className="lesson-guide-neutral" d="M145 174V246M175 174V246" />
              <path className="lesson-guide-dynamic" d="M145 174V246M175 174V246" />
              <path className="lesson-guide-red" d="M145 194H175" />
              <path className="lesson-guide-yellow" d="M145 220H175M145 246H175" />
            </g>
            <g className="lesson-user-car" transform={isCorrectionLesson && [0, 1].includes(stepIndex) ? 'translate(160 164) rotate(-90)' : isCorrectionLesson && stepIndex === 3 ? 'translate(160 120) rotate(-90)' : !isCorrectionLesson && stepIndex === 2 ? 'translate(178.01 73.01) rotate(-45)' : undefined}>
              <rect x="-34" y="-15" width="68" height="30" rx="7" />
              <path d="M-18 -11V11M18 -11V11" />
              <circle cx="-25" cy="-10" r="2" /><circle cx="-25" cy="10" r="2" />
              {!isCorrectionLesson && stepIndex === 0 && <animateMotion dur="3s" path={LESSON_TRAJECTORIES.approach} rotate="auto" repeatCount="1" fill="freeze" />}
              {!isCorrectionLesson && stepIndex === 1 && <animateMotion dur="3.2s" path={LESSON_TRAJECTORIES.angle} rotate="auto" repeatCount="1" fill="freeze" />}
              {!isCorrectionLesson && stepIndex === 3 && <animateMotion dur="3.6s" path={LESSON_TRAJECTORIES.reverseTurn} rotate="auto-reverse" repeatCount="1" fill="freeze" />}
              {!isCorrectionLesson && stepIndex === 4 && <animateMotion dur="3s" path={LESSON_TRAJECTORIES.straightReverse} rotate="auto-reverse" repeatCount="1" fill="freeze" />}
              {isCorrectionLesson && stepIndex === 2 && <animateMotion dur="2.8s" path={LESSON_TRAJECTORIES.correctionForward} rotate="auto" repeatCount="1" fill="freeze" />}
              {isCorrectionLesson && stepIndex === 4 && <animateMotion dur="3.2s" path={LESSON_TRAJECTORIES.correctionReverse} rotate="auto-reverse" repeatCount="1" fill="freeze" />}
            </g>
            </g>
            </g>
            <g className="lesson-steering-symbol" transform="translate(43 190)">
              <circle r="19" /><circle r="5" /><path d="M0-5V-18M-4 3L-16 11M4 3L16 11" />
              {displayedSteering === '우측 끝까지' && <path className="lesson-wheel-arrow" d="M-24-6A25 25 0 0 1 12-22" markerEnd="url(#lesson-arrow)" />}
              {displayedSteering === '좌측 끝까지' && <path className="lesson-wheel-arrow" d="M24-6A25 25 0 0 0-12-22" markerEnd="url(#lesson-arrow)" />}
            </g>
            </svg>}
          <div className="lesson-driving-state">
            <span>기어 <b>{step.gear}</b></span>
            <span>핸들 <b>{displayedSteering}</b></span>
          </div>
        </div>

        <div className="lesson-copy">
          <span>{stepIndex + 1} / {lesson.steps.length} · 약 {step.durationSeconds}초</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          <small>확인: {step.check}</small>
          <strong>{step.cue}</strong>
        </div>

        <div className="lesson-progress" style={{ gridTemplateColumns: `repeat(${lesson.steps.length}, 1fr)` }} aria-label={`레슨 ${stepIndex + 1}단계`}>
          {lesson.steps.map((item, index) => (
            <span key={item.title} className={index <= stepIndex ? 'active' : ''} />
          ))}
        </div>

        <footer className="lesson-footer">
          <label>
            <input
              type="checkbox"
              checked={alwaysSkip}
              onChange={(event) => updateAlwaysSkip(event.target.checked)}
            />
            앞으로 항상 건너뛰기
          </label>
          <div>
            {stepIndex > 0 && <button type="button" onClick={() => setStepIndex(stepIndex - 1)}>이전</button>}
            {stepIndex < lesson.steps.length - 1 ? (
              <button type="button" className="lesson-next" onClick={() => setStepIndex(stepIndex + 1)}>다음 단계</button>
            ) : (
              <button type="button" className="lesson-next" onClick={finish}>바로 시작</button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )
}
