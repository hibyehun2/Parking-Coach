import { Link, useLocation } from 'react-router-dom'
import type { ParkingResult } from '../engine/parkingEvaluation'
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

export function ResultPage() {
  const location = useLocation()
  const state = location.state as {
    result?: ParkingResult
    scenarioId?: ScenarioId
    mode?: PracticeMode
  } | null
  const result = state?.result
  const retryPath = `/simulator?scenario=${state?.scenarioId ?? 'both-sides'}&mode=${state?.mode ?? 'learning'}`

  if (!result) {
    return (
      <section className="page single-column" aria-labelledby="result-title">
        <p className="eyebrow">연습 결과</p>
        <h1 id="result-title">저장된 결과가 없습니다</h1>
        <p className="page-description">주차 연습 화면에서 결과 확인을 눌러주세요.</p>
        <Link className="primary-button result-start-link" to="/simulator">연습하러 가기</Link>
      </section>
    )
  }

  return (
    <section className="page single-column" aria-labelledby="result-title">
      <p className="eyebrow">연습 결과</p>
      <h1 id="result-title">{result.success ? '주차 성공' : '아직 주차가 완료되지 않았습니다'}</h1>
      <p className="page-description">
        {result.success
          ? '차량 전체가 주차선 안에 있고 안전하게 정지했습니다.'
          : '아래 항목을 확인하고 다시 조정해보세요.'}
      </p>

      <div className="result-summary-grid">
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
      </div>

      <div className="result-actions">
        <Link className="primary-button" to={retryPath}>다시 연습하기</Link>
        <Link className="secondary-button" to={`${retryPath}&lesson=1`}>미니 레슨 다시 보기</Link>
        <Link className="secondary-button" to="/">상황 선택</Link>
      </div>
    </section>
  )
}
