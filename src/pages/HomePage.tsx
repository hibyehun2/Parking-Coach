import { useNavigate } from 'react-router-dom'
import heroImage from '../assets/parking-coach-hero-reverse-low-angle-v2.png'
import { loadPracticeHistory, todayPracticeMessage } from '../engine/practiceHistory'

export function HomePage() {
  const navigate = useNavigate()
  const practiceMessage = todayPracticeMessage(loadPracticeHistory().sessions)
  const beginPractice = () => {
    window.dispatchEvent(new Event('parking-coach:dismiss-install-prompt'))
    navigate('/practice')
  }

  return (
    <div className="home-page">
      <section className="home-hero compact-home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">PARKING COACH</p>
          <h1 id="home-title">
            <span>후진 주차,</span>{' '}
            <span>판단하고 연습해요.</span>
          </h1>
          <p className="page-description">
            <span>안전한 수정 방법을 익히고,</span>{' '}
            <span>단계별 안내에 따라 후진 주차를 연습해요.</span>
          </p>
          <button className="primary-button hero-start" type="button" onClick={beginPractice}>
            연습 방식 선택 <span aria-hidden="true">→</span>
          </button>
          <div className="home-hero-visual">
            <img src={heroImage} alt="후진등을 켠 초록색 차량이 두 차량 사이 주차칸으로 후진하는 모습" />
            <div className="preview-caption"><span>오늘의 연습</span><strong>{practiceMessage}</strong></div>
          </div>
        </div>
      </section>
    </div>
  )
}
