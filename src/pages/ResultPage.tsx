import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ReplayMomentCard } from '../components/ReplayMomentCard'
import { ResultCollisionQuiz } from '../components/ResultCollisionQuiz'
import type { ParkingResult } from '../engine/parkingEvaluation'
import { clearPracticeHistory, loadPracticeHistory, recommendPractice } from '../engine/practiceHistory'
import { getScenario } from '../data/scenarios'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../types/practice'

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function collisionCoaching(event: ReplayEvent) {
  const zone = event.collision?.contactZone ?? ''
  const side = zone.includes('left') ? '왼쪽' : zone.includes('right') ? '오른쪽' : '가까운'
  const corner = zone.includes('front') ? '앞 모서리' : zone.includes('rear') ? '뒤 모서리' : '차체'
  const recovery = event.vehicle.gear === 'R'
    ? '완전히 정지한 뒤 핸들을 중앙으로 하고 D로 짧게 전진해 간격을 회복하세요.'
    : '완전히 정지한 뒤 뒤쪽을 확인하고 R로 짧게 직선 후진해 간격을 회복하세요.'
  return {
    cause: `${event.vehicle.gear === 'R' ? '후진' : '전진'} 중 ${side} ${corner}의 간격이 부족해졌습니다.`,
    action: recovery,
  }
}

