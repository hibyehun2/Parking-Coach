import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  ALWAYS_SKIP_LESSONS_KEY,
  MiniLessonView,
  SEEN_LESSONS_KEY,
} from '../components/MiniLesson'
import { OrientationNotice } from '../components/OrientationNotice'
import { VehicleSimulator } from '../components/simulator/VehicleSimulator'
import { CorrectionPractice } from '../components/CorrectionPractice'
import { scenarios } from '../data/scenarios'
import { createScenarioRuntime, loadFirstSuccess } from '../data/scenarios'
import { getLesson } from '../data/lessons'
import type { VehicleState } from '../engine/vehiclePhysics'
import type { ScenarioRuntime } from '../types/practice'

export function SimulatorPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const retryPayload = location.state as { retryVehicle?: VehicleState; runtime?: ScenarioRuntime } | null
  const retryState = retryPayload?.retryVehicle
  const scenario = scenarios.find((item) => item.id === searchParams.get('scenario')) ?? scenarios[0]
  const isPracticeMode = searchParams.get('mode') === 'practice'
  const forceLesson = searchParams.get('lesson') === '1'
  const [runtime] = useState(() => retryPayload?.runtime ?? createScenarioRuntime(scenario.id, {
    firstSuccess: loadFirstSuccess()[scenario.id],
  }))
  const [showLesson, setShowLesson] = useState(() => {
    if (forceLesson) return true
    if (localStorage.getItem(ALWAYS_SKIP_LESSONS_KEY) === 'true') return false
    try {
      const seen = JSON.parse(localStorage.getItem(SEEN_LESSONS_KEY) ?? '[]') as string[]
      return !seen.includes(scenario.id)
    } catch {
      return true
    }
  })

  return (
    <>
      {!isPracticeMode && <OrientationNotice />}
      <section className={`page simulator-shell${isPracticeMode ? ' correction-shell' : ''}`} aria-labelledby="simulator-title">
        <div className="simulator-heading">
          <div>
            <p className="eyebrow">{isPracticeMode ? '판단 연습' : '직접 연습'}</p>
            <h1 id="simulator-title">{isPracticeMode ? '충돌 전 안전한 수정 판단' : `${scenario.title} 후진주차`}</h1>
          </div>
          <Link className="secondary-button" to="/">상황 다시 선택</Link>
        </div>
        {!isPracticeMode && <p className="page-description">
          브레이크를 해제하면 선택한 기어 방향으로 천천히 움직입니다. 장애물과 충돌하면 차량이 즉시 정지합니다.
        </p>}
        {isPracticeMode ? <CorrectionPractice runtime={runtime} /> : <VehicleSimulator
          learningMode={!isPracticeMode}
          scenarioId={scenario.id}
          mode={isPracticeMode ? 'practice' : 'learning'}
          initialVehicle={retryState}
          runtime={runtime}
          onShowLesson={() => setShowLesson(true)}
        />}
      </section>
      {!isPracticeMode && showLesson && <MiniLessonView lesson={getLesson(scenario.id)} runtime={runtime} onFinish={() => setShowLesson(false)} />}
    </>
  )
}
