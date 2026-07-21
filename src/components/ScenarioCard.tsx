import type { Scenario, ScenarioId } from '../types/practice'

type ScenarioCardProps = {
  scenario: Scenario
  selected: boolean
  onSelect: (id: ScenarioId) => void
}

export function ScenarioCard({ scenario, selected, onSelect }: ScenarioCardProps) {
  return (
    <button
      type="button"
      className={`scenario-card${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(scenario.id)}
    >
      <span className={`scenario-visual ${scenario.visual}`} aria-hidden="true">
        <span className="parking-bay" />
        <span className="obstacle obstacle-left" />
        <span className="obstacle obstacle-right" />
      </span>
      <span className="scenario-card-heading">
        <strong>{scenario.title}</strong>
        <span>{scenario.difficulty}</span>
      </span>
      <span className="scenario-description">{scenario.description}</span>
      <span className="selection-indicator" aria-hidden="true">✓</span>
    </button>
  )
}
