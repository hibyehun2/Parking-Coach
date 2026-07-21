export function ResultPage() {
  return (
    <section className="page single-column" aria-labelledby="result-title">
      <p className="eyebrow">연습 결과</p>
      <h1 id="result-title">이번 연습 결과</h1>
      <p className="page-description">연습 기록과 피드백이 표시될 화면 구조입니다.</p>
      <div className="result-placeholder">
        <strong>아직 저장된 연습 결과가 없습니다.</strong>
        <span>시뮬레이터 완성 후 결과를 확인할 수 있습니다.</span>
      </div>
    </section>
  )
}
