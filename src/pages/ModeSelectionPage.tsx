import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ModeSelector } from '../components/ModeSelector'
import { getScenario } from '../data/scenarios'
import type { PracticeMode } from '../types/practice'

export function ModeSelectionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scenarioId = searchParams.get('scenario')
  const scenario = getScenario(scenarioId)
  const [mode, setMode] = useState<PracticeMode | null>(null)
  if (!scenarioId || scenario.id !== scenarioId) return <Navigate to="/practice/scenario" replace />

  const start = () => {
    if (!mode) return
    navigate(`/simulator?scenario=${scenario.id}&mode=${mode}`)
  }
  return (
    <section className="page choice-page" aria-labelledby="mode-title">
      <header className="choice-header">
        <button type="button" className="icon-back" onClick={() => navigate('/practice/scenario')}>‹</button>
        <div><p className="eyebrow">2 / 2 · {scenario.title}</p><h1 id="mode-title">연습 방식</h1><p>필요한 안내 수준을 선택하세요.</p></div>
      </header>
      <ModeSelector value={mode} onChange={setMode} />
      {mode && <section className="start-panel floating-start"><div><span>준비 완료</span><strong>{scenario.title} · {mode === 'learning' ? '학습 모드' : '실전 모드'}</strong></div><button className="primary-button" type="button" onClick={start}>연습 시작 →</button></section>}
    </section>
  )
}
