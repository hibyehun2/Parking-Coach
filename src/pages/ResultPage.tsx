import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ReplayMomentCard } from '../components/ReplayMomentCard'
import { ResultCollisionQuiz } from '../components/ResultCollisionQuiz'
import { JudgmentCanvas } from '../components/JudgmentQuiz'
import { buildCorrectionDrills } from '../engine/correctionDrills'
import { ANONYMOUS_ALIAS_COMBINATIONS, createAnonymousAlias } from '../engine/anonymousAlias'
import type { ParkingResult } from '../engine/parkingEvaluation'
import { clearPracticeHistory, isPracticeSessionExpired, loadPracticeHistory, MAX_BOOKMARKED_SESSIONS, MAX_PRACTICE_SESSIONS, PRACTICE_HISTORY_RETENTION_DAYS, recommendPractice, togglePracticeBookmark, type CorrectionAttempt, type PracticeSession } from '../engine/practiceHistory'
import { getScenario } from '../data/scenarios'
import type { JudgmentScenario } from '../engine/judgmentScenarios'
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

function findCorrectionScenario(session: PracticeSession, attempt: CorrectionAttempt) {
  if (!session.runtime) return null
  const drill = buildCorrectionDrills(session.runtime).find((item) => item.id === attempt.drillId)
  return drill?.steps.find((step) => step.id === attempt.stepId) ?? null
}

