import type { Scenario, ScenarioId } from '../types/practice'
import bothSidesImage from '../assets/scenario-both-sides-v3-wide.png'
import narrowAisleImage from '../assets/scenario-narrow-aisle-v4-wide-reversing.png'

type ScenarioCardProps = {
  scenario: Scenario
  selected: boolean
  onSelect: (id: ScenarioId) => void
}

export function ScenarioCard({ scenario, selected, onSelect }: ScenarioCardProps) {
  const image = scenario.id === 'both-sides'
    ? bothSidesImage
    : scenario.id === 'narrow-aisle'
      ? narrowAisleImage
      : null

  return (
    <button
      type="button"
      className={`scenario-card${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      disabled={!scenario.available}
      onClick={() => onSelect(scenario.id)}
    >
      <span className={`scenario-visual ${scenario.visual}`} aria-hidden="true">
        {image
          ? <>
            <img className="scenario-image-watermark" src={image} alt="" />
            <img className="scenario-image-primary" src={image} alt="" />
          </>
          : <>
            <span className="parking-bay" />
            <span className="obstacle obstacle-left" />
            <span className="obstacle obstacle-right" />
          </>}
      </span>
      <span className="scenario-card-copy">
        <span className="scenario-card-heading">
          <strong>{scenario.title}</strong>
          <span>{scenario.difficulty}</span>
        </span>
        <span className="scenario-description">{scenario.description}</span>
      </span>
      <span className="selection-indicator" aria-hidden="true">{scenario.available ? '✓' : '준비 중'}</span>
    </button>
  )
}
