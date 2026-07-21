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
            <span>3단계 · 약 {lessonDuration(lesson)}초</span>
            <strong id="lesson-title">{lesson.title}</strong>
          </div>
          <button type="button" className="lesson-skip" onClick={finish}>건너뛰고 시작</button>
        </header>

        <div className={`lesson-animation lesson-${step.visual}`} aria-hidden="true">
          <span className="lesson-bay" />
          <span className="lesson-obstacle lesson-obstacle-left" />
          <span className="lesson-obstacle lesson-obstacle-right" />
          <span className="lesson-car">P</span>
          <span className="lesson-guide" />
        </div>

        <div className="lesson-copy">
          <span>{stepIndex + 1} / {lesson.steps.length} · 약 {step.durationSeconds}초</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          <strong>{step.cue}</strong>
        </div>

        <div className="lesson-progress" aria-label={`레슨 ${stepIndex + 1}단계`}>
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
