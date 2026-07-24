import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ModeSelector } from '../components/ModeSelector'
import { ScenarioCard } from '../components/ScenarioCard'
import { scenarios } from '../data/scenarios'
import { requestDirectPracticeLandscape } from '../engine/screenOrientation'
import type { PracticeMode, ScenarioId } from '../types/practice'

function validScenario(value: string | null): ScenarioId | null {
  return scenarios.some((scenario) => scenario.id === value && scenario.available) ? value as ScenarioId : null
}

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [scenarioId, setScenarioId] = useState<ScenarioId>(() => validScenario(searchParams.get('scenario')) ?? scenarios[0].id)
  const [mode, setMode] = useState<PracticeMode>('learning')
  const scenario = scenarios.find((item) => item.id === scenarioId)

  const start = () => {
    if (mode === 'learning') void requestDirectPracticeLandscape()
    navigate(`/simulator?scenario=${scenarioId}&mode=${mode}`)
  }

  return (
    <section className="page practice-setup" aria-labelledby="practice-setup-title">
      <header className="setup-header">
        <button type="button" className="icon-back" onClick={() => navigate('/')}>‹</button>
        <div><p className="eyebrow">연습 설정</p><h1 id="practice-setup-title">어떻게 연습할까요?</h1></div>
      </header>
      <div className="setup-grid">
        <section className="setup-section" aria-labelledby="setup-scenario-title">
          <div className="setup-section-heading"><span>1</span><h2 id="setup-scenario-title">상황 선택</h2></div>
          <div className="scenario-grid compact-scenario-grid">
            {scenarios.map((item) => <ScenarioCard key={item.id} scenario={item} selected={scenarioId === item.id} onSelect={setScenarioId} />)}
          </div>
        </section>
        <section className="setup-section" aria-labelledby="setup-mode-title">
          <div className="setup-section-heading"><span>2</span><h2 id="setup-mode-title">연습 방식</h2></div>
          <ModeSelector value={mode} onChange={setMode} />
        </section>
      </div>
      <footer className="setup-action">
        <div><span>준비 완료</span><strong>{scenario?.title} · {mode === 'learning' ? '직접 연습' : '판단 연습'}</strong></div>
        <button type="button" className="primary-button" onClick={start}>연습 시작 →</button>
      </footer>
    </section>
  )
}
