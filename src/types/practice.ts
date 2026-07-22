export type ScenarioId = 'both-sides' | 'left-side' | 'right-side' | 'pillar-side'

export type PracticeMode = 'learning' | 'practice'

export type Scenario = {
  id: ScenarioId
  title: string
  description: string
  difficulty: string
  visual: 'cars-both' | 'car-left' | 'car-right' | 'ev-space'
  available: boolean
}
