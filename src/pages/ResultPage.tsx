import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CollisionQuiz } from '../components/CollisionQuiz'
import { ReplayMomentCard } from '../components/ReplayMomentCard'
import type { ParkingResult } from '../engine/parkingEvaluation'
import { clearPracticeHistory, loadPracticeHistory, recommendPractice } from '../engine/practiceHistory'
import { getScenario } from '../data/scenarios'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../types/practice'

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
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
  const collisionEvent = replay.find((event) => event.type === 'collision')
  const [history, setHistory] = useState(loadPracticeHistory)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const selectedSession = history.sessions.find((session) => session.id === selectedSessionId)
  const recommendation = recommendPractice(history.sessions)
  const recommendedScenario = getScenario(recommendation.scenarioId)
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
      <h1 id="result-title">{challengeComplete ? '좁은 진입 판단 훈련 완료' : result ? (result.success ? '주차 성공' : '아직 주차가 완료되지 않았습니다') : '연습 기록'}</h1>
      <div className="result-tabs" role="tablist" aria-label="결과 보기">
        <button type="button" role="tab" aria-selected={activeTab === 'current'} disabled={!hasCurrentResult} onClick={() => setSearchParams({ tab: 'current' })}>이번 연습</button>
        <button type="button" role="tab" aria-selected={activeTab === 'history'} onClick={() => setSearchParams({ tab: 'history' })}>연습 기록</button>
      </div>

      {activeTab === 'current' && challengeComplete && <section className="challenge-result-summary">
        <strong>수정 판단 훈련 {state?.challengeScore ?? 10} / {state?.challengeTotal ?? 10}문제를 완료했습니다.</strong>
        <p>정지 → 핸들 중앙 → 짧은 반대 진행 → 양쪽 간격과 차체 각도 확인 순서로 반복 연습하세요.</p>
        <div className="result-actions"><Link className="primary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=practice`}>같은 퀴즈 다시 도전</Link><Link className="secondary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=learning`}>학습 모드에서 직접 연습</Link></div>
      </section>}

      {activeTab === 'current' && result && <div className="result-summary-grid collision-only-summary">
        <article className={`result-card collision-result ${result.collisionCount ? 'needs-work' : 'good'}`}>
          <span>충돌 기록</span>
          <strong>{result.collisionCount ? `${result.collisionCount}회 충돌` : '충돌 없음'}</strong>
          <p>{result.collisionCount ? '아래 그림 퀴즈에서 충돌 전 수정 순서를 연습해보세요.' : '장애물과 안전거리를 유지했습니다.'}</p>
        </article>
        {!result.success && <article className="result-card needs-work"><span>완료 상태</span><strong>{result.fullyInside ? '브레이크 확인 필요' : '차량 전체 진입 필요'}</strong><p>수치를 기록하지 않고 완료 조건만 확인합니다.</p></article>}
      </div>}

      {activeTab === 'current' && result && <div className="result-actions">
        <Link className="primary-button" to={retryPath}>같은 상황 다시 연습</Link>
        <Link className="secondary-button" to={`${retryPath}&lesson=1`}>단계 안내부터 다시</Link>
        <Link className="secondary-button" to="/practice">상황 선택</Link>
      </div>}

      {activeTab === 'current' && result && !collisionEvent && <section className="no-collision-feedback"><strong>충돌 없이 완료했습니다.</strong><p>같은 상황을 반복해 안정적인 주차 순서를 익혀보세요.</p></section>}

      {activeTab === 'current' && replayMoments.length > 0 && <section className="replay-timeline" aria-labelledby="replay-title">
        <header><div><span>실제 주행 탑뷰</span><h2 id="replay-title">이번 연습의 주요 순간</h2></div><small>충돌과 최종 자세를 우선 표시합니다</small></header>
        <div className="replay-moment-list">{replayMoments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={state?.runtime} onRetry={event.type === 'collision' ? () => retryAtEvent(event) : undefined} />)}</div>
      </section>}

      {activeTab === 'current' && collisionEvent && <CollisionQuiz event={collisionEvent} runtime={state?.runtime} />}

      {activeTab === 'history' && <section className="practice-history" aria-labelledby="history-title">
        <header className="history-heading"><div><h2 id="history-title">나의 연습 기록</h2></div>{history.sessions.length > 0 && <button type="button" className="history-reset" onClick={() => { if (window.confirm('저장된 연습 기록을 모두 초기화할까요?')) setHistory(clearPracticeHistory()) }}>기록 초기화</button>}</header>
        {history.sessions.length === 0 ? <div className="history-empty"><strong>아직 저장된 기록이 없습니다</strong><p>연습을 종료하면 최근 10회의 충돌 기록이 저장됩니다.</p><Link className="primary-button result-start-link" to="/practice">첫 기록 만들기</Link></div> : <>
          <article className="history-recommendation"><span>맞춤 연습 추천</span><strong>{recommendedScenario.title}</strong><p>{recommendation.reason}</p><Link to={`/simulator?scenario=${recommendation.scenarioId}&mode=learning`}>추천 연습 시작 →</Link></article>
          <div className="recent-practice"><h3>최근 기록 <small>최대 30개</small></h3><ol>{history.sessions.map((session) => <li key={session.id}><div><strong>{session.mode === 'practice' ? `${getScenario(session.scenarioId).title} · 수정 판단 ${session.quizScore ?? 0}/${session.quizTotal ?? 10}` : `${getScenario(session.scenarioId).title} · ${session.success ? '성공' : '미완료'}`}</strong><span>{formatCompletedAt(session.completedAt)} · {session.mode === 'learning' ? '학습 모드' : '수정 판단'}</span></div><div className="session-measures"><span>{session.mode === 'practice' ? '훈련 완료' : `충돌 ${session.collisionCount}회`}</span></div><button type="button" onClick={() => setSelectedSessionId(session.id)}>{session.moments?.length ? '상세 보기' : '요약 기록'}</button></li>)}</ol></div>
          {selectedSession && <section className="history-detail" aria-labelledby="history-detail-title">
            <header><div><span>저장된 연습</span><h3 id="history-detail-title">{formatCompletedAt(selectedSession.completedAt)} 주요 순간</h3></div><button type="button" onClick={() => setSelectedSessionId(null)}>닫기</button></header>
            {!selectedSession.moments?.length ? <p>이 기록은 상세 장면 저장 기능이 적용되기 전 기록이거나, 표시할 주요 순간 없이 종료되었습니다.</p> : <>
              <div className="replay-moment-list">{selectedSession.moments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={selectedSession.runtime} />)}</div>
              {selectedSession.moments.find((event) => event.type === 'collision') && <CollisionQuiz event={selectedSession.moments.find((event) => event.type === 'collision')!} runtime={selectedSession.runtime} />}
            </>}
          </section>}
        </>}
      </section>}
    </section>
  )
}
