import { useNavigate } from 'react-router-dom'
import { ScenarioCard } from '../components/ScenarioCard'
import { scenarios } from '../data/scenarios'

export function ScenarioSelectionPage() {
  const navigate = useNavigate()
  return (
    <section className="page choice-page" aria-labelledby="scenario-title">
      <header className="choice-header">
        <button type="button" className="icon-back" onClick={() => navigate('/')}>‹</button>
        <div><p className="eyebrow">1 / 2</p><h1 id="scenario-title">연습 상황</h1><p>가장 익숙해지고 싶은 상황을 선택하세요.</p></div>
      </header>
      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            selected={false}
            onSelect={(scenarioId) => navigate(`/practice/mode?scenario=${scenarioId}`)}
          />
        ))}
      </div>
    </section>
  )
}
