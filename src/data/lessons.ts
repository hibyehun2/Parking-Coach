import type { ScenarioId } from '../types/practice'

export type LessonStep = {
  title: string
  description: string
  cue: string
  durationSeconds: number
  gear: 'D' | 'R'
  steering: '중앙' | '좌측 끝까지' | '우측 끝까지'
  check: string
}

export type MiniLesson = {
  scenarioId: ScenarioId
  title: string
  steps: LessonStep[]
}

export const LESSON_TRAJECTORIES = {
  approach: 'M70 90 H137',
  angle: 'M137 90 C152.38 90 167.13 83.89 178.01 73.01',
  reverseTurn: 'M178.01 73.01 C167.13 83.89 161.02 98.64 161.02 114.02',
  straightReverse: 'M161.02 114.02 V218',
  correctionForward: 'M160 164 V120',
  correctionReverse: 'M160 120 C160 155 138 180 160 200 C160 208 160 214 160 218',
} as const

export const LESSON_TRAJECTORY_GEOMETRY = {
  pixelsPerMeter: 68 / 4.6,
  turnRadiusPixels: 58,
  entryStop: { x: 137, y: 90, headingDegrees: 0 },
  angleStop: { x: 178.01, y: 73.01, headingDegrees: -45 },
  alignedStop: { x: 161.02, y: 114.02, headingDegrees: -90 },
} as const

