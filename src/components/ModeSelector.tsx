import type { PracticeMode } from '../types/practice'

type ModeSelectorProps = {
  value: PracticeMode | null
  onChange: (mode: PracticeMode) => void
}

const modes: Array<{
  id: PracticeMode
  title: string
  compactLabel: string
  description: string
  features: string[]
  recommended?: boolean
}> = [
  {
    id: 'practice',
    title: '판단 연습',
    compactLabel: '상황을 보고 판단',
    description: '주차 중 생길 수 있는 상황을 살펴보고 안전하게 위치를 고치는 방법을 익혀요.',
    features: ['판단 유형 선택', '선택 결과가 다음 단계로', '완료한 판단 다시 연습'],
    recommended: true,
  },
  {
    id: 'learning',
    title: '직접 연습',
    compactLabel: '차량을 직접 조작',
    description: '단계별 안내를 보며 차량을 직접 조작해 후진주차를 연습해요.',
    features: ['단계별 탑뷰', '실시간 조향 안내', '위험 경고'],
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
            <strong>{mode.title}{mode.recommended && <em>먼저 추천</em>}</strong>
            <span className="mode-description">{mode.description}</span>
            <small className="mode-compact-label">{mode.compactLabel}</small>
            <span className="mode-features">
              {mode.features.map((feature) => <small key={feature}>{feature}</small>)}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
