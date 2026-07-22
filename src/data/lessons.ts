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
  steps: [LessonStep, LessonStep, LessonStep, LessonStep, LessonStep]
}

export const lessons: Record<ScenarioId, MiniLesson> = {
  'both-sides': {
    scenarioId: 'both-sides',
    title: '양옆 차량 사이에 안전하게 넣기',
    steps: [
      { title: '진입 위치 맞추기', description: '핸들을 중앙에 두고 주차선과 약 50cm~2m 간격을 유지하며 직진합니다. 주차 공간 끝 선에 운전자 어깨를 맞추고 정지합니다.', cue: '먼저 나란히 진입해 회전할 공간을 확보하세요.', durationSeconds: 10, gear: 'D', steering: '중앙', check: '주차선 간격 · 끝 선과 운전자 어깨' },
      { title: '진입 각도 만들기', description: '주차 반대 방향인 왼쪽으로 핸들을 끝까지 돌려 전진합니다. 사이드미러에서 내 차 뒷부분이 주차 공간 중간쯤 오면 정지합니다.', cue: '양옆 차량과 앞부분의 회전 여유를 함께 확인하세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '양옆 차량 · 내 차 뒤 모서리의 위치' },
      { title: '후진 준비하기', description: '완전히 정지한 상태에서 R로 바꾸고 주차 방향인 오른쪽으로 핸들을 끝까지 돌립니다. 움직이기 전에 양쪽 차량의 가까운 모서리를 확인합니다.', cue: '기어와 핸들 조작은 브레이크로 멈춘 상태에서 하세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: 'R 기어 · 오른쪽 최대 조향 · 양옆 모서리' },
      { title: '양쪽 간격을 보며 곡선 후진', description: '천천히 곡선 후진하며 좌우 간격뷰를 짧게 번갈아 봅니다. 양옆 차량 앞 모서리와 내 차가 가까워지는 쪽을 우선 확인하세요.', cue: '한쪽만 오래 보지 말고 왼쪽과 오른쪽을 교차 확인하세요.', durationSeconds: 14, gear: 'R', steering: '우측 끝까지', check: '좌측 간격뷰 ↔ 우측 간격뷰 · 양옆 앞 모서리' },
      { title: '평행 정렬 후 직선 후진', description: '차체와 주차선이 평행해지면 정지하고 핸들을 중앙으로 풉니다. 파란 기준선과 노란 예측선이 겹친 상태로 후방 거리를 확인하며 직선 후진합니다.', cue: '마지막에는 양쪽 주차선 간격과 뒤쪽 여유를 함께 확인하세요.', durationSeconds: 12, gear: 'R', steering: '중앙', check: '차체 평행 · 핸들 중앙 · 후방 거리선' },
    ],
  },
  'left-side': {
    scenarioId: 'left-side',
    title: '왼쪽 차량의 앞 모서리 피하기',
    steps: [
      { title: '진입 위치 맞추기', description: '핸들을 중앙에 두고 주차선과 50cm~2m 간격으로 직진해 끝 선에 운전자 어깨를 맞추고 정지합니다.', cue: '왼쪽 차량과 나란한 간격부터 안정적으로 만드세요.', durationSeconds: 10, gear: 'D', steering: '중앙', check: '끝 선과 어깨 · 왼쪽 차량 간격' },
      { title: '진입 각도 만들기', description: '핸들을 왼쪽 끝까지 돌려 전진하고 내 차 뒷부분이 주차 공간 중간에 오면 정지합니다.', cue: '회전하는 내 차 앞부분과 왼쪽 차량을 함께 확인하세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '왼쪽 차량 · 내 차 뒤 모서리' },
      { title: '후진 준비하기', description: '멈춘 상태에서 R로 바꾸고 핸들을 오른쪽 끝까지 돌립니다. 왼쪽 차량 앞 모서리의 위치를 먼저 확인합니다.', cue: '움직이기 전에 가까워질 지점을 미리 찾으세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: 'R 기어 · 오른쪽 최대 조향 · 왼쪽 앞 모서리' },
      { title: '간격을 보며 곡선 후진', description: '왼쪽 간격뷰를 우선 확인하면서 천천히 후진하되 오른쪽도 번갈아 보며 양쪽 주차선 간격을 비교합니다.', cue: '가까운 왼쪽을 우선 보되 반대쪽 확인을 놓치지 마세요.', durationSeconds: 14, gear: 'R', steering: '우측 끝까지', check: '왼쪽 간격뷰 ↔ 오른쪽 간격뷰' },
      { title: '평행 정렬 후 직선 후진', description: '주차선과 평행해지면 정지해 핸들을 중앙으로 돌립니다. 후방 가이드와 양쪽 선 간격을 확인하며 직선 후진합니다.', cue: '파란 기준선과 노란 예측선이 겹치는지 확인하세요.', durationSeconds: 12, gear: 'R', steering: '중앙', check: '평행 상태 · 후방 거리 · 좌우 간격' },
    ],
  },
  'right-side': {
    scenarioId: 'right-side',
    title: '오른쪽 차량과 안전거리 유지하기',
    steps: [
      { title: '진입 위치 맞추기', description: '핸들을 중앙에 두고 주차선과 50cm~2m 간격으로 직진해 끝 선에 운전자 어깨를 맞추고 정지합니다.', cue: '오른쪽 차량과 나란한 초기 간격을 확인하세요.', durationSeconds: 10, gear: 'D', steering: '중앙', check: '끝 선과 어깨 · 오른쪽 차량 간격' },
      { title: '진입 각도 만들기', description: '핸들을 왼쪽 끝까지 돌려 전진하고 내 차 뒷부분이 주차 공간 중간에 오면 정지합니다.', cue: '오른쪽 차량과 내 차 뒤 범퍼의 여유를 기억하세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '오른쪽 차량 · 내 차 뒤 모서리' },
      { title: '후진 준비하기', description: '멈춘 상태에서 R로 바꾸고 핸들을 오른쪽 끝까지 돌립니다. 오른쪽 차량의 가까운 모서리를 먼저 확인합니다.', cue: '기어와 핸들을 확인한 다음 천천히 움직이세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: 'R 기어 · 오른쪽 최대 조향 · 오른쪽 모서리' },
      { title: '간격을 보며 곡선 후진', description: '오른쪽 간격뷰를 우선 확인하며 천천히 후진하고 왼쪽도 번갈아 보며 양쪽 여유를 비교합니다.', cue: '간격이 빠르게 줄면 브레이크로 멈추고 다시 확인하세요.', durationSeconds: 14, gear: 'R', steering: '우측 끝까지', check: '오른쪽 간격뷰 ↔ 왼쪽 간격뷰' },
      { title: '평행 정렬 후 직선 후진', description: '주차선과 평행해지면 정지해 핸들을 중앙으로 돌리고 후방 거리선을 보며 직선 후진합니다.', cue: '깊이는 후방 가이드로, 좌우 간격은 양쪽 선으로 확인하세요.', durationSeconds: 12, gear: 'R', steering: '중앙', check: '평행 상태 · 핸들 중앙 · 후방 거리' },
    ],
  },
  'pillar-side': {
    scenarioId: 'pillar-side',
    title: '충전구역 표시와 주차선 구분하기',
    steps: [
      { title: '진입 위치 맞추기', description: '핸들을 중앙에 두고 실제 주차선과 간격을 유지해 끝 선에 운전자 어깨를 맞춘 뒤 정지합니다.', cue: '흐린 충전구역 표시와 연습 주차선을 구분하세요.', durationSeconds: 10, gear: 'D', steering: '중앙', check: '연습 주차선 · 끝 선과 어깨' },
      { title: '진입 각도 만들기', description: '핸들을 왼쪽 끝까지 돌려 전진하고 내 차 뒷부분이 주차 공간 중간에 오면 정지합니다.', cue: '바닥 아이콘이 아니라 흰색 주차선을 기준으로 각도를 만드세요.', durationSeconds: 12, gear: 'D', steering: '좌측 끝까지', check: '주차선 · 내 차 뒤 모서리' },
      { title: '후진 준비하기', description: '멈춘 상태에서 R로 바꾸고 핸들을 오른쪽 끝까지 돌린 뒤 양쪽 주차선 위치를 확인합니다.', cue: '기어와 핸들을 확인한 다음 천천히 움직이세요.', durationSeconds: 8, gear: 'R', steering: '우측 끝까지', check: 'R 기어 · 오른쪽 최대 조향 · 양쪽 주차선' },
      { title: '간격을 보며 곡선 후진', description: '좌우 간격뷰를 번갈아 보며 양쪽 주차선 안으로 천천히 곡선 후진합니다.', cue: '충전기 장식보다 차체와 주차선 사이 여유를 우선 보세요.', durationSeconds: 14, gear: 'R', steering: '우측 끝까지', check: '좌측 간격뷰 ↔ 우측 간격뷰' },
      { title: '평행 정렬 후 직선 후진', description: '차체가 평행해지면 정지해 핸들을 중앙으로 돌리고 후방 거리선을 보며 직선 후진합니다.', cue: '방지턱 반응은 보조 신호이며 후방 거리선으로 깊이를 확인하세요.', durationSeconds: 12, gear: 'R', steering: '중앙', check: '평행 상태 · 후방 거리 · 방지턱 위치' },
    ],
  },
}

export function getLesson(scenarioId: ScenarioId) {
  return lessons[scenarioId]
}

export function lessonDuration(lesson: MiniLesson) {
  return lesson.steps.reduce((total, step) => total + step.durationSeconds, 0)
}
