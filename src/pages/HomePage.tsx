import { useNavigate } from 'react-router-dom'

export function HomePage() {
  const navigate = useNavigate()
  const beginPractice = () => {
    window.dispatchEvent(new Event('parking-coach:dismiss-install-prompt'))
    navigate('/practice/scenario')
  }

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">PARKING COACH</p>
          <h1 id="home-title">후진주차를<br />내 속도로 익혀보세요.</h1>
          <p className="page-description">실제 차량 움직임과 사이드미러 시야를 보며 안전하게 반복 연습할 수 있어요.</p>
          <button className="primary-button hero-start" type="button" onClick={beginPractice}>
            연습 시작 <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="hero-preview" aria-label="주차 연습 미리보기">
          <div className="preview-road" aria-hidden="true">
            <span className="preview-car parked-one" />
            <span className="preview-car parked-two" />
            <span className="preview-car learner-car">P</span>
            <span className="turning-guide" />
          </div>
          <div className="preview-caption"><span>오늘의 연습</span><strong>천천히 움직이며 미러 속 간격을 확인하세요.</strong></div>
        </div>
      </section>
    </div>
  )
}