export function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const state = location.state as {
    result?: ParkingResult
    scenarioId?: ScenarioId
    mode?: PracticeMode
    replay?: ReplayEvent[]
    runtime?: ScenarioRuntime
    challengeComplete?: boolean
    challengeScore?: number
    challengeTotal?: number
  } | null
  const result = state?.result
  const challengeComplete = state?.challengeComplete === true
  const hasCurrentResult = Boolean(result || challengeComplete)
  const requestedTab = searchParams.get('tab')
  const activeTab = requestedTab === 'history' || !hasCurrentResult ? 'history' : 'current'
  const replay = state?.replay ?? []
  const collisionEvent = replay.filter((event) => event.type === 'collision').at(-1)
  const collisionFeedback = collisionEvent ? collisionCoaching(collisionEvent) : null
  const [history, setHistory] = useState(loadPracticeHistory)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const selectedSession = history.sessions.find((session) => session.id === selectedSessionId)
  const recommendation = recommendPractice(history.sessions)
  const retryPath = `/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=${state?.mode ?? 'learning'}`
  const replayMoments = replay
    .filter((event) => event.type === 'collision' || (event.type === 'finish' && result?.success))
    .slice(-3)

  const retryAtEvent = (event: ReplayEvent) => navigate(retryPath, {
    state: { retryVehicle: { ...event.vehicle, braking: true, speed: 0 }, runtime: state?.runtime },
  })

  return (
    <section className="page single-column" aria-labelledby="result-title">
      <p className="eyebrow">연습 결과</p>
      <h1 id="result-title">{challengeComplete ? '후진주차 상황 판단 훈련 완료' : result ? (result.success ? '주차 성공' : '아직 주차가 완료되지 않았습니다') : '연습 기록'}</h1>
      <div className="result-tabs" role="tablist" aria-label="결과 보기">
        <button type="button" role="tab" aria-selected={activeTab === 'current'} disabled={!hasCurrentResult} onClick={() => setSearchParams({ tab: 'current' })}>이번 연습</button>
        <button type="button" role="tab" aria-selected={activeTab === 'history'} onClick={() => setSearchParams({ tab: 'history' })}>연습 기록</button>
      </div>

      {activeTab === 'current' && challengeComplete && <section className="challenge-result-summary">
        <strong>첫 선택 기준 {state?.challengeScore ?? 0} / {state?.challengeTotal ?? 6}문제를 정확히 판단했습니다.</strong>
        <p>위험 지점 예측, 정지 시점, 수정 공간, 첫 수정 동작, 재확인, 재접근 판단을 완료했습니다.</p>
        <div className="result-actions"><Link className="primary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=practice`}>새 판단 훈련 시작</Link><Link className="secondary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=learning`}>직접 주차에 적용</Link></div>
      </section>}

      {activeTab === 'current' && result && <div className="result-summary-grid collision-only-summary">
        <article className={`result-card collision-result ${result.collisionCount ? 'needs-work' : 'good'}`}>
          <span>충돌 기록</span>
          <strong>{result.collisionCount ? `${result.collisionCount}회 충돌` : '충돌 없음'}</strong>
          <p>{result.collisionCount ? '실제 충돌 장면의 원인과 다음 수정 행동을 확인하세요.' : '장애물과 안전거리를 유지했습니다.'}</p>
        </article>
        {!result.success && <article className="result-card needs-work"><span>완료 상태</span><strong>{result.fullyInside ? '브레이크 확인 필요' : '차량 전체 진입 필요'}</strong><p>수치를 기록하지 않고 완료 조건만 확인합니다.</p></article>}
      </div>}

      {activeTab === 'current' && result && <div className="result-actions">
        <Link className="primary-button" to={retryPath}>같은 상황 다시 연습</Link>
        <Link className="secondary-button" to={`${retryPath}&lesson=1`}>단계 안내부터 다시</Link>
        <Link className="secondary-button" to="/practice">상황 선택</Link>
      </div>}

      {activeTab === 'current' && result && !collisionEvent && <section className="no-collision-feedback"><strong>충돌 없이 완료했습니다.</strong><p>같은 상황을 반복해 안정적인 주차 순서를 익혀보세요.</p></section>}

      {activeTab === 'current' && collisionEvent && state?.runtime && <ResultCollisionQuiz event={collisionEvent} runtime={state.runtime} onRetry={() => retryAtEvent(collisionEvent)} />}

      {activeTab === 'current' && collisionEvent && !state?.runtime && collisionFeedback && <section className="collision-debrief" aria-labelledby="collision-debrief-title">
        <span>이번 주행 피드백</span>
        <h2 id="collision-debrief-title">실제 충돌 장면에서 고칠 한 가지</h2>
        <div><strong>발생 원인</strong><p>{collisionFeedback.cause}</p></div>
        <div><strong>다음 행동</strong><p>{collisionFeedback.action}</p></div>
        <button type="button" className="primary-button" onClick={() => retryAtEvent(collisionEvent)}>충돌 직전부터 다시 연습</button>
      </section>}

      {activeTab === 'current' && replayMoments.length > 0 && <section className="replay-timeline" aria-labelledby="replay-title">
        <header><div><span>실제 주행 탑뷰</span><h2 id="replay-title">이번 연습의 주요 순간</h2></div><small>충돌과 최종 자세를 우선 표시합니다</small></header>
        <div className="replay-moment-list">{replayMoments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={state?.runtime} onRetry={event.type === 'collision' ? () => retryAtEvent(event) : undefined} />)}</div>
      </section>}

      {activeTab === 'history' && <section className="practice-history" aria-labelledby="history-title">
        <header className="history-heading"><div><h2 id="history-title">나의 연습 기록</h2></div>{history.sessions.length > 0 && <button type="button" className="history-reset" onClick={() => { if (window.confirm('저장된 연습 기록을 모두 초기화할까요?')) setHistory(clearPracticeHistory()) }}>기록 초기화</button>}</header>
        {history.sessions.length === 0 ? <div className="history-empty"><strong>아직 저장된 기록이 없습니다</strong><p>연습을 종료하면 최근 10회의 충돌 기록이 저장됩니다.</p><Link className="primary-button result-start-link" to="/practice">첫 기록 만들기</Link></div> : <>
          {recommendation && <aside className="next-practice">
            <div><span>다음 연습</span><p>{recommendation.reason}</p></div>
            <Link to={`/simulator?scenario=${recommendation.scenarioId}&mode=${recommendation.mode}`}>{recommendation.label} →</Link>
          </aside>}
          <div className="recent-practice"><h3>최근 기록 <small>최대 30개</small></h3><ol>{history.sessions.map((session) => <li key={session.id}><div><strong>{session.mode === 'practice' ? `${getScenario(session.scenarioId).title} · 수정 판단 ${session.quizScore ?? 0}/${session.quizTotal ?? 10}` : `${getScenario(session.scenarioId).title} · ${session.success ? '성공' : '미완료'}`}</strong><span>{formatCompletedAt(session.completedAt)} · {session.mode === 'learning' ? '학습 모드' : '수정 판단'}</span></div><div className="session-measures"><span>{session.mode === 'practice' ? '훈련 완료' : `충돌 ${session.collisionCount}회`}</span></div><button type="button" onClick={() => setSelectedSessionId(session.id)}>{session.moments?.length ? '상세 보기' : '요약 기록'}</button></li>)}</ol></div>
          {selectedSession && <section className="history-detail" aria-labelledby="history-detail-title">
            <header><div><span>저장된 연습</span><h3 id="history-detail-title">{formatCompletedAt(selectedSession.completedAt)} 주요 순간</h3></div><button type="button" onClick={() => setSelectedSessionId(null)}>닫기</button></header>
            {!selectedSession.moments?.length ? <p>이 기록은 상세 장면 저장 기능이 적용되기 전 기록이거나, 표시할 주요 순간 없이 종료되었습니다.</p> : <>
              <div className="replay-moment-list">{selectedSession.moments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={selectedSession.runtime} />)}</div>
              {selectedSession.moments.find((event) => event.type === 'collision') && <p>과거 기록은 장면 복기용으로 표시합니다. 새로운 판단 문제는 수정 판단 훈련에서 서로 다른 상황으로 연습할 수 있습니다.</p>}
            </>}
          </section>}
        </>}
      </section>}
    </section>
  )
}
