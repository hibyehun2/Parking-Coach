import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ReplayMomentCard } from '../components/ReplayMomentCard'
import { ResultCollisionQuiz } from '../components/ResultCollisionQuiz'
import { AnimalAvatar } from '../components/AnimalAvatar'
import { LearningCaseViewer } from '../components/LearningCaseViewer'
import { JudgmentCanvas } from '../components/JudgmentQuiz'
import { buildCorrectionDrills } from '../engine/correctionDrills'
import type { ParkingResult } from '../engine/parkingEvaluation'
import { clearPracticeHistoryDb, fetchPracticeHistory, MAX_BOOKMARKED_SESSIONS, MAX_PRACTICE_SESSIONS, recommendPractice, retryPracticeShareDb, togglePracticeBookmarkDb, type CorrectionAttempt, type PracticeHistory, type PracticeSession } from '../engine/practiceHistory'
import { getScenario } from '../data/scenarios'
import { loadLearningCases, type LearningCase } from '../data/learningCases'
import type { JudgmentScenario } from '../engine/judgmentScenarios'
import type { ReplayEvent } from '../engine/sessionReplay'
import type { PracticeMode, ScenarioId, ScenarioRuntime } from '../types/practice'
import { acceptPracticeAutoShareConsent, hasPracticeAutoShareConsent, loadAnonymousNickname } from '../engine/userPreferences'
import { configuredPracticeSharingGateway, syncPracticeSharing, unpublishAllPracticeCases } from '../engine/practiceSharing'
import { loadSupabaseSession, subscribeSupabaseAuth, supabaseProfileNickname } from '../engine/supabaseClient'

const PRACTICE_HISTORY_RETENTION_DAYS = 7

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function useCompactLandscape() {
  const query = '(orientation: landscape) and (max-height: 600px)'
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true)

  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return matches
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5v16L12 17l-5.5 3.5z" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  )
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

