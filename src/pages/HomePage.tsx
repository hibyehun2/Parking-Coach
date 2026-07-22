import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModeSelector } from '../components/ModeSelector'
import { ScenarioCard } from '../components/ScenarioCard'
import { scenarios } from '../data/scenarios'
import type { PracticeMode, ScenarioId } from '../types/practice'

export function HomePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'intro' | 'scenario' | 'mode'>('intro')
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId | null>(null)
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (step === 'intro') return
    const titleId = step === 'scenario' ? 'scenario-title' : 'mode-title'
    window.requestAnimationFrame(() => document.getElementById(titleId)?.focus())
  }, [step])

  const beginPracticeFlow = () => {
    window.dispatchEvent(new Event('parking-coach:dismiss-install-prompt'))
    setStep('scenario')
  }

  const startPractice = () => {
    if (!selectedScenario || !selectedMode) return
    const query = new URLSearchParams({
      scenario: selectedScenario,
      mode: selectedMode,
    })
    navigate(`/simulator?${query.toString()}`)
  }

  return (
    <div className="home-page">
      {step === 'intro' && <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">초보 운전자를 위한 원리 중심 연습</p>
          <h1 id="home-title">후진주차,<br />외우지 말고 이해하세요.</h1>
          <p className="page-description">
            차량 뒤쪽의 움직임부터 미러를 보는 시점까지, 실제 주차장에서
            바로 떠올릴 수 있도록 차근차근 연습해요.
          </p>
          <button className="primary-button" type="button" onClick={beginPracticeFlow}>
            연습하기
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="hero-preview" aria-label="주차 원리 미리보기">
          <div className="preview-road" aria-hidden="true">
            <span className="preview-car parked-one" />
            <span className="preview-car parked-two" />
            <span className="preview-car learner-car">P</span>
            <span className="turning-guide" />
          </div>
          <div className="preview-caption">
            <span>오늘의 핵심 원리</span>
            <strong>핸들을 돌린 방향으로 차량 뒤쪽이 움직여요.</strong>
          </div>
        </div>
      </section>}

      {step === 'scenario' && <section className="home-section selection-flow" aria-labelledby="scenario-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">1 / 2 · 상황 선택</p>
            <h2 id="scenario-title" tabIndex={-1}>어떤 주차를 연습할까요?</h2>
          </div>
          <p>처음이라면 ‘양옆 차량’을 추천해요.</p>
        </div>
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              selected={selectedScenario === scenario.id}
              onSelect={(scenarioId) => {
                setSelectedScenario(scenarioId)
                setSelectedMode(null)
                setStep('mode')
              }}
            />
          ))}
        </div>
        <button type="button" className="secondary-button flow-back" onClick={() => setStep('intro')}>← 홈으로</button>
      </section>}

      {step === 'mode' && <section className="home-section mode-section selection-flow" aria-labelledby="mode-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">2 / 2 · 연습 방식</p>
            <h2 id="mode-title" tabIndex={-1}>도움이 얼마나 필요하신가요?</h2>
          </div>
          <p>선택한 상황 · {scenarios.find((item) => item.id === selectedScenario)?.title}</p>
        </div>
        <ModeSelector value={selectedMode} onChange={setSelectedMode} />
        <button type="button" className="secondary-button flow-back" onClick={() => setStep('scenario')}>← 상황 다시 선택</button>
      </section>}

      {step === 'mode' && selectedMode && <section className="start-panel" aria-label="선택한 연습 시작">
        <div>
          <span>선택 완료</span>
          <strong>
            {scenarios.find((item) => item.id === selectedScenario)?.title} ·{' '}
            {selectedMode === 'learning' ? '학습 모드' : '실전 모드'}
          </strong>
        </div>
        <button className="primary-button" type="button" onClick={startPractice}>
          연습 시작
          <span aria-hidden="true">→</span>
        </button>
      </section>}
    </div>
  )
}
