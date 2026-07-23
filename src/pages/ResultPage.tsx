import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CollisionQuiz } from '../components/CollisionQuiz'
import type { ParkingResult } from '../engine/parkingEvaluation'
import { clearPracticeHistory, loadPracticeHistory, recommendPractice } from '../engine/practiceHistory'
import { getScenario } from '../data/scenarios'
import { firstMistakeEvent, type ReplayEvent } from '../engine/sessionReplay'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../types/practice'

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as {
    result?: ParkingResult
    scenarioId?: ScenarioId
    mode?: PracticeMode
    replay?: ReplayEvent[]
    runtime?: ScenarioRuntime
  } | null
  const result = state?.result
  const replay = state?.replay ?? []
  const collisionEvent = replay.find((event) => event.type === 'collision')
  const retryEvent = result ? firstMistakeEvent(replay, result) : null
  const [history, setHistory] = useState(loadPracticeHistory)
  const recommendation = recommendPractice(history.sessions)
  const recommendedScenario = getScenario(recommendation.scenarioId)
  const retryPath = `/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=${state?.mode ?? 'learning'}`

  const retryAtEvent = (event: ReplayEvent) => navigate(retryPath, {
    state: { retryVehicle: { ...event.vehicle, braking: true, speed: 0 }, runtime: state?.runtime },
  })

  return (
    <section className="page single-column" aria-labelledby="result-title">
      <p className="eyebrow">연습 결과</p>
      <h1 id="result-title">{result ? (result.success ? '주차 성공' : '아직 주차가 완료되지 않았습니다') : '연습 기록'}</h1>
      <p className="page-description">{result ? '충돌 기록을 확인하고 필요한 수정 동작을 연습해보세요.' : '최근 10회의 성공 여부와 충돌 기록을 확인해보세요.'}</p>

      {result && <div className="result-summary-grid collision-only-summary">
        <article className={`result-card collision-result ${result.collisionCount ? 'needs-work' : 'good'}`}>
          <span>충돌 기록</span>
          <strong>{result.collisionCount ? `${result.collisionCount}회 충돌` : '충돌 없음'}</strong>
          <p>{result.collisionCount ? '아래 그림 퀴즈에서 충돌 전 수정 순서를 연습해보세요.' : '장애물과 안전거리를 유지했습니다.'}</p>
        </article>
        {!result.success && <article className="result-card needs-work"><span>완료 상태</span><strong>{result.fullyInside ? '브레이크 확인 필요' : '차량 전체 진입 필요'}</strong><p>수치를 기록하지 않고 완료 조건만 확인합니다.</p></article>}
      </div>}

      {result && <div className="result-actions">
        <Link className="primary-button" to={retryPath}>다시 연습하기</Link>
        <Link className="secondary-button" to={`${retryPath}&lesson=1`}>처음부터 재시작</Link>
        {retryEvent && <button type="button" className="secondary-button mistake-retry" onClick={() => retryAtEvent(retryEvent)}>충돌 전부터 재시도</button>}
        <Link className="secondary-button" to="/practice">상황 선택</Link>
      </div>}

      {collisionEvent && <CollisionQuiz event={collisionEvent} runtime={state?.runtime} />}
      {result && !collisionEvent && <section className="no-collision-feedback"><strong>충돌 없이 완료했습니다.</strong><p>다음에는 무작위 출발이나 아직 성공하지 않은 상황에 도전해보세요.</p></section>}

      {replay.length > 0 && <section className="replay-timeline" aria-labelledby="replay-title">
        <header><div><span>세션 리플레이</span><h2 id="replay-title">주요 순간</h2></div></header>
        <ol>{replay.map((event) => <li key={event.id} className={`replay-${event.type}`}><time>{event.elapsedSeconds.toFixed(1)}초</time><i /><div><strong>{event.label}</strong><span>{event.type === 'collision' ? '수정 동작이 필요한 지점' : `기어 ${event.vehicle.gear}`}</span></div>{event.type === 'collision' && <button type="button" onClick={() => retryAtEvent(event)}>여기서 재시도</button>}</li>)}</ol>
      </section>}

      <section className="practice-history" aria-labelledby="history-title">
        <header className="history-heading"><div><h2 id="history-title">나의 연습 기록</h2></div>{history.sessions.length > 0 && <button type="button" className="history-reset" onClick={() => { if (window.confirm('저장된 연습 기록을 모두 초기화할까요?')) setHistory(clearPracticeHistory()) }}>기록 초기화</button>}</header>
        {history.sessions.length === 0 ? <div className="history-empty"><strong>아직 저장된 기록이 없습니다</strong><p>연습을 종료하면 최근 10회의 충돌 기록이 저장됩니다.</p><Link className="primary-button result-start-link" to="/practice">첫 기록 만들기</Link></div> : <>
          <article className="history-recommendation"><span>맞춤 연습 추천</span><strong>{recommendedScenario.title}</strong><p>{recommendation.reason}</p><Link to={`/simulator?scenario=${recommendation.scenarioId}&mode=learning`}>추천 연습 시작 →</Link></article>
          <div className="recent-practice"><h3>최근 기록 <small>최대 10개</small></h3><ol>{history.sessions.map((session) => <li key={session.id}><div><strong>{getScenario(session.scenarioId).title} · {session.success ? '성공' : '미완료'}</strong><span>{formatCompletedAt(session.completedAt)} · {session.mode === 'learning' ? '학습' : '실전'}</span></div><div className="session-measures"><span>충돌 {session.collisionCount}회</span></div><small>{session.collisionCount ? '수정 연습 필요' : '충돌 없음'}</small></li>)}</ol></div>
        </>}
      </section>
    </section>
  )
}
