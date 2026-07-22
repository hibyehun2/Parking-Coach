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
  steps: [LessonStep, LessonStep, LessonStep]
}

export const lessons: Record<ScenarioId, MiniLesson> = {
  'both-sides': {
    scenarioId: 'both-sides',
    title: '양옆 차량 사이에 안전하게 넣기',
    steps: [
      { title: '간격을 두고 진입 각도 만들기', description: '주차선과 약 50cm~2m 간격을 두고 진입해 주차 공간 끝 선에 운전자 어깨를 맞춥니다. 주차 반대 방향인 왼쪽으로 핸들을 끝까지 돌려 전진하고, 사이드미러에서 내 차 뒷부분이 주차 공간 중간쯤 오면 정지합니다.', cue: '회전 전에 양옆 공간이 충분한지 확인하고, 기준점에서는 완전히 정지하세요.', durationSeconds: 18, gear: 'D', steering: '좌측 끝까지', check: '주차선 간격 · 끝 선과 어깨 · 사이드미러의 뒤 모서리' },
      { title: '양쪽 사이드미러로 후진 진입', description: 'R로 바꾸고 주차 방향인 오른쪽으로 핸들을 끝까지 돌려 천천히 후진합니다. 후방카메라보다 좌우 사이드미러를 번갈아 보며 양옆 차량과 주차선 간격을 확인하세요.', cue: '한쪽만 오래 보지 말고 왼쪽과 오른쪽 간격을 짧게 교차 확인하세요.', durationSeconds: 18, gear: 'R', steering: '우측 끝까지', check: '좌측 미러 ↔ 우측 미러 · 양옆 차량 앞 모서리' },
      { title: '평행하면 중앙 복귀 후 마무리', description: '차체와 주차선이 평행해지면 정지하고 핸들을 정중앙으로 풀어 바퀴를 일자로 만듭니다. 이제 후방 가이드로 뒤쪽 장애물과 거리를 확인하며 직선 후진해 마무리합니다.', cue: '핸들을 중앙으로 돌릴 때와 최종 정지 전에는 반드시 브레이크로 차를 멈추세요.', durationSeconds: 16, gear: 'R', steering: '중앙', check: '차체와 주차선 평행 · 후방 거리 가이드' },
    ],
  },
  'left-side': {
    scenarioId: 'left-side',
    title: '왼쪽 차량의 앞 모서리 피하기',
    steps: [
      { title: '왼쪽 차량과 간격 두고 각도 만들기', description: '주차선과 50cm~2m 간격을 두고 끝 선에 어깨를 맞춥니다. 핸들을 왼쪽 끝까지 돌려 전진하고, 내 차 뒷부분이 주차 공간 중간에 오면 정지합니다.', cue: '왼쪽 차량과 내 차 앞부분이 가까워지지 않는지 함께 확인하세요.', durationSeconds: 18, gear: 'D', steering: '좌측 끝까지', check: '끝 선과 어깨 · 왼쪽 차량 · 뒤 모서리 위치' },
      { title: '좌우 미러를 번갈아 보며 진입', description: 'R과 오른쪽 최대 조향으로 후진합니다. 특히 왼쪽 차량 앞 모서리를 확인하되, 오른쪽 미러도 번갈아 보며 양쪽 선 간격을 비교하세요.', cue: '후방카메라보다 좌우 사이드미러의 간격 확인이 우선입니다.', durationSeconds: 18, gear: 'R', steering: '우측 끝까지', check: '좌측 미러 ↔ 우측 미러' },
      { title: '평행에서 핸들 중앙과 후방 확인', description: '차체와 주차선이 평행하면 정지해 핸들을 중앙으로 돌립니다. 후방 가이드로 장애물과 남은 거리를 확인하며 직선 후진합니다.', cue: '마지막에도 양쪽 주차선 간격이 비슷한지 한 번 더 확인하세요.', durationSeconds: 15, gear: 'R', steering: '중앙', check: '평행 상태 · 후방 거리 · 좌우 간격' },
    ],
  },
  'right-side': {
    scenarioId: 'right-side',
    title: '오른쪽 차량과 안전거리 유지하기',
    steps: [
      { title: '오른쪽 차량과 간격 두고 각도 만들기', description: '주차선과 50cm~2m 간격을 유지해 끝 선에 어깨를 맞춥니다. 핸들을 왼쪽 끝까지 돌려 전진하고, 뒤 모서리가 주차 공간 중간에 오면 정지합니다.', cue: '각도를 만들 때 오른쪽 차량과 뒤 범퍼 사이 여유를 기억하세요.', durationSeconds: 18, gear: 'D', steering: '좌측 끝까지', check: '우측 차량 간격 · 끝 선과 어깨' },
      { title: '우측 간격과 반대편을 교차 확인', description: 'R과 오른쪽 최대 조향으로 천천히 후진합니다. 우측 미러에서 가까운 뒤 모서리를 확인한 뒤 좌측 미러도 번갈아 확인하세요.', cue: '간격이 빠르게 줄면 즉시 정지하고 양쪽 상황을 다시 확인하세요.', durationSeconds: 18, gear: 'R', steering: '우측 끝까지', check: '우측 미러 ↔ 좌측 미러' },
      { title: '평행에서 중앙 복귀 후 마무리', description: '주차선과 평행하면 정지해 핸들을 중앙으로 돌립니다. 후방 가이드로 장애물과 거리를 확인하면서 직선 후진하세요.', cue: '후방 가이드는 마지막 깊이 조절에 사용하고 좌우 간격은 미러로 확인하세요.', durationSeconds: 15, gear: 'R', steering: '중앙', check: '평행 상태 · 후방 거리' },
    ],
  },
  'pillar-side': {
    scenarioId: 'pillar-side',
    title: '기둥과 회전 여유 확보하기',
    steps: [
      { title: '기둥 위치를 기억하고 각도 만들기', description: '주차선과 50cm~2m 간격으로 끝 선에 어깨를 맞춥니다. 기둥 위치를 확인한 뒤 핸들을 왼쪽 끝까지 돌려 전진하고, 뒤 모서리가 주차 공간 중간에 오면 정지합니다.', cue: '기둥이 미러 사각지대로 사라지기 전 위치와 거리를 기억하세요.', durationSeconds: 18, gear: 'D', steering: '좌측 끝까지', check: '기둥 위치 · 끝 선과 어깨 · 뒤 모서리' },
      { title: '기둥 쪽 미러와 반대편 교차 확인', description: 'R과 오른쪽 최대 조향으로 후진합니다. 기둥 쪽 미러를 우선 보되 반대편 미러도 번갈아 보며 양쪽 여유를 확인하세요.', cue: '기둥과의 간격이 불확실하면 즉시 정지하세요.', durationSeconds: 18, gear: 'R', steering: '우측 끝까지', check: '기둥 쪽 미러 ↔ 반대편 미러' },
      { title: '평행에서 중앙 복귀 후 깊이 조절', description: '차체가 주차선과 평행하면 정지해 핸들을 중앙으로 돌립니다. 후방 가이드로 장애물과 거리를 확인하며 직선 후진합니다.', cue: '기둥 쪽 문을 열 공간도 남았는지 마지막으로 확인하세요.', durationSeconds: 15, gear: 'R', steering: '중앙', check: '평행 상태 · 후방 거리 · 기둥 여유' },
    ],
  },
}

export function getLesson(scenarioId: ScenarioId) {
  return lessons[scenarioId]
}

export function lessonDuration(lesson: MiniLesson) {
  return lesson.steps.reduce((total, step) => total + step.durationSeconds, 0)
}
