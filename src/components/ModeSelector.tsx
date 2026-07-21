import type { PracticeMode } from '../types/practice'

type ModeSelectorProps = {
  value: PracticeMode
  onChange: (mode: PracticeMode) => void
}

const modes: Array<{
  id: PracticeMode
  title: string
  description: string
  features: string[]
}> = [
  {
    id: 'learning',
    title: '학습 모드',
    description: '처음 원리를 익힐 때 추천해요.',
    features: ['조향 힌트', '미러 확인 안내', '위험 경고'],
  },
  {
    id: 'practice',
    title: '실전 모드',
    description: '도움 없이 판단하고 연습해요.',
    features: ['실시간 힌트 없음', '완료 후 분석'],
  },
]

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-grid" role="radiogroup" aria-label="연습 모드">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="radio"
          aria-checked={value === mode.id}
          className={`mode-card${value === mode.id ? ' selected' : ''}`}
          onClick={() => onChange(mode.id)}
        >
          <span className="mode-radio" aria-hidden="true" />
          <span className="mode-copy">
            <strong>{mode.title}</strong>
            <span>{mode.description}</span>
            <span className="mode-features">
              {mode.features.map((feature) => <small key={feature}>{feature}</small>)}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
