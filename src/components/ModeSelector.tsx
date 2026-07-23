import type { PracticeMode } from '../types/practice'

type ModeSelectorProps = {
  value: PracticeMode | null
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
    description: '좁은 진입 위험을 보고 안전한 수정 순서를 판단해요.',
    features: ['움직이는 상황 문제', '선택 결과 확인', '좌우 무작위'],
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
