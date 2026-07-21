import type { Scenario } from '../types/practice'

export const scenarios: Scenario[] = [
  {
    id: 'both-sides',
    title: '양옆 차량',
    description: '좁은 아파트 주차장에서 양쪽 간격을 익혀요.',
    difficulty: '첫 번째 연습',
    visual: 'cars-both',
    available: true,
  },
  {
    id: 'left-side',
    title: '왼쪽 차량',
    description: '왼쪽 앞부분의 회전 반경을 확인해요.',
    difficulty: '기본',
    visual: 'car-left',
    available: true,
  },
  {
    id: 'right-side',
    title: '오른쪽 차량',
    description: '오른쪽 미러로 차체 간격을 확인해요.',
    difficulty: '기본',
    visual: 'car-right',
    available: true,
  },
  {
    id: 'pillar-side',
    title: '기둥 옆',
    description: '고정 장애물과 안전거리를 유지해요.',
    difficulty: '응용',
    visual: 'pillar',
    available: true,
  },
]

export function getScenario(id: string | null) {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0]
}