function CorrectionReviewCard({
  attempt,
  scenario,
  runtime,
}: {
  attempt: CorrectionAttempt
  scenario: JudgmentScenario | null
  runtime?: ScenarioRuntime
}) {
  const firstChoice = scenario?.choices.find((choice) => choice.label === attempt.firstChoiceLabel) ?? null
  const correctChoice = scenario?.choices.find((choice) => choice.id === scenario.answer) ?? null

  return (
    <li className="correction-review-card">
      <header><div><span>{attempt.drillTitle}</span><strong>{attempt.stepTitle}</strong></div><small>다시 볼 문제</small></header>
      {scenario && runtime && firstChoice && correctChoice && <div className="correction-path-comparison">
        <figure>
          <JudgmentCanvas scenario={scenario} choice={firstChoice} correct={false} runtime={runtime} />
          <figcaption><i className="danger" />내 선택 결과</figcaption>
        </figure>
        <figure>
          <JudgmentCanvas scenario={scenario} choice={correctChoice} correct runtime={runtime} />
          <figcaption><i className="safe" />안전한 선택 결과</figcaption>
        </figure>
      </div>}
      <div className="correction-review-copy">
        {scenario && <p><b>상황</b><span>{scenario.situation}</span></p>}
        <p><b>내 판단</b><span>{attempt.firstChoiceLabel}</span></p>
        {firstChoice?.feedback && <p><b>이렇게 되면</b><span>{firstChoice.feedback}</span></p>}
        <div className="safe-action">
          <b>안전한 행동</b>
          {correctChoice?.steps?.length
            ? <ol>{correctChoice.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            : <span>{attempt.correctChoiceLabel}</span>}
          {correctChoice?.feedback && <small>{correctChoice.feedback}</small>}
        </div>
        <p className="correction-memory"><b>기억할 기준</b><span>{attempt.takeaway}</span></p>
      </div>
    </li>
  )
}

function CorrectionHistoryReview({ session }: { session: PracticeSession }) {
  const attempts = session.correctionAttempts ?? []
  const reviewAttempts = attempts.filter((attempt) => !attempt.firstTryCorrect)
  const correctAttempts = attempts.filter((attempt) => attempt.firstTryCorrect)

  return (
    <div className="correction-history-detail">
      <div className="correction-history-summary">
        <strong>다시 볼 판단 {reviewAttempts.length}개</strong>
        <p>틀린 문제부터 당시 상황과 안전한 수정 순서를 복기해보세요.</p>
      </div>
      {reviewAttempts.length > 0
        ? <ol className="correction-review-list">{reviewAttempts.map((attempt) => <CorrectionReviewCard
          key={`${attempt.drillId}-${attempt.stepId}`}
          attempt={attempt}
          scenario={findCorrectionScenario(session, attempt)}
          runtime={session.runtime}
        />)}</ol>
        : <p className="correction-perfect-review">모든 문제를 첫 선택에서 정확히 판단했습니다. 다음 연습에서도 위험한 모서리를 먼저 확인해보세요.</p>}
      {correctAttempts.length > 0 && <details className="correct-attempts">
        <summary>첫 선택에서 정확했던 판단 {correctAttempts.length}개</summary>
        <ol>{correctAttempts.map((attempt) => <li key={`${attempt.drillId}-${attempt.stepId}`}><span>{attempt.drillTitle}</span><strong>{attempt.stepTitle}</strong><small>{attempt.takeaway}</small></li>)}</ol>
      </details>}
    </div>
  )
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
  const activeTab = requestedTab === 'community' ? 'community' : requestedTab === 'history' || !hasCurrentResult ? 'history' : 'current'
  const replay = state?.replay ?? []
  const collisionEvent = replay.filter((event) => event.type === 'collision').at(-1)
  const collisionFeedback = collisionEvent ? collisionCoaching(collisionEvent) : null
  const [history, setHistory] = useState(loadPracticeHistory)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const bookmarkedSessions = history.sessions.filter((session) => session.bookmarked)
  const recentSessions = history.sessions.filter((session) => !session.bookmarked)
  const recommendation = recommendPractice(history.sessions)
  const retryPath = `/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=${state?.mode ?? 'learning'}`
  const correctionPracticePath = recommendation?.mode === 'practice'
    ? `/simulator?scenario=${recommendation.scenarioId}&mode=practice`
    : '/simulator?scenario=both-sides&mode=practice'
  const replayMoments = replay
    .filter((event) => event.type === 'collision' || (event.type === 'finish' && result?.success))
    .slice(-3)

  const retryAtEvent = (event: ReplayEvent) => navigate(retryPath, {
    state: { retryVehicle: { ...event.vehicle, braking: true, speed: 0 }, runtime: state?.runtime },
  })
  const openCollisionQuiz = () => {
    const quiz = document.getElementById('collision-judgment-quiz')
    quiz?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => document.getElementById('result-collision-quiz-title')?.focus({ preventScroll: true }), 350)
  }
  useEffect(() => {
    if (!selectedSessionId) return
    window.requestAnimationFrame(() => {
      document.getElementById(`history-session-${selectedSessionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [selectedSessionId])
  const toggleBookmark = (session: PracticeSession) => {
    const expired = isPracticeSessionExpired(session)
    if (session.bookmarked && expired && !window.confirm('보관을 해제하면 7일이 지난 이 기록은 바로 삭제됩니다. 해제할까요?')) return
    const result = togglePracticeBookmark(session.id)
    if (result.status === 'limit') {
      window.alert(`보관할 수 있는 기록은 최대 ${MAX_BOOKMARKED_SESSIONS}개입니다. 기존 기록을 먼저 해제해주세요.`)
      return
    }
    setHistory(result.history)
    if (result.status === 'removed' && expired) setSelectedSessionId(null)
  }
  const renderHistorySession = (session: PracticeSession) => {
    const isSelected = session.id === selectedSessionId
    const detailId = `history-detail-${session.id}`
    const titleId = `history-detail-title-${session.id}`
    return <li key={session.id} id={`history-session-${session.id}`} className={isSelected ? 'selected' : undefined}>
      <div className="session-row">
        <div><strong>{session.mode === 'practice' ? `${getScenario(session.scenarioId).title} · 수정 판단 ${session.quizScore ?? 0}/${session.quizTotal ?? 10}` : `${getScenario(session.scenarioId).title} · ${session.success ? '성공' : '미완료'}`}</strong><span>{formatCompletedAt(session.completedAt)} · {session.mode === 'learning' ? '학습 모드' : '수정 판단'}</span></div>
        <div className="session-measures"><span>{session.mode === 'practice' ? '훈련 완료' : `충돌 ${session.collisionCount}회`}</span></div>
        <div className="session-buttons">
          <button type="button" className={`bookmark-button${session.bookmarked ? ' bookmarked' : ''}`} aria-label={session.bookmarked ? '보관에서 해제하기' : '이 기록 보관하기'} aria-pressed={session.bookmarked} title={session.bookmarked ? '보관에서 해제하기' : '이 기록 보관하기'} onClick={() => toggleBookmark(session)}>{session.bookmarked ? '★' : '☆'}</button>
          <button type="button" aria-expanded={isSelected} aria-controls={detailId} onClick={() => setSelectedSessionId(isSelected ? null : session.id)}>{isSelected ? '상세 닫기' : session.moments?.length || session.correctionAttempts?.length ? '상세 보기' : '요약 보기'}</button>
        </div>
      </div>
      {isSelected && <section id={detailId} className="history-detail" aria-labelledby={titleId}>
        <header><div><span>{session.bookmarked ? '보관한 기록' : '저장된 연습'}</span><h3 id={titleId}>{formatCompletedAt(session.completedAt)} 주요 순간</h3></div><button type="button" onClick={() => setSelectedSessionId(null)}>닫기</button></header>
        {session.correctionAttempts?.length ? <CorrectionHistoryReview session={session} /> : !session.moments?.length ? <p>이 기록은 상세 장면 저장 기능이 적용되기 전 기록이거나, 표시할 주요 순간 없이 종료되었습니다.</p> : <>
          <div className="replay-moment-list">{session.moments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={session.runtime} />)}</div>
          {session.moments.find((event) => event.type === 'collision') && <p>과거 기록은 장면 복기용으로 표시합니다. 새로운 판단 문제는 수정 판단 훈련에서 서로 다른 상황으로 연습할 수 있습니다.</p>}
        </>}
        <aside className="share-case-preparation">
          <div><strong>익명 학습 사례로 공유</strong><p>보관과 공유는 별도 기능입니다. 공유에 직접 동의한 경우에만 사례별 익명 별명으로 공개될 예정입니다.</p></div>
          <button type="button" disabled>공유 기능 준비 중</button>
        </aside>
      </section>}
    </li>
  }

  return (
    <section className={`page single-column result-page${activeTab === 'current' && collisionEvent ? ' result-has-collision' : ''}`} aria-labelledby="result-title">
      <p className="eyebrow">연습 결과</p>
      <h1 id="result-title">{challengeComplete ? '후진주차 상황 판단 훈련 완료' : result ? (result.success ? '주차 성공' : '아직 주차가 완료되지 않았습니다') : '연습 기록'}</h1>
      <div className="result-tabs" role="tablist" aria-label="결과 보기">
        <button type="button" role="tab" aria-selected={activeTab === 'current'} disabled={!hasCurrentResult} onClick={() => setSearchParams({ tab: 'current' })}>이번 연습</button>
        <button type="button" role="tab" aria-selected={activeTab === 'history'} onClick={() => setSearchParams({ tab: 'history' })}>연습 기록</button>
        <button type="button" role="tab" aria-selected={activeTab === 'community'} onClick={() => setSearchParams({ tab: 'community' })}>학습 사례</button>
      </div>

      {activeTab === 'current' && challengeComplete && <section className="challenge-result-summary">
        <strong>첫 선택 기준 {state?.challengeScore ?? 0} / {state?.challengeTotal ?? 6}문제를 정확히 판단했습니다.</strong>
        <p>위험 지점 발견부터 정지·간격 회복·재확인·다시 후진·최종 주차까지 차량 상태가 이어지는 수정 주차 연습을 완료했습니다.</p>
        <div className="result-actions"><Link className="primary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=practice`}>새 판단 훈련 시작</Link><Link className="secondary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=learning`}>직접 주차에 적용</Link></div>
      </section>}

      {activeTab === 'current' && result && <section className="current-result-dashboard" aria-label="이번 연습 핵심 결과">
        <div className="result-overview-column">
          <div className="result-summary-grid collision-only-summary">
            <article className={`result-card collision-result ${result.collisionCount ? 'needs-work' : 'good'}`}>
              <span>핵심 결과</span>
              <strong>{result.collisionCount ? `${result.collisionCount}회 충돌` : '충돌 없이 완료'}</strong>
              <p>{result.collisionCount ? '오른쪽에서 충돌 원인과 안전한 다음 행동을 바로 확인하세요.' : '장애물과 안전거리를 유지했습니다.'}</p>
              {collisionEvent && state?.runtime && <button type="button" className="collision-quiz-jump" onClick={openCollisionQuiz}>충돌 직전 판단 확인 →</button>}
            </article>
            {!result.success && <article className="result-card needs-work"><span>완료 상태</span><strong>{result.fullyInside ? '브레이크 확인 필요' : '차량 전체 진입 필요'}</strong><p>차량을 주차선 안에 넣고 완전히 정지해야 완료됩니다.</p></article>}
          </div>

          {!collisionEvent && <section className="no-collision-feedback"><strong>다음 연습</strong><p>같은 상황을 반복해 안정적인 주차 순서를 익혀보세요.</p></section>}

          <div className="result-actions result-primary-actions">
            <Link className="primary-button" to={retryPath}>같은 상황 다시 연습</Link>
            <Link className="secondary-button" to={`${retryPath}&lesson=1`}>단계 안내부터 다시</Link>
            <Link className="secondary-button" to="/practice">상황 선택</Link>
          </div>
        </div>

        <div className="result-detail-column">
          {collisionEvent && state?.runtime && <ResultCollisionQuiz event={collisionEvent} runtime={state.runtime} onRetry={() => retryAtEvent(collisionEvent)} />}

          {collisionEvent && !state?.runtime && collisionFeedback && <section className="collision-debrief" aria-labelledby="collision-debrief-title">
            <span>이전 형식의 연습 기록</span>
            <h2 id="collision-debrief-title">실제 배치 정보가 없어 판단 퀴즈를 만들 수 없습니다</h2>
            <div><strong>발생 원인</strong><p>{collisionFeedback.cause}</p></div>
            <div><strong>다음 행동</strong><p>{collisionFeedback.action}</p></div>
            <p>새 학습 연습부터 실제 차량 위치와 장애물 배치를 이용한 충돌 판단 퀴즈가 제공됩니다.</p>
            <button type="button" className="primary-button" onClick={() => retryAtEvent(collisionEvent)}>충돌 직전부터 다시 연습</button>
          </section>}
        </div>
      </section>}

      {activeTab === 'current' && replayMoments.length > 0 && <section className="replay-timeline" aria-labelledby="replay-title">
        <header><div><span>실제 주행 탑뷰</span><h2 id="replay-title">이번 연습의 주요 순간</h2></div><small>충돌과 최종 자세를 우선 표시합니다</small></header>
        <div className="replay-moment-list">{replayMoments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={state?.runtime} onRetry={event.type === 'collision' ? () => retryAtEvent(event) : undefined} />)}</div>
      </section>}

      {activeTab === 'community' && <section className="community-learning" aria-labelledby="community-learning-title">
        <header>
          <span>함께 배우는 주차 사례</span>
          <h2 id="community-learning-title">다른 연습자의 경험을 새로운 판단 문제로 만나보세요</h2>
          <p>공유에 동의한 기록만 개인 정보 없이 학습 사례로 제공할 예정입니다. 기록 원본이나 개인 보관 상태는 공개되지 않습니다.</p>
        </header>
        <div className="community-learning-flow" aria-label="학습 사례 이용 순서">
          <article><b>1</b><strong>상황 먼저 확인</strong><p>차량 배치와 위험한 모서리만 보고 스스로 판단합니다.</p></article>
          <article><b>2</b><strong>내 선택 결정</strong><p>정답을 보기 전에 멈춤과 수정 순서를 선택합니다.</p></article>
          <article><b>3</b><strong>경로 비교 복기</strong><p>익명 연습자의 선택과 안전한 경로를 비교합니다.</p></article>
        </div>
        <aside className="anonymous-case-preview">
          <div><span>익명 별명 예시 · {ANONYMOUS_ALIAS_COMBINATIONS.toLocaleString('ko-KR')}가지 조합</span><div className="anonymous-alias-examples">{[7, 289, 731, 1219].map((seed) => <strong key={seed}>{createAnonymousAlias(seed)}</strong>)}</div><p>공유 사례마다 귀여운 형용사와 동물을 조합합니다. 같은 사례에서는 같은 별명을 유지하지만 계정이나 다른 사례와는 연결하지 않습니다.</p></div>
          <button type="button" disabled>로그인·사례 공유 기능 준비 중</button>
        </aside>
      </section>}

      {activeTab === 'history' && <section className="practice-history" aria-labelledby="history-title">
        <header className="history-heading"><div><h2 id="history-title">나의 연습 기록</h2></div>{history.sessions.length > 0 && <button type="button" className="history-reset" onClick={() => { if (window.confirm('저장된 연습 기록을 모두 초기화할까요?')) setHistory(clearPracticeHistory()) }}>기록 초기화</button>}</header>
        <aside className="correction-practice-cta">
          <div><span>수정 주차 연습</span><strong>위험을 발견하고 안전하게 다시 주차하는 판단을 익혀보세요</strong><p>{recommendation?.mode === 'practice' ? recommendation.reason : '비스듬한 자세와 차량 모서리 접근 상황에서 정지·수정·재접근을 연습합니다.'}</p></div>
          <Link className="primary-button" to={correctionPracticePath}>수정 판단 훈련 시작 →</Link>
        </aside>
        {history.sessions.length === 0 ? <div className="history-empty"><strong>아직 저장된 기록이 없습니다</strong><p>연습 기록은 {PRACTICE_HISTORY_RETENTION_DAYS}일간 저장되며, 중요한 기록은 최대 {MAX_BOOKMARKED_SESSIONS}개까지 계속 보관할 수 있습니다.</p><Link className="primary-button result-start-link" to="/practice">첫 기록 만들기</Link></div> : <>
          {recommendation && recommendation.mode !== 'practice' && <aside className="next-practice">
            <div><span>다음 연습</span><p>{recommendation.reason}</p></div>
            <Link to={`/simulator?scenario=${recommendation.scenarioId}&mode=${recommendation.mode}`}>{recommendation.label} →</Link>
          </aside>}
          {bookmarkedSessions.length > 0 && <div className="recent-practice bookmarked-practice"><h3>보관한 기록 <small>{bookmarkedSessions.length} / {MAX_BOOKMARKED_SESSIONS} · 직접 해제하기 전까지 보관</small></h3><ol>{bookmarkedSessions.map(renderHistorySession)}</ol></div>}
          <div className="recent-practice"><h3>최근 {PRACTICE_HISTORY_RETENTION_DAYS}일 기록 <small>최대 {MAX_PRACTICE_SESSIONS}개</small></h3>{recentSessions.length > 0 ? <ol>{recentSessions.map(renderHistorySession)}</ol> : <p className="recent-history-empty">최근 {PRACTICE_HISTORY_RETENTION_DAYS}일 동안 저장된 기록이 없습니다.</p>}</div>
        </>}
      </section>}
    </section>
  )
}