function nextPracticeSummary(result: ParkingResult, steeringCentered: boolean) {
  if (result.collisionCount > 0) return '다음에는 위험 지점 앞에서 완전히 멈추고, 핸들을 중앙으로 푼 뒤 짧게 이동해 간격을 회복하세요.'
  if (!result.fullyInside) return '다음에는 좌우 간격을 번갈아 확인하며 차량 전체를 주차선 안에 넣어보세요.'
  if (!result.stopped) return '다음에는 최종 위치와 양쪽 간격을 확인한 뒤 브레이크로 완전히 정지하세요.'
  if (!steeringCentered) return '다음에는 차체가 평행해지면 핸들을 중앙으로 돌려놓고 직선으로 마무리하세요.'
  if (result.angleErrorDegrees > 5) return '다음에는 깊이보다 차체를 주차선과 평행하게 맞추는 데 집중하세요.'
  if (result.centerError > .3) return '다음에는 좌우 주차선 간격을 번갈아 비교하며 가운데로 조정하세요.'
  return '완전 정지와 조향 복귀를 잘 지켰습니다. 다음 연습에서도 같은 확인 순서를 유지하세요.'
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
  const [reviewView, setReviewView] = useState<'first' | 'safe'>('safe')
  const [expanded, setExpanded] = useState(false)
  const reviewScenario = attempt.reviewSnapshot?.scenario ?? scenario
  const firstChoice = attempt.reviewSnapshot?.firstChoice
    ?? reviewScenario?.choices.find((choice) => choice.label === attempt.firstChoiceLabel)
    ?? null
  const correctChoice = attempt.reviewSnapshot?.correctChoice
    ?? reviewScenario?.choices.find((choice) => choice.id === reviewScenario.answer)
    ?? null
  const hasTopView = Boolean(reviewScenario && runtime && firstChoice && correctChoice)
  const canCompareChoices = !attempt.firstTryCorrect
  const openExpanded = (view: 'first' | 'safe') => {
    setReviewView(canCompareChoices ? view : 'safe')
    setExpanded(true)
  }

  return (
    <li className="correction-review-card">
      <header><div><span>{attempt.drillTitle}</span><strong>{attempt.stepTitle}</strong></div><small>{attempt.firstTryCorrect ? '정확한 판단' : '우선 복기'}</small></header>
      {hasTopView && reviewScenario && runtime && firstChoice && correctChoice ? <div className="correction-path-comparison safe-preview-only">
        <figure className="safe-view">
          <JudgmentCanvas scenario={reviewScenario} choice={correctChoice} correct runtime={runtime} />
          <figcaption><span><i className="safe" />안전한 선택 결과</span><button type="button" onClick={() => openExpanded('safe')}>크게 보기</button></figcaption>
        </figure>
      </div> : <p className="review-topview-unavailable">이 기록은 탑뷰 저장 기능이 적용되기 전 기록입니다. 아래에서 당시 판단과 안전한 행동을 확인할 수 있습니다.</p>}
      <div className="correction-review-copy">
        {reviewScenario && <p><b>상황</b><span>{reviewScenario.situation}</span></p>}
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
      {expanded && reviewScenario && runtime && firstChoice && correctChoice && createPortal(<div className="review-topview-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setExpanded(false)
      }}>
        <section className="review-topview-dialog" role="dialog" aria-modal="true" aria-labelledby={`expanded-review-${attempt.drillId}-${attempt.stepId}`}>
          <header><div><span>판단 기록 탑뷰</span><h3 id={`expanded-review-${attempt.drillId}-${attempt.stepId}`}>{attempt.stepTitle}</h3></div><button type="button" aria-label="큰 탑뷰 닫기" onClick={() => setExpanded(false)}>×</button></header>
          {canCompareChoices && <div className="review-view-selector expanded-selector" role="group" aria-label="큰 탑뷰 선택">
            <button type="button" aria-pressed={reviewView === 'first'} onClick={() => setReviewView('first')}>내 선택</button>
            <button type="button" aria-pressed={reviewView === 'safe'} onClick={() => setReviewView('safe')}>안전한 선택</button>
          </div>}
          <figure>
            <JudgmentCanvas scenario={reviewScenario} choice={canCompareChoices && reviewView === 'first' ? firstChoice : correctChoice} correct={!canCompareChoices || reviewView === 'safe'} runtime={runtime} />
            <figcaption>{canCompareChoices && reviewView === 'first' ? '내가 선택한 동작의 결과' : attempt.firstTryCorrect ? '정답으로 선택한 안전한 동작의 결과' : '안전한 선택의 결과'}</figcaption>
          </figure>
          <div className="expanded-review-copy">
            <p><b>상황</b><span>{reviewScenario.situation}</span></p>
            <p><b>내 판단</b><span>{attempt.firstChoiceLabel}</span></p>
            {firstChoice.feedback && <p><b>이렇게 되면</b><span>{firstChoice.feedback}</span></p>}
            <div className="safe-action">
              <b>안전한 행동</b>
              {correctChoice.steps?.length
                ? <ol>{correctChoice.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                : <span>{attempt.correctChoiceLabel}</span>}
              {correctChoice.feedback && <small>{correctChoice.feedback}</small>}
            </div>
            <p className="correction-memory"><b>기억할 기준</b><span>{attempt.takeaway}</span></p>
          </div>
        </section>
      </div>, document.body)}
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
      {correctAttempts.length > 0 && <details className="correct-attempts correct-attempt-reviews">
        <summary>첫 선택에서 정확했던 판단 {correctAttempts.length}개</summary>
        <ol>{correctAttempts.map((attempt) => <CorrectionReviewCard
          key={`${attempt.drillId}-${attempt.stepId}`}
          attempt={attempt}
          scenario={findCorrectionScenario(session, attempt)}
          runtime={session.runtime}
        />)}</ol>
      </details>}
    </div>
  )
}

