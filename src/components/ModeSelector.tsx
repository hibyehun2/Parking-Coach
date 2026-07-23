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
  recommended?: boolean
}> = [
  {
    id: 'practice',
    title: '수정 판단 훈련',
    description: '다양한 충돌 직전 상황에서 안전하게 멈추고 위치를 고치는 방법을 익혀요.',
    features: ['움직이는 10가지 상황', '선택 결과 확인', '좌우 무작위'],
    recommended: true,
  },
  {
    id: 'learning',
    title: '학습 모드',
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
