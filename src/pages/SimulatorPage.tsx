import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
import {
  releaseDirectPracticeOrientation,
  requestDirectPracticeLandscape,
} from '../engine/screenOrientation'
import type { VehicleState } from '../engine/vehiclePhysics'
import type { ScenarioRuntime } from '../types/practice'

const SAFETY_NOTICE_SEEN_KEY = 'parking-coach:real-driving-safety-seen:v1'

export function SimulatorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const retryPayload = location.state as { retryVehicle?: VehicleState; runtime?: ScenarioRuntime } | null
  const requestedScenarioId = searchParams.get('scenario')
  const requestedScenario = scenarios.find((item) => item.id === requestedScenarioId)
  const scenario = requestedScenario?.available
    ? requestedScenario
    : scenarios.find((item) => item.available) ?? scenarios[0]
  const canReuseRuntime = retryPayload?.runtime?.scenarioId === scenario.id
  const retryState = canReuseRuntime ? retryPayload?.retryVehicle : undefined
  const isPracticeMode = searchParams.get('mode') === 'practice'
  const forceLesson = searchParams.get('lesson') === '1'
  const [runtime] = useState(() => canReuseRuntime ? retryPayload.runtime! : createScenarioRuntime(scenario.id, {
    firstSuccess: loadFirstSuccess()[scenario.id],
    practiceMode: isPracticeMode ? 'practice' : 'learning',
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
  const [showSafetyNotice, setShowSafetyNotice] = useState(
    () => !isPracticeMode && localStorage.getItem(SAFETY_NOTICE_SEEN_KEY) !== 'true',
  )

  useEffect(() => {
    if (requestedScenarioId === scenario.id) return
    const next = new URLSearchParams(searchParams)
    next.set('scenario', scenario.id)
    setSearchParams(next, { replace: true })
  }, [requestedScenarioId, scenario.id, searchParams, setSearchParams])

  useEffect(() => {
    if (isPracticeMode) return
    void requestDirectPracticeLandscape()
    return () => releaseDirectPracticeOrientation()
  }, [isPracticeMode])

  const confirmSafetyNotice = () => {
    localStorage.setItem(SAFETY_NOTICE_SEEN_KEY, 'true')
    setShowSafetyNotice(false)
  }

  return (
    <>
      {!isPracticeMode && <OrientationNotice />}
      <section className={`page simulator-shell${isPracticeMode ? ' correction-shell' : ''}`} aria-labelledby="simulator-title">
        <div className="simulator-heading">
          <div>
            <p className="eyebrow">{isPracticeMode ? '판단 연습' : '직접 연습'}</p>
            <h1 id="simulator-title">{isPracticeMode ? '충돌 전 안전한 수정 판단' : `${scenario.title} 후진주차`}</h1>
          </div>
          <Link className="secondary-button" to="/practice">다른 주차 환경 선택</Link>
        </div>
        {!isPracticeMode && <p className="page-description">
          브레이크를 해제하면 선택한 기어 방향으로 천천히 움직입니다. 장애물과 충돌하면 차량이 즉시 정지합니다.
        </p>}
        {isPracticeMode ? <CorrectionPractice runtime={runtime} /> : !showSafetyNotice && <VehicleSimulator
          learningMode={!isPracticeMode}
          scenarioId={scenario.id}
          mode={isPracticeMode ? 'practice' : 'learning'}
          initialVehicle={retryState}
          runtime={runtime}
          onShowLesson={() => setShowLesson(true)}
        />}
      </section>
      {!isPracticeMode && !showSafetyNotice && showLesson && <MiniLessonView lesson={getLesson(scenario.id)} runtime={runtime} onFinish={() => setShowLesson(false)} />}
      {showSafetyNotice && createPortal(
        <div className="control-help-backdrop">
          <section className="control-help-dialog safety-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="real-driving-safety-title">
            <header>
              <div><span>실제 운전 전 확인</span><h2 id="real-driving-safety-title">안전한 장소에서 연습하세요</h2></div>
            </header>
            <p>Parking Coach는 주차 판단을 익히는 교육용 도구이며, 실제 차량을 대신하지 않습니다.</p>
            <ul>
              <li>차량마다 크기, 회전반경과 카메라 시야가 다릅니다.</li>
              <li>실제 운전에서는 화면보다 주변과 사각지대를 직접 확인하세요.</li>
              <li>처음 연습할 때는 안전한 장소에서 지도자의 도움을 받으세요.</li>
            </ul>
            <button type="button" className="control-help-start" onClick={confirmSafetyNotice}>확인하고 연습하기</button>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