export const lessons: Record<ScenarioId, MiniLesson> = {
  'both-sides': {
    scenarioId: 'both-sides',
    title: '양옆 차량 사이에 안전하게 넣기',
    steps: [
      { title: '진입 위치 맞추기', description: '핸들을 중앙에 두고 주차선과 약 50cm~2m 간격을 유지하며 직진합니다. 주차 공간 끝 선에 운전자 어깨를 맞추고 정지합니다.', cue: '먼저 나란히 진입해 회전할 공간을 확보하세요.', durationSeconds: 10, gear: 'D', steering: '중앙', check: '주차선 간격 · 끝 선과 운전자 어깨' },
      { title: '진입 각도 만들기', description: '주차 공간 반대 방향으로 핸들을 끝까지 돌려 천천히 전진합니다. 내 차 뒤 모서리가 주차칸 입구를 향하면 완전히 정지합니다.', cue: '양옆 차량과 앞부분의 회전 여유를 함께 확인하세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '양옆 차량 · 내 차 뒤 모서리와 주차칸 입구' },
      { title: '후진 준비하기', description: '완전히 정지한 상태에서 R로 바꾸고 주차 공간 방향으로 핸들을 끝까지 돌립니다. 움직이기 전에 양쪽 차량의 가까운 모서리를 확인합니다.', cue: '기어와 핸들 조작은 브레이크로 멈춘 상태에서 하세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: 'R 기어 · 주차 방향 최대 조향 · 양옆 모서리' },
      { title: '양쪽 간격을 보며 곡선 후진', description: '천천히 곡선 후진하며 좌우 간격뷰를 짧게 번갈아 봅니다. 양옆 차량 앞 모서리와 내 차가 가까워지는 쪽을 우선 확인하세요.', cue: '한쪽만 오래 보지 말고 왼쪽과 오른쪽을 교차 확인하세요.', durationSeconds: 14, gear: 'R', steering: '우측 끝까지', check: '좌측 간격뷰 ↔ 우측 간격뷰 · 양옆 앞 모서리' },
      { title: '평행 정렬 후 직선 후진', description: '차체와 주차선이 평행해지면 정지하고 핸들을 중앙으로 풉니다. 파란 기준선과 노란 예측선이 겹친 상태로 후방 거리를 확인하며 직선 후진합니다.', cue: '마지막에는 양쪽 주차선 간격과 뒤쪽 여유를 함께 확인하세요.', durationSeconds: 12, gear: 'R', steering: '중앙', check: '차체 평행 · 핸들 중앙 · 후방 거리선' },
    ],
  },
  'one-side': {
    scenarioId: 'one-side',
    title: '한쪽 차량의 앞 모서리 피하기',
    steps: [
      { title: '진입 위치 맞추기', description: '핸들을 중앙에 두고 주차선과 50cm~2m 간격으로 직진해 끝 선에 운전자 어깨를 맞추고 정지합니다.', cue: '차량이 배치된 쪽과 나란한 간격부터 안정적으로 만드세요.', durationSeconds: 10, gear: 'D', steering: '중앙', check: '끝 선과 어깨 · 차량이 있는 쪽 간격' },
      { title: '진입 각도 만들기', description: '주차 반대 방향으로 핸들을 끝까지 돌려 천천히 전진하고 내 차 뒤 모서리가 주차칸 입구를 향하면 완전히 정지합니다.', cue: '회전하는 내 차 앞부분과 배치된 차량을 함께 확인하세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '배치 차량 · 내 차 뒤 모서리와 주차칸 입구' },
      { title: '후진 준비하기', description: '멈춘 상태에서 R로 바꾸고 주차 방향으로 핸들을 끝까지 돌립니다. 차량이 있는 쪽 앞 모서리를 먼저 확인합니다.', cue: '움직이기 전에 가까워질 지점을 미리 찾으세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: 'R 기어 · 최대 조향 · 가까운 앞 모서리' },
      { title: '간격을 보며 곡선 후진', description: '차량이 있는 쪽 간격뷰를 우선 확인하면서 천천히 후진하고 반대쪽 주차선도 번갈아 봅니다.', cue: '가까운 쪽을 우선 보되 반대쪽 확인을 놓치지 마세요.', durationSeconds: 14, gear: 'R', steering: '우측 끝까지', check: '차량 쪽 간격뷰 ↔ 빈 공간 쪽 간격뷰' },
      { title: '평행 정렬 후 직선 후진', description: '주차선과 평행해지면 정지해 핸들을 중앙으로 돌립니다. 후방 가이드와 양쪽 선 간격을 확인하며 직선 후진합니다.', cue: '파란 기준선과 노란 예측선이 겹치는지 확인하세요.', durationSeconds: 12, gear: 'R', steering: '중앙', check: '평행 상태 · 후방 거리 · 좌우 간격' },
    ],
  },
  'wall-side': {
    scenarioId: 'wall-side',
    title: '벽면 쪽 안전거리 유지하기',
    steps: [
      { title: '진입 위치 맞추기', description: '핸들을 중앙에 두고 벽면과 충분한 간격을 유지하며 끝 선에 운전자 어깨를 맞추고 정지합니다.', cue: '벽면 쪽 회전 공간을 먼저 확보하세요.', durationSeconds: 10, gear: 'D', steering: '중앙', check: '끝 선과 어깨 · 벽면 간격' },
      { title: '진입 각도 만들기', description: '주차 공간 반대 방향으로 핸들을 끝까지 돌려 천천히 전진하고 내 차 뒤 모서리가 주차칸 입구를 향하면 완전히 정지합니다.', cue: '벽 반대편 차량과 내 차 뒤 범퍼의 여유를 기억하세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '벽 반대편 차량 · 내 차 뒤 모서리와 주차칸 입구' },
      { title: '후진 준비하기', description: '멈춘 상태에서 R로 바꾸고 주차 공간 방향으로 핸들을 끝까지 돌립니다. 벽과 반대편 차량의 가까운 모서리를 확인합니다.', cue: '기어와 핸들을 확인한 다음 천천히 움직이세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: 'R 기어 · 주차 방향 최대 조향 · 벽과 차량 간격' },
      { title: '간격을 보며 곡선 후진', description: '벽면 쪽 간격뷰를 우선 확인하며 천천히 후진하고 반대쪽 주차선도 번갈아 봅니다.', cue: '벽면 간격이 빠르게 줄면 브레이크로 멈추고 수정하세요.', durationSeconds: 14, gear: 'R', steering: '우측 끝까지', check: '벽면 쪽 간격뷰 ↔ 반대편 간격뷰' },
      { title: '평행 정렬 후 직선 후진', description: '주차선과 평행해지면 정지해 핸들을 중앙으로 돌리고 후방 거리선을 보며 직선 후진합니다.', cue: '깊이는 후방 가이드로, 좌우 간격은 양쪽 선으로 확인하세요.', durationSeconds: 12, gear: 'R', steering: '중앙', check: '평행 상태 · 핸들 중앙 · 후방 거리' },
    ],
  },
  'tight-entry': {
    scenarioId: 'tight-entry',
    title: '좁은 진입에서 안전하게 수정하기',
    steps: [
      { title: '위험한 간격에서 먼저 정지', description: '후진 중 앞 모서리가 옆 차량에 닿을 것 같으면 더 움직이지 말고 브레이크로 완전히 정지합니다.', cue: '천천히 움직이는 것보다 먼저 멈추는 것이 중요합니다.', durationSeconds: 10, gear: 'R', steering: '우측 끝까지', check: '가까운 앞 모서리 · 완전 정지' },
      { title: '핸들을 중앙으로 복귀', description: '정지 상태에서 핸들을 중앙으로 풀어 차체가 옆으로 더 밀리지 않게 준비합니다.', cue: '움직이면서 풀지 말고 멈춘 뒤 중앙으로 돌리세요.', durationSeconds: 10, gear: 'R', steering: '중앙', check: '브레이크 · 핸들 중앙' },
      { title: '짧게 전진해 공간 확보', description: 'D로 바꾸고 핸들을 중앙에 유지한 채 짧게 전진해 가까운 모서리의 간격을 다시 만듭니다.', cue: '많이 나가지 말고 양쪽 간격이 회복될 만큼만 전진하세요.', durationSeconds: 12, gear: 'D', steering: '중앙', check: '전진 거리 · 양쪽 앞 모서리' },
      { title: '양쪽을 재확인하고 재진입', description: '다시 정지해 R로 바꾸고 양쪽 간격을 확인한 뒤 주차 방향으로 조향해 재진입을 준비합니다.', cue: '한쪽만 넓어지지 않았는지 반대편도 확인하세요.', durationSeconds: 10, gear: 'R', steering: '우측 끝까지', check: '좌우 간격 · 수정된 진입각' },
      { title: '천천히 후진해 마무리', description: '곡선 후진을 다시 시작하고 평행해지면 핸들을 중앙으로 풀어 직선 후진합니다.', cue: '같은 지점이 다시 가까워지면 즉시 멈추고 수정 순서를 반복하세요.', durationSeconds: 14, gear: 'R', steering: '중앙', check: '평행 상태 · 후방 거리 · 방지턱 위치' },
    ],
  },
  'narrow-aisle': {
    scenarioId: 'narrow-aisle',
    title: '좁은 통로에서 안전하게 수정하기',
    steps: [
      { title: '통로 중앙으로 접근', description: '핸들을 중앙에 두고 목표 주차칸과 반대편 벽 양쪽에 회전 공간이 남도록 천천히 전진합니다.', cue: '주차칸만 보지 말고 앞쪽 벽과의 간격도 함께 확인하세요.', durationSeconds: 8, gear: 'D', steering: '중앙', check: '주차칸 측면 간격 · 반대편 벽 · 차체 평행' },
      { title: '진입 기준점에서 정지', description: '운전자 어깨가 목표 주차칸의 먼 쪽 끝 선에 맞으면 완전히 정지합니다.', cue: '움직이는 상태에서 기어와 핸들을 바꾸지 마세요.', durationSeconds: 8, gear: 'D', steering: '중앙', check: '운전자 어깨 · 먼 쪽 끝 선 · 완전 정지' },
      { title: '가능한 만큼 진입각 만들기', description: '주차칸 반대 방향으로 천천히 전진 조향합니다. 앞 모서리와 반대편 벽의 여유를 남기고 정지합니다.', cue: '고정된 각도보다 앞쪽 벽과의 실제 간격을 우선하세요.', durationSeconds: 10, gear: 'D', steering: '좌측 끝까지', check: '벽 쪽 앞 모서리 · 회전 궤적 · 후진 진입각' },
      { title: '첫 번째 곡선 후진', description: 'R로 바꾸고 주차칸 방향으로 조향해 천천히 후진합니다. 안쪽 뒤 모서리와 옆 차량의 간격이 빠르게 줄면 정지합니다.', cue: '한 번에 넣으려 하지 말고 위험 전에 멈추세요.', durationSeconds: 12, gear: 'R', steering: '우측 끝까지', check: '안쪽 뒤 모서리 · 옆 차량 · 앞쪽 벽' },
      { title: '위험 전에 멈추고 판단', description: '차량을 완전히 정지한 채 가장 가까운 모서리와 앞뒤 수정 공간을 확인합니다.', cue: '이 단계에서는 움직이지 말고 수정 방향부터 결정하세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: '가장 가까운 모서리 · 앞쪽 공간 · 뒤쪽 공간' },
      { title: '짧게 전진해 각도 재설정', description: 'D로 바꾸고 기존 위험 지점의 간격이 늘어나도록 짧게 전진한 뒤, 벽 여유 안에서 후진하기 좋은 각도를 다시 만듭니다.', cue: '반대편에 새로운 위험이 생기기 전에 다시 정지하세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '기존 위험 간격 증가 · 앞쪽 벽 · 수정된 차체 각도' },
      { title: '재진입하고 평행하게 마무리', description: 'R로 바꾸고 천천히 재진입합니다. 주차선과 평행해지면 정지해 핸들을 중앙으로 풀고 방지턱까지 직선 후진합니다.', cue: '앞 모서리와 양옆 간격을 번갈아 확인하며 마무리하세요.', durationSeconds: 14, gear: 'R', steering: '중앙', check: '재진입 간격 · 차체 평행 · 후방 거리 · 방지턱' },
    ],
  },
}

export function getLesson(scenarioId: ScenarioId) {
  return lessons[scenarioId]
}

export function lessonDuration(lesson: MiniLesson) {
  return lesson.steps.reduce((total, step) => total + step.durationSeconds, 0)
}
