import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { ParkingResult } from '../engine/parkingEvaluation'
import {
  calculatePracticeTrend,
  clearPracticeHistory,
  countMistakes,
  loadPracticeHistory,
  recommendPractice,
  type MistakeType,
} from '../engine/practiceHistory'
import { getScenario } from '../data/scenarios'
import {
  analyzeParkingResult,
  firstMistakeEvent,
  type ReplayEvent,
} from '../engine/sessionReplay'
import type { PracticeMode, ScenarioId } from '../types/practice'

function alignmentFeedback(error: number) {
  if (error <= 0.15) return '중앙에 매우 정확하게 정렬했습니다.'
  if (error <= 0.35) return '중앙 정렬이 양호합니다.'
  return '주차칸 중심에 조금 더 가깝게 맞춰보세요.'
}

function angleFeedback(error: number) {
  if (error <= 2) return '차량 각도가 주차선과 거의 평행합니다.'
  if (error <= 5) return '각도 정렬이 양호합니다.'
  return '핸들을 중앙으로 돌려 차량 각도를 더 평행하게 맞춰보세요.'
}

const MISTAKE_LABELS: Record<MistakeType, string> = {
  collision: '충돌',
  'off-center': '중앙 정렬',
  angle: '각도 정렬',
}

const TREND_COPY = {
  insufficient: ['기록 수집 중', '4회 이상 연습하면 최근 기록과 이전 기록을 비교합니다.'],
  improving: ['개선 중', '최근 연습의 충돌·중심·각도 오차가 이전보다 줄었습니다.'],
  steady: ['안정적', '최근 결과가 비슷하게 유지되고 있습니다. 추천 항목을 집중해보세요.'],
  'needs-focus': ['집중 연습 필요', '최근 오차가 이전보다 늘었습니다. 속도를 낮추고 기준점을 다시 확인하세요.'],
} as const

function formatCompletedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as {
    result?: ParkingResult
    scenarioId?: ScenarioId
    mode?: PracticeMode
    replay?: ReplayEvent[]
  } | null
  const result = state?.result
  const replay = state?.replay ?? []
  const insights = result ? analyzeParkingResult(result) : null
  const mistakeEvent = result ? firstMistakeEvent(replay, result) : null
  const [history, setHistory] = useState(loadPracticeHistory)
  const mistakeCounts = countMistakes(history.sessions)
  const trend = calculatePracticeTrend(history.sessions)
  const recommendation = recommendPractice(history.sessions)
  const recommendedScenario = getScenario(recommendation.scenarioId)
  const retryPath = `/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=${state?.mode ?? 'learning'}`

  const resetHistory = () => {
    if (!window.confirm('저장된 연습 기록을 모두 초기화할까요?')) return
    setHistory(clearPracticeHistory())
  }

  return (
    <section className="page single-column" aria-labelledby="result-title">
      <p className="eyebrow">연습 결과</p>
      <h1 id="result-title">{result ? (result.success ? '주차 성공' : '아직 주차가 완료되지 않았습니다') : '연습 기록'}</h1>
      <p className="page-description">
        {result ? (result.success
          ? '차량 전체가 주차선 안에 있고 안전하게 정지했습니다.'
          : '아래 항목을 확인하고 다시 조정해보세요.')
          : '최근 주차 결과와 자주 하는 실수를 확인해보세요.'}
      </p>

      {result && <div className="result-summary-grid">
        <article className={`result-card ${result.fullyInside ? 'good' : 'needs-work'}`}>
          <span>주차선</span>
          <strong>{result.fullyInside ? '차량 전체 진입' : '일부가 선 밖에 있음'}</strong>
          <p>{result.fullyInside ? '네 모서리가 모두 주차선 안에 있습니다.' : '차량 전체가 주차선 안에 들어오도록 조정하세요.'}</p>
        </article>
        <article className={`result-card ${result.stopped ? 'good' : 'needs-work'}`}>
          <span>정지 상태</span>
          <strong>{result.stopped ? '안전하게 정지' : '차량 이동 중'}</strong>
          <p>{result.stopped ? '브레이크가 작동된 상태입니다.' : '브레이크를 작동한 뒤 결과를 확인하세요.'}</p>
        </article>
        <article className="result-card">
          <span>중앙 정렬</span>
          <strong>중심 오차 {Math.round(result.centerError * 100)}cm</strong>
          <p>{alignmentFeedback(result.centerError)}</p>
        </article>
        <article className="result-card">
          <span>각도 정렬</span>
          <strong>각도 오차 {result.angleErrorDegrees.toFixed(1)}°</strong>
          <p>{angleFeedback(result.angleErrorDegrees)}</p>
        </article>
        <article className={`result-card collision-result ${result.collisionCount ? 'needs-work' : 'good'}`}>
          <span>충돌 기록</span>
          <strong>{result.collisionCount ? `${result.collisionCount}회 충돌` : '충돌 없음'}</strong>
          <p>{result.collisionCount ? '충돌 위치가 연습 화면에 기록되었습니다.' : '장애물과 안전거리를 유지했습니다.'}</p>
        </article>
      </div>}

      {result && <div className="result-actions">
        <Link className="primary-button" to={retryPath}>다시 연습하기</Link>
        <Link className="secondary-button" to={`${retryPath}&lesson=1`}>처음부터 재시작</Link>
        {mistakeEvent && (
          <button
            type="button"
            className="secondary-button mistake-retry"
            onClick={() => navigate(retryPath, { state: { retryVehicle: mistakeEvent.vehicle } })}
          >
            실수 지점 재시도
          </button>
        )}
        <Link className="secondary-button" to="/practice">상황 선택</Link>
      </div>}

      {result && insights && (
        <section className="result-coaching" aria-labelledby="coaching-title">
          <h2 id="coaching-title">이번 연습 분석</h2>
          <div>
            <article className="coaching-good">
              <span>잘한 점</span>
              {insights.wellDone.length ? <ul>{insights.wellDone.map((item) => <li key={item}>{item}</li>)}</ul> : <p>완료된 항목이 아직 없습니다.</p>}
            </article>
            <article className="coaching-mistakes">
              <span>주요 실수</span>
              {insights.mistakes.length ? <ul>{insights.mistakes.map((item) => <li key={item}>{item}</li>)}</ul> : <p>기록된 주요 실수가 없습니다.</p>}
            </article>
            <article className="coaching-actions">
              <span>개선 행동</span>
              {insights.improvements.length ? <ul>{insights.improvements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>현재 동작을 유지하며 응용 상황에 도전해보세요.</p>}
            </article>
          </div>
        </section>
      )}

      {result && replay.length > 0 && (
        <section className="replay-timeline" aria-labelledby="replay-title">
          <header>
            <div><span>세션 리플레이</span><h2 id="replay-title">주요 순간 타임라인</h2></div>
            <small>{replay.length}개 이벤트</small>
          </header>
          <ol>
            {replay.map((event) => (
              <li key={event.id} className={`replay-${event.type}`}>
                <time>{event.elapsedSeconds.toFixed(1)}초</time>
                <i aria-hidden="true" />
                <div>
                  <strong>{event.label}</strong>
                  <span>기어 {event.vehicle.gear} · 조향 {(event.vehicle.steeringAngle * 180 / Math.PI).toFixed(0)}°</span>
                </div>
                {event.type === 'collision' && (
                  <button type="button" onClick={() => navigate(retryPath, { state: { retryVehicle: event.vehicle } })}>여기서 재시도</button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="practice-history" aria-labelledby="history-title">
        <header className="history-heading">
          <div>
            <p className="eyebrow">11단계 · 실수 분석</p>
            <h2 id="history-title">나의 연습 기록</h2>
          </div>
          {history.sessions.length > 0 && <button type="button" className="history-reset" onClick={resetHistory}>기록 초기화</button>}
        </header>

        {history.sessions.length === 0 ? (
          <div className="history-empty">
            <strong>아직 저장된 기록이 없습니다</strong>
            <p>주차를 완료하고 파킹 버튼을 누르면 최근 10회의 결과가 여기에 저장됩니다.</p>
            <Link className="primary-button result-start-link" to="/practice">첫 기록 만들기</Link>
          </div>
        ) : (
          <>
            <div className="history-insights">
              <article className={`history-trend trend-${trend}`}>
                <span>개선 추이</span>
                <strong>{TREND_COPY[trend][0]}</strong>
                <p>{TREND_COPY[trend][1]}</p>
              </article>
              <article className="history-recommendation">
                <span>맞춤 연습 추천</span>
                <strong>{recommendedScenario.title}</strong>
                <p>{recommendation.reason}</p>
                <Link to={`/simulator?scenario=${recommendation.scenarioId}&mode=learning`}>추천 연습 시작 →</Link>
              </article>
            </div>

            <div className="mistake-summary" aria-label="자주 하는 실수 집계">
              {(Object.entries(mistakeCounts) as [MistakeType, number][]).map(([mistake, count]) => (
                <article key={mistake} className={count ? 'has-mistakes' : ''}>
                  <span>{MISTAKE_LABELS[mistake]}</span>
                  <strong>{count}회</strong>
                </article>
              ))}
            </div>

            <div className="recent-practice">
              <h3>최근 기록 <small>최대 10개</small></h3>
              <ol>
                {history.sessions.map((session) => (
                  <li key={session.id}>
                    <div>
                      <strong>{getScenario(session.scenarioId).title}</strong>
                      <span>{formatCompletedAt(session.completedAt)} · {session.mode === 'learning' ? '학습' : '실전'}</span>
                    </div>
                    <div className="session-measures">
                      <span>중심 {Math.round(session.centerError * 100)}cm</span>
                      <span>각도 {session.angleErrorDegrees.toFixed(1)}°</span>
                      <span>충돌 {session.collisionCount}회</span>
                    </div>
                    <small>{session.mistakes.length ? session.mistakes.map((mistake) => MISTAKE_LABELS[mistake]).join(' · ') : '실수 없음'}</small>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </section>
    </section>
  )
}