export function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  type ResultLocationState = {
    result?: ParkingResult
    scenarioId?: ScenarioId
    mode?: PracticeMode
    replay?: ReplayEvent[]
    runtime?: ScenarioRuntime
    challengeComplete?: boolean
    challengeScore?: number
    challengeTotal?: number
  }
  const incomingState = location.state as ResultLocationState | null
  const [initialState] = useState<ResultLocationState | null>(incomingState)
  const state = incomingState ?? initialState
  const isCompactLandscape = useCompactLandscape()
  const result = state?.result
  const challengeComplete = state?.challengeComplete === true
  const hasCurrentResult = Boolean(result || challengeComplete)
  const requestedTab = searchParams.get('tab')
  const activeTab = requestedTab === 'community' ? 'community' : requestedTab === 'history' || !hasCurrentResult ? 'history' : 'current'
  const replay = state?.replay ?? []
  const collisionEvent = replay.filter((event) => event.type === 'collision').at(-1)
  const collisionFeedback = collisionEvent ? collisionCoaching(collisionEvent) : null
  const [history, setHistory] = useState<PracticeHistory | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedCaseAuthorId, setSelectedCaseAuthorId] = useState<string | null>(null)
  const [learningCases, setLearningCases] = useState<LearningCase[]>([])
  const [nickname, setNickname] = useState(loadAnonymousNickname)

  useEffect(() => {
    let active = true
    void loadSupabaseSession().then((session) => {
      if (!active) return
      setNickname(supabaseProfileNickname(session?.user ?? null) ?? loadAnonymousNickname())
    })
    const unsubscribe = subscribeSupabaseAuth((nextUser) => {
      if (!active) return
      setNickname(supabaseProfileNickname(nextUser) ?? loadAnonymousNickname())
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])
  const [learningCasesStatus, setLearningCasesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    activeTab === 'community' ? 'loading' : 'idle',
  )
  const [selectedLearningCaseId, setSelectedLearningCaseId] = useState('')
  const [pendingShareSession, setPendingShareSession] = useState<PracticeSession | null>(null)
  const effectiveSelectedSessionId = selectedSessionId ?? (isCompactLandscape && activeTab === 'history' ? history?.sessions[0]?.id ?? null : null)
  const bookmarkedSessions = history?.sessions.filter((session) => session.bookmarked) ?? []
  const recentSessions = history?.sessions.filter((session) => !session.bookmarked) ?? []
  const recommendation = history ? recommendPractice(history.sessions) : null
  const retryPath = `/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=${state?.mode ?? 'learning'}`
  const correctionPracticePath = recommendation?.mode === 'practice'
    ? `/simulator?scenario=${recommendation.scenarioId}&mode=practice`
    : '/simulator?scenario=both-sides&mode=practice'
  const resultRecommendation = result
    ? result.collisionCount
      ? { label: '충돌 판단 확인하기', description: '충돌 직전 위험 지점과 안전한 수정 경로를 먼저 확인해보세요.', action: 'quiz' as const }
      : !result.fullyInside
        ? { label: '같은 상황 다시 연습', description: '차량 전체가 주차선 안에 들어오도록 진입 깊이와 차체 위치를 다시 맞춰보세요.', action: 'retry' as const }
        : !result.stopped
          ? { label: '완전 정지부터 다시 확인', description: '차량이 주차선 안에 들어온 뒤 브레이크로 완전히 정지해야 주차가 완료됩니다.', action: 'retry' as const }
          : result.angleErrorDegrees > 5
            ? { label: '평행 맞추기 판단 연습', description: '차체 각도를 먼저 바로잡는 판단을 집중해서 익혀보세요.', action: 'judgment' as const }
            : { label: '다른 주차 환경 연습하기', description: '안전하게 완료했습니다. 다른 배치에서도 같은 확인 순서를 적용해보세요.', action: 'scenario' as const }
    : null
  const replayMoments = replay
    .filter((event) => event.type === 'collision' || (event.type === 'finish' && result?.success))
    .slice(-3)
  const finalVehicle = replay.slice().reverse().find((event) => event.type === 'finish')?.vehicle
  const steeringCentered = finalVehicle ? Math.abs(finalVehicle.steeringAngle) < .08 : false
  const selectedLearningCase = learningCases.find((learningCase) => learningCase.id === selectedLearningCaseId) ?? learningCases[0]
  const changeResultTab = (tab: 'current' | 'history' | 'community') => {
    if (tab === 'community' && learningCasesStatus === 'idle') setLearningCasesStatus('loading')
    setSearchParams({ tab }, { state: state ?? undefined })
  }

  const retryAtEvent = (event: ReplayEvent) => navigate(retryPath, {
    state: { retryVehicle: { ...event.vehicle, braking: true, speed: 0 }, runtime: state?.runtime },
  })
  const openCollisionQuiz = () => {
    const quiz = document.getElementById('collision-judgment-quiz')
    quiz?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => document.getElementById('result-collision-quiz-title')?.focus({ preventScroll: true }), 350)
  }
  
  useEffect(() => {
    let active = true
    void fetchPracticeHistory().then(hist => {
      if (active) setHistory(hist)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!effectiveSelectedSessionId) return
    window.requestAnimationFrame(() => {
      document.getElementById(`history-session-${effectiveSelectedSessionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [effectiveSelectedSessionId])
  useEffect(() => {
    if (activeTab !== 'community' || learningCasesStatus !== 'loading') return
    let cancelled = false
    void loadLearningCases()
      .then((cases) => {
        if (cancelled) return
        setLearningCases(cases)
        setSelectedLearningCaseId(cases[0]?.id ?? '')
        setLearningCasesStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setLearningCasesStatus('error')
      })
    return () => { cancelled = true }
  }, [activeTab, learningCasesStatus])
  useEffect(() => {
    if (!configuredPracticeSharingGateway || !history || !history.sessions.some((session) => session.shareStatus === 'pending' || session.shareStatus === 'unpublishing')) return
    let cancelled = false
    void syncPracticeSharing(history, nickname, configuredPracticeSharingGateway).then((synced) => {
      if (!cancelled) setHistory(synced)
    })
    return () => { cancelled = true }
  }, [history])
  const applyBookmarkChange = async (session: PracticeSession) => {
    await togglePracticeBookmarkDb(session.id, new Date(), { targetState: !session.bookmarked, shareWhenAdded: !session.bookmarked })
    const updatedHistory = await fetchPracticeHistory()
    setHistory(updatedHistory)
    if (session.bookmarked) setSelectedSessionId(null)
  }
  const toggleBookmark = (session: PracticeSession) => {
    if (!session.bookmarked && !hasPracticeAutoShareConsent()) {
      setPendingShareSession(session)
      return
    }
    void applyBookmarkChange(session)
  }
  const acceptSharingAndBookmark = () => {
    if (!pendingShareSession) return
    acceptPracticeAutoShareConsent()
    void applyBookmarkChange(pendingShareSession)
    setPendingShareSession(null)
  }
  const retrySharing = async (session: PracticeSession) => {
    await retryPracticeShareDb(session.id)
    const updatedHistory = await fetchPracticeHistory()
    setHistory(updatedHistory)
  }
  const sharingFailureMessage = (session: PracticeSession) => {
    const code = session.shareError?.split(':').at(-1)
    if (code === 'login-required') return '로그인 상태를 다시 확인해주세요.'
    if (code === 'PGRST202' || code === '42883') return '공유 서버가 새 기능을 준비 중입니다. 잠시 후 다시 시도해주세요.'
    if (code === '23505') return '같은 기록이 이미 전송됐습니다. 앱을 다시 연 뒤 확인해주세요.'
    if (code === '42501') return '공유 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해주세요.'
    if (code === '23514') return '기록 형식을 확인하지 못했습니다. 새 연습 결과로 다시 시도해주세요.'
    return code ? `공유 오류 코드: ${code}` : '네트워크 연결과 로그인 상태를 확인해주세요.'
  }
  const resetHistory = async () => {
    if (!history) return
    if (!window.confirm('저장된 연습 기록을 모두 초기화할까요? 공개한 학습 사례도 함께 삭제됩니다.')) return
    const hasPublishedCases = history.sessions.some((session) => session.publicCaseId || session.shareStatus === 'shared' || session.shareStatus === 'unpublishing' || session.shareStatus === 'unpublish-failed')
    if (hasPublishedCases) {
      if (!configuredPracticeSharingGateway) {
        window.alert('공개한 사례를 먼저 삭제할 수 없어 기록을 초기화하지 않았습니다. 서버 연결을 확인해주세요.')
        return
      }
      try {
        await unpublishAllPracticeCases(configuredPracticeSharingGateway)
      } catch {
        window.alert('공개 사례 삭제를 확인하지 못해 기록을 유지했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
    }
    await clearPracticeHistoryDb()
    setHistory(await fetchPracticeHistory())
    setSelectedSessionId(null)
  }
  const renderHistoryDetail = (session: PracticeSession, idSuffix = 'inline') => {
    const detailId = `history-detail-${idSuffix}-${session.id}`
    const titleId = `history-detail-title-${idSuffix}-${session.id}`
    return <section id={detailId} className="history-detail" aria-labelledby={titleId}>
      <header><div><span>{session.bookmarked ? '보관한 기록' : '저장된 연습'}</span><h3 id={titleId}>{formatCompletedAt(session.completedAt)} 주요 순간</h3></div><button type="button" onClick={() => setSelectedSessionId(null)}>닫기</button></header>
      {session.correctionAttempts?.length ? <CorrectionHistoryReview session={session} /> : !session.moments?.length ? <p>이 기록은 상세 장면 저장 기능이 적용되기 전 기록이거나, 표시할 주요 순간 없이 종료되었습니다.</p> : <>
        <div className="replay-moment-list">{session.moments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={session.runtime} />)}</div>
        {session.moments.find((event) => event.type === 'collision') && <p>과거 기록은 장면 복기용으로 표시합니다. 새로운 판단 문제는 판단 연습에서 서로 다른 상황으로 연습할 수 있습니다.</p>}
      </>}
      <aside className="share-case-preparation">
        <div><strong>{session.shareStatus === 'shared' ? '학습 사례 공유됨' : session.shareStatus === 'pending' ? '학습 사례 공유 대기' : session.shareStatus === 'publish-failed' ? '공유하지 못함' : session.shareStatus === 'unpublishing' ? '공개 중단 대기' : session.shareStatus === 'unpublish-failed' ? '공개 중단 확인 필요' : '비공개로 보관됨'}</strong><p>{session.shareStatus === 'private' ? '공유 동의 전에 보관한 기존 기록은 비공개 상태로 유지됩니다.' : '학습에 필요한 결과만 공개 닉네임으로 공유하며, 서버에서 소유권과 동의 이력을 확인합니다.'}</p></div>
        {session.shareStatus === 'publish-failed' || session.shareStatus === 'unpublish-failed'
          ? <div className="share-retry-actions"><small>{sharingFailureMessage(session)}</small><button type="button" className="share-retry-button" onClick={() => void retrySharing(session)}>다시 시도</button></div>
          : <span className={`share-status share-${session.shareStatus}`}>{session.shareStatus === 'shared' ? '공유됨' : session.shareStatus === 'pending' ? '전송 대기' : session.shareStatus === 'unpublishing' ? '공개 중단 중' : '비공개'}</span>}
      </aside>
    </section>
  }
  const renderHistorySession = (session: PracticeSession) => {
    const isSelected = session.id === effectiveSelectedSessionId
    const detailId = isCompactLandscape ? `history-detail-landscape-${session.id}` : `history-detail-inline-${session.id}`
    return <li key={session.id} id={`history-session-${session.id}`} className={isSelected ? 'selected' : undefined}>
      <div className="session-row">
        <div><strong>{session.mode === 'practice' ? `${getScenario(session.scenarioId).title} · 판단 연습 ${session.quizScore ?? 0}/${session.quizTotal ?? 10}` : `${getScenario(session.scenarioId).title} · ${session.success ? '성공' : '미완료'}`}</strong><span>{formatCompletedAt(session.completedAt)} · {session.mode === 'learning' ? '직접 연습' : '판단 연습'}</span></div>
        <div className={`session-measures${session.mode === 'practice' || session.success && !session.collisionCount ? ' session-complete' : ' session-review'}`}>
          <span>{session.mode === 'practice' ? '판단 완료' : session.collisionCount ? `충돌 ${session.collisionCount}회` : session.success ? '안전 완료' : '미완료'}</span>
        </div>
        <div className="session-buttons">
          <button type="button" className={`bookmark-button${session.bookmarked ? ' bookmarked' : ''}`} aria-label={session.bookmarked ? '보관 및 공유 해제하기' : '이 기록 보관 및 공유하기'} aria-pressed={session.bookmarked} title={session.bookmarked ? '보관 및 공유 해제하기' : '보관하고 학습 사례로 공유하기'} onClick={() => toggleBookmark(session)}><BookmarkIcon filled={session.bookmarked} /></button>
          <button type="button" aria-expanded={isSelected} aria-controls={detailId} onClick={() => setSelectedSessionId(isCompactLandscape ? session.id : isSelected ? null : session.id)}>{isCompactLandscape && isSelected ? '선택됨' : isSelected ? '상세 닫기' : session.moments?.length || session.correctionAttempts?.length ? '상세 보기' : '요약 보기'}</button>
        </div>
      </div>
      {isSelected && !isCompactLandscape && renderHistoryDetail(session)}
    </li>
  }
  const renderReplayTimeline = (compact = false) => replayMoments.length > 0 && <section className={`replay-timeline${compact ? ' compact-replay-timeline' : ''}`} aria-labelledby={compact ? 'compact-replay-title' : 'replay-title'}>
    <header><div><span>실제 주행 탑뷰</span><h2 id={compact ? 'compact-replay-title' : 'replay-title'}>이번 연습의 주요 순간</h2></div><small>충돌과 최종 자세를 우선 표시합니다</small></header>
    <div className="replay-moment-list">{replayMoments.map((event) => <ReplayMomentCard key={event.id} event={event} runtime={state?.runtime} onRetry={event.type === 'collision' ? () => retryAtEvent(event) : undefined} />)}</div>
  </section>
  const selectedHistorySession = history?.sessions.find((session) => session.id === effectiveSelectedSessionId) ?? null

  return (
    <section className={`page single-column result-page${activeTab === 'current' && collisionEvent ? ' result-has-collision' : ''}`} aria-labelledby="result-title">
      <p className="eyebrow">연습 결과</p>
      <h1 id="result-title">{challengeComplete
        ? <span className="challenge-result-title"><span>후진주차 상황 판단</span>{' '}<span>연습 완료</span></span>
        : result ? (result.success ? '주차 성공' : '아직 주차가 완료되지 않았습니다') : '연습 기록'}</h1>
      <div className="result-tabs" role="tablist" aria-label="결과 보기">
        <button type="button" role="tab" aria-selected={activeTab === 'current'} disabled={!hasCurrentResult} onClick={() => changeResultTab('current')}>이번 연습</button>
        <button type="button" role="tab" aria-selected={activeTab === 'history'} onClick={() => changeResultTab('history')}>연습 기록</button>
        <button type="button" role="tab" aria-selected={activeTab === 'community'} onClick={() => changeResultTab('community')}>학습 사례</button>
      </div>

      {activeTab === 'current' && challengeComplete && <section className="challenge-result-summary">
        <strong>{(state?.challengeScore ?? 0) === (state?.challengeTotal ?? 6)
          ? '다음에는 같은 정지·간격 회복 순서를 직접 주차에 적용해보세요.'
          : '다음에는 틀린 판단부터 다시 보고, 움직이기 전에 정지와 조향 방향을 먼저 정하세요.'}</strong>
        <p>첫 선택 기준 {state?.challengeScore ?? 0} / {state?.challengeTotal ?? 6}문제를 정확히 판단했습니다.</p>
        <div className="result-actions"><Link className="primary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=practice`}>다른 판단 연습하기</Link><Link className="secondary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=learning`}>직접 연습에 적용</Link></div>
      </section>}

      {activeTab === 'current' && result && <section className={`current-result-dashboard${collisionEvent ? ' result-has-detail' : ''}${isCompactLandscape && !collisionEvent && replayMoments.length === 0 ? ' result-single-pane' : ''}`} aria-label="이번 연습 핵심 결과">
        <div className="result-overview-column">
          <article className={`result-card result-overview-card ${result.success && !result.collisionCount ? 'good' : 'needs-work'}`}>
            <span>다음 연습 한 줄</span>
            <strong className="next-practice-summary">{nextPracticeSummary(result, steeringCentered)}</strong>
            <span>실제 결과</span>
            <strong>{result.success
              ? result.collisionCount ? '주차는 완료했지만 충돌이 있었습니다' : '안전하게 주차를 완료했습니다'
              : result.fullyInside ? '주차선 안에서 완전히 정지해야 합니다' : '차량 전체가 아직 주차선 안에 들어오지 않았습니다'}</strong>
            <div className="result-metrics" aria-label="주차 결과 세부 수치">
              <div><small>주차선 안</small><b>{result.fullyInside ? '완료' : '미완료'}</b></div>
              <div><small>충돌</small><b>{result.collisionCount}회</b></div>
              <div><small>차체 각도</small><b>{result.angleErrorDegrees.toFixed(1)}°</b></div>
              <div><small>중앙 오차</small><b>{Math.round(result.centerError * 100)}cm</b></div>
            </div>
            <div className="driving-habits" aria-label="안전 습관 확인">
              <span className={result.stopped ? 'achieved' : 'needs-practice'}>
                <i aria-hidden="true">{result.stopped ? '✓' : '!'}</i>
                <b>{result.stopped ? '완전 정지' : '완전 정지 필요'}</b>
              </span>
              <span className={steeringCentered ? 'achieved' : 'needs-practice'}>
                <i aria-hidden="true">{steeringCentered ? '✓' : '!'}</i>
                <b>{steeringCentered ? '조향 복귀' : '조향 복귀 필요'}</b>
              </span>
            </div>
          </article>

          <div className="result-actions result-primary-actions">
            <div className="result-recommendation-copy">
              <span>추천 행동</span>
              <strong>{resultRecommendation?.label}</strong>
              <p>{resultRecommendation?.description}</p>
            </div>
            {resultRecommendation?.action === 'quiz'
              ? <button type="button" className="primary-button" onClick={openCollisionQuiz}>충돌 판단 확인하기</button>
              : resultRecommendation?.action === 'judgment'
                ? <Link className="primary-button" to={`/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=practice`}>판단 연습 시작</Link>
                : resultRecommendation?.action === 'scenario'
                  ? <Link className="primary-button" to="/practice">다른 주차 환경 연습하기</Link>
                  : <Link className="primary-button" to={retryPath}>같은 상황 다시 연습</Link>}
            {resultRecommendation?.action !== 'retry' && <Link className="secondary-button" to={retryPath}>같은 상황 다시 연습</Link>}
            <div className="result-more-actions">
              <Link to={`${retryPath}&lesson=1`}>단계 안내부터</Link>
              <Link to="/practice">환경 선택</Link>
            </div>
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
          {isCompactLandscape && renderReplayTimeline(true)}
        </div>
      </section>}

      {activeTab === 'current' && !isCompactLandscape && renderReplayTimeline()}

      {activeTab === 'community' && <section className="community-learning" aria-labelledby="community-learning-title">
        <header>
          <div><span>함께 배우는 주차 사례</span></div>
          <h2 id="community-learning-title">공유된 연습에서 안전한 판단 기준을 찾아보세요</h2>
          <p>공유에 동의한 연습 결과만 공개 닉네임으로 표시되며, 계정 정보와 원본 주행 데이터는 공개하지 않습니다.</p>
        </header>
        {learningCasesStatus === 'loading' && <div className="history-empty" role="status"><strong>학습 사례를 불러오는 중입니다</strong><p>공유된 사례를 안전하게 확인하고 있어요.</p></div>}
        {learningCasesStatus === 'error' && <div className="history-empty" role="alert"><strong>학습 사례를 불러오지 못했습니다</strong><p>네트워크 연결을 확인한 뒤 다시 시도해주세요.</p><button type="button" className="secondary-button" onClick={() => setLearningCasesStatus('loading')}>다시 시도</button></div>}
        {learningCasesStatus === 'ready' && learningCases.length === 0 && <div className="history-empty"><strong>아직 공유된 학습 사례가 없습니다</strong><p>보관한 연습 기록의 공유에 동의하면 첫 사례가 될 수 있습니다.</p><button type="button" className="secondary-button" onClick={() => changeResultTab('history')}>내 연습 기록 보기</button></div>}
        {learningCasesStatus === 'ready' && learningCases.length > 0 && (isCompactLandscape ? <div className="learning-case-browser">
          <div className="learning-case-master" aria-label="공개 학습 사례">
            {learningCases.map((learningCase) => <button key={learningCase.id} type="button" className={learningCase.id === selectedLearningCase?.id && !selectedCaseAuthorId ? 'selected' : undefined} onClick={() => {
              setSelectedCaseAuthorId(null)
              setSelectedLearningCaseId(learningCase.id)
            }}>
              <span>{learningCase.scenario} · {learningCase.sharedLabel}</span>
              <strong>{learningCase.title}</strong>
              <small><AnimalAvatar nickname={learningCase.nickname} className="case-author-avatar" /><span className="case-author-name">{learningCase.nickname}</span></small>
            </button>)}
          </div>
          <aside className="learning-case-detail" aria-live="polite">
            {selectedCaseAuthorId ? (() => {
              const authorCases = learningCases.filter((learningCase) => learningCase.authorId === selectedCaseAuthorId)
              const nickname = authorCases[0]?.nickname
              return <>
                <header><div><span>공개 학습 사례</span><h3>{nickname}</h3><small>{authorCases.length}개의 공유 사례</small></div><button type="button" onClick={() => setSelectedCaseAuthorId(null)}>선택한 사례로 돌아가기</button></header>
                <ol>{authorCases.map((learningCase) => <li key={learningCase.id}><span>{learningCase.scenario} · {learningCase.sharedLabel}</span><strong>{learningCase.title}</strong><p>{learningCase.takeaway}</p></li>)}</ol>
              </>
            })() : selectedLearningCase && <>
              <header><div><span>{selectedLearningCase.scenario}</span><h3>{selectedLearningCase.title}</h3></div><small>{selectedLearningCase.sharedLabel}</small></header>
              <button type="button" className="case-author-link" onClick={() => setSelectedCaseAuthorId(selectedLearningCase.authorId)}><AnimalAvatar nickname={selectedLearningCase.nickname} className="case-author-avatar" /><span className="case-author-name">{selectedLearningCase.nickname}의 다른 사례 보기 →</span></button>
              <p>{selectedLearningCase.summary}</p>
              <div><span>기억할 기준</span><strong>{selectedLearningCase.takeaway}</strong></div>
              <LearningCaseViewer learningCase={selectedLearningCase} />
            </>}
          </aside>
        </div> : <div className="learning-case-grid" aria-label="공개 학습 사례">
          {learningCases.map((learningCase) => <article key={learningCase.id} className="learning-case-card">
            <header><button type="button" onClick={() => setSelectedCaseAuthorId(learningCase.authorId)}><AnimalAvatar nickname={learningCase.nickname} className="case-author-avatar" /><span className="case-author-name">{learningCase.nickname}</span></button><small>{learningCase.sharedLabel}</small></header>
            <span>{learningCase.scenario}</span><strong>{learningCase.title}</strong><p>{learningCase.summary}</p><small>{learningCase.takeaway}</small>
            <LearningCaseViewer learningCase={learningCase} />
          </article>)}
        </div>)}
        {!isCompactLandscape && selectedCaseAuthorId && (() => {
          const authorCases = learningCases.filter((learningCase) => learningCase.authorId === selectedCaseAuthorId)
          const nickname = authorCases[0]?.nickname
          return <div className="case-author-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedCaseAuthorId(null)
          }}>
            <section className="case-author-panel" role="dialog" aria-modal="true" aria-labelledby="case-author-title">
              <header>
                <div><span>공개 학습 사례</span><h3 id="case-author-title"><AnimalAvatar nickname={nickname ?? ''} className="case-author-avatar" /><span className="case-author-name">{nickname}</span></h3><small>{authorCases.length}개의 공유 사례</small></div>
                <button type="button" aria-label="사례 목록 닫기" onClick={() => setSelectedCaseAuthorId(null)}>×</button>
              </header>
              <ol>{authorCases.map((learningCase) => <li key={learningCase.id}>
                <span>{learningCase.scenario} · {learningCase.sharedLabel}</span>
                <strong>{learningCase.title}</strong>
                <p>{learningCase.takeaway}</p>
              </li>)}</ol>
              <p>이 공개 닉네임으로 공유에 동의한 사례만 표시됩니다.</p>
            </section>
          </div>
        })()}
      </section>}

      {activeTab === 'history' && <section className="practice-history" aria-labelledby="history-title">
        <header className="history-heading"><div><h2 id="history-title">나의 연습 기록</h2>{history && history.sessions.length > 0 && <small className="history-scroll-cue"><span aria-hidden="true">↕</span> 위아래로 밀어 더 보기</small>}</div>{history && history.sessions.length > 0 && <button type="button" className="history-reset" onClick={() => { void resetHistory() }}>기록 초기화</button>}</header>
        {!history ? <div className="history-empty" role="status"><strong>기록을 불러오는 중입니다...</strong></div> : <div className={isCompactLandscape ? 'history-browser' : undefined}>
          <div className={isCompactLandscape ? 'history-master' : undefined}>
            <aside className="correction-practice-cta">
              <div><span>수정 주차 연습</span><strong>위험을 발견하고 안전하게 다시 주차하는 판단을 익혀보세요</strong><p>{recommendation?.mode === 'practice' ? recommendation.reason : '비스듬한 자세와 차량 모서리 접근 상황에서 정지·수정·재접근을 연습합니다.'}</p></div>
              <Link className="primary-button" to={correctionPracticePath}>판단 연습 시작 →</Link>
            </aside>
            {history.sessions.length === 0 ? <div className="history-empty"><strong>아직 저장된 기록이 없습니다</strong><p>연습 기록은 서버에 안전하게 저장되며 언제든 조회할 수 있습니다.</p><Link className="primary-button result-start-link" to="/practice">첫 기록 만들기</Link></div> : <>
              {recommendation && recommendation.mode !== 'practice' && <aside className="next-practice"><div><span>다음 연습</span><p>{recommendation.reason}</p></div><Link to={`/simulator?scenario=${recommendation.scenarioId}&mode=${recommendation.mode}`}>{recommendation.label} →</Link></aside>}
              {bookmarkedSessions.length > 0 && <div className="recent-practice bookmarked-practice"><h3>보관한 기록 <small>{bookmarkedSessions.length} / {MAX_BOOKMARKED_SESSIONS} · 직접 해제하기 전까지 보관</small></h3><ol>{bookmarkedSessions.map(renderHistorySession)}</ol></div>}
              <div className="recent-practice"><h3>최근 {PRACTICE_HISTORY_RETENTION_DAYS}일 기록 <small>최대 {MAX_PRACTICE_SESSIONS}개</small></h3>{recentSessions.length > 0 ? <ol>{recentSessions.map(renderHistorySession)}</ol> : <p className="recent-history-empty">최근 {PRACTICE_HISTORY_RETENTION_DAYS}일 동안 저장된 기록이 없습니다.</p>}</div>
            </>}
          </div>
          {isCompactLandscape && <aside className="history-master-detail">
            {selectedHistorySession ? renderHistoryDetail(selectedHistorySession, 'landscape') : <div className="history-detail-empty"><strong>확인할 기록을 선택하세요</strong><p>왼쪽 목록에서 기록을 선택하면 주요 순간과 판단 내용을 볼 수 있습니다.</p></div>}
          </aside>}
        </div>}
      </section>}
      {pendingShareSession && <div className="share-consent-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setPendingShareSession(null)
      }}>
        <section className="share-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="share-consent-title">
          <span>최초 1회 확인</span>
          <h2 id="share-consent-title">보관한 기록을 학습 사례로 공유할까요?</h2>
          <p>앞으로 책갈피로 보관한 기록은 <strong>{nickname}</strong> 닉네임으로 자동 공유됩니다.</p>
          <ul>
            <li>주차 상황, 결과와 학습 기준만 공유합니다.</li>
            <li>기기 정보와 사용자를 식별하는 정보는 공유하지 않습니다.</li>
            <li>책갈피를 해제하면 공개 중단을 요청합니다.</li>
          </ul>
          <div><button type="button" className="secondary-button" onClick={() => setPendingShareSession(null)}>취소</button><button type="button" className="primary-button" onClick={acceptSharingAndBookmark}>동의하고 보관</button></div>
        </section>
      </div>}
    </section>
  )
}
