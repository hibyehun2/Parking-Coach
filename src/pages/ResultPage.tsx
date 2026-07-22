import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  const state = location.state as {
    result?: ParkingResult
    scenarioId?: ScenarioId
    mode?: PracticeMode
  } | null
  const result = state?.result
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
        <Link className="secondary-button" to={`${retryPath}&lesson=1`}>미니 레슨 다시 보기</Link>
        <Link className="secondary-button" to="/practice">상황 선택</Link>
      </div>}

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
