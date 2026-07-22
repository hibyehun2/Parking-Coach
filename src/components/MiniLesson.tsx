import { useState } from 'react'
import { lessonDuration, type MiniLesson } from '../data/lessons'

type MiniLessonProps = {
  lesson: MiniLesson
  onFinish: () => void
}

export const ALWAYS_SKIP_LESSONS_KEY = 'parking-coach:always-skip-lessons'
export const SEEN_LESSONS_KEY = 'parking-coach:seen-lessons'

export function MiniLessonView({ lesson, onFinish }: MiniLessonProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [alwaysSkip, setAlwaysSkip] = useState(
    () => localStorage.getItem(ALWAYS_SKIP_LESSONS_KEY) === 'true',
  )
  const step = lesson.steps[stepIndex]

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

        <div className={`lesson-animation lesson-scene-${lesson.scenarioId} lesson-stage-${stepIndex}`} aria-hidden="true">
          <svg key={`${lesson.scenarioId}-${stepIndex}`} viewBox="0 0 320 240">
            <defs>
              <marker id="lesson-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            <rect className="lesson-road" width="320" height="240" />
            <path className="lesson-bay-lines" d="M72 238V90H248V238 M130 90V238 M190 90V238" />
            <g className="lesson-parked lesson-parked-left">
              <rect x="88" y="132" width="34" height="84" rx="7" />
              <path d="M93 147H117M93 199H117" />
            </g>
            <g className="lesson-parked lesson-parked-right">
              <rect x="198" y="132" width="34" height="84" rx="7" />
              <path d="M203 147H227M203 199H227" />
            </g>
            <g className="lesson-charger"><rect x="250" y="104" width="15" height="25" rx="3" /><circle cx="257.5" cy="111" r="2.5" /><path d="M258 129C270 134 269 143 262 146" /><text x="257.5" y="122">EV</text></g>
            <path className="lesson-motion-path lesson-path-approach" d="M112 42H190" markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-angle" d="M190 42C218 42 238 48 240 70" markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-reverse-turn" d="M240 70C236 108 196 112 160 142" markerEnd="url(#lesson-arrow)" />
            <path className="lesson-motion-path lesson-path-straight" d="M160 142V204" markerEnd="url(#lesson-arrow)" />
            <line className="lesson-reference lesson-reference-entry" x1="190" y1="18" x2="190" y2="91" />
            <line className="lesson-reference lesson-reference-middle" x1="130" y1="105" x2="190" y2="105" />
            <g className="lesson-stop lesson-stop-entry" transform="translate(190 42)"><circle r="13" /><text y="4">정지</text></g>
            <g className="lesson-stop lesson-stop-angle" transform="translate(240 70)"><circle r="13" /><text y="4">정지</text></g>
            <g className="lesson-stop lesson-stop-align" transform="translate(160 142)"><circle r="13" /><text y="4">정지</text></g>
            <g className="lesson-mirror-check lesson-mirror-left" transform="translate(48 104)"><path d="M-16 0Q0-13 16 0Q0 13-16 0Z" /><circle r="4" /><text y="25">좌측</text></g>
            <g className="lesson-mirror-check lesson-mirror-right" transform="translate(272 104)"><path d="M-16 0Q0-13 16 0Q0 13-16 0Z" /><circle r="4" /><text y="25">우측</text></g>
            <circle className="lesson-danger lesson-danger-left" cx="102" cy="128" r="15" />
            <circle className="lesson-danger lesson-danger-right" cx="216" cy="128" r="15" />
            <g className="lesson-reverse-guide">
              <path className="lesson-guide-neutral" d="M145 158V218M175 158V218" />
              <path className="lesson-guide-dynamic" d="M145 158V218M175 158V218" />
              <path className="lesson-guide-red" d="M145 175H175" />
              <path className="lesson-guide-yellow" d="M145 198H175M145 218H175" />
            </g>
            <g className="lesson-user-car" transform={stepIndex === 2 ? 'translate(240 70) rotate(90)' : undefined}>
              <rect x="-34" y="-15" width="68" height="30" rx="7" />
              <path d="M-18 -11V11M18 -11V11" />
              <circle cx="-25" cy="-10" r="2" /><circle cx="-25" cy="10" r="2" />
              {stepIndex === 0 && <animateMotion dur="3s" path="M112 42 H190" rotate="auto" repeatCount="indefinite" />}
              {stepIndex === 1 && <animateMotion dur="3.2s" path="M190 42 C218 42 238 48 240 70" rotate="auto" repeatCount="indefinite" />}
              {stepIndex === 3 && <animateMotion dur="3.6s" path="M240 70 C236 108 196 112 160 142" rotate="auto-reverse" repeatCount="indefinite" />}
              {stepIndex === 4 && <animateMotion dur="3s" path="M160 142 V204" rotate="auto-reverse" repeatCount="indefinite" />}
            </g>
            <g className="lesson-steering-symbol" transform="translate(43 190)">
              <circle r="19" /><circle r="5" /><path d="M0-5V-18M-4 3L-16 11M4 3L16 11" />
              {step.steering === '우측 끝까지' && <path className="lesson-wheel-arrow" d="M-24-6A25 25 0 0 1 12-22" markerEnd="url(#lesson-arrow)" />}
              {step.steering === '좌측 끝까지' && <path className="lesson-wheel-arrow" d="M24-6A25 25 0 0 0-12-22" markerEnd="url(#lesson-arrow)" />}
            </g>
          </svg>
          <div className="lesson-driving-state">
            <span>기어 <b>{step.gear}</b></span>
            <span>핸들 <b>{step.steering}</b></span>
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
