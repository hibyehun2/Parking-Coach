import type { ScenarioId } from '../types/practice'

export type LessonStep = {
  title: string
  description: string
  cue: string
  durationSeconds: number
  gear: 'D' | 'R'
  steering: '중앙' | '우측 끝까지'
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
      { title: '사람 한 명 간격에서 핸들 풀기', description: '기본 진입을 진행하다 옆 차 또는 주차선과 내 차 뒷부분의 간격이 사람 한 명 지나갈 정도가 되면 정지하고 핸들을 중앙으로 돌립니다.', cue: '차가 움직이는 동안 핸들을 풀지 말고 완전히 정지한 뒤 중앙에 맞추세요.', durationSeconds: 15, gear: 'D', steering: '중앙', check: '뒤 모서리와 옆 차 · 주차선 간격' },
      { title: '빨간 50cm 선까지 직선 후진', description: '핸들을 중앙에 둔 채 천천히 직선 후진합니다. 차량 뒤 빨간선의 주차 방향 모서리가 주차 라인과 겹치면 정지하세요.', cue: '빨간선은 뒤 범퍼에서 50cm 기준입니다. 파란선은 현재 조향에 따른 진행 경로입니다.', durationSeconds: 17, gear: 'R', steering: '중앙', check: '빨간 50cm 선 모서리 · 주차 라인' },
      { title: '주차 방향으로 끝까지 조향', description: '정지 상태에서 주차할 방향으로 핸들을 끝까지 돌린 뒤 다시 천천히 후진합니다. 차체가 주차선과 평행해지면 다시 정지해 핸들을 중앙으로 돌립니다.', cue: '회전 중에는 안쪽 뒤 모서리와 반대편으로 벌어지는 앞부분을 번갈아 확인하세요.', durationSeconds: 17, gear: 'R', steering: '우측 끝까지', check: '파란 진행 경로 · 양쪽 주차선' },
    ],
  },
  'left-side': {
    scenarioId: 'left-side',
    title: '왼쪽 차량의 앞 모서리 피하기',
    steps: [
      { title: '회전할 앞 공간 확보', description: 'D와 핸들 중앙으로 전진해 뒤 범퍼가 주차칸 오른쪽 선을 지난 뒤 정지합니다.', cue: '너무 일찍 후진하면 왼쪽 차량과의 진입 각도가 급해집니다.', durationSeconds: 14, gear: 'D', steering: '중앙', check: '차량 뒤 가이드 · 주차칸 입구 기준선' },
      { title: '뒤는 안쪽, 앞은 바깥쪽', description: 'R로 바꾸고 핸들을 우측 끝까지 돌려 천천히 후진합니다. 뒤는 칸으로 들어가지만 앞은 왼쪽으로 크게 움직입니다.', cue: '왼쪽 차량 앞 범퍼와 내 차 왼쪽 앞 모서리가 가장 위험합니다.', durationSeconds: 17, gear: 'R', steering: '우측 끝까지', check: '좌측 미러와 화면의 왼쪽 앞 모서리' },
      { title: '왼쪽 선을 곧게 만들기', description: '좌측 미러에서 주차선이 차체와 거의 평행해질 때 정지하고 핸들을 중앙으로 돌린 뒤 직선 후진합니다.', cue: '왼쪽 간격만 보지 말고 마지막에는 양쪽 간격을 비교하세요.', durationSeconds: 14, gear: 'R', steering: '중앙', check: '좌측 미러 → 우측 미러' },
    ],
  },
  'right-side': {
    scenarioId: 'right-side',
    title: '오른쪽 차량과 안전거리 유지하기',
    steps: [
      { title: '오른쪽 진입점 확인', description: 'D와 핸들 중앙으로 전진합니다. 뒤 범퍼가 주차칸 오른쪽 선을 조금 지나면 완전히 정지하세요.', cue: '기어 변경 전 정지는 실제 운전에서도 반드시 지켜야 합니다.', durationSeconds: 14, gear: 'D', steering: '중앙', check: '우측 미러 · 오른쪽 차량과 뒤 범퍼' },
      { title: '오른쪽 뒤 간격 지키기', description: 'R과 우측 최대 조향으로 아주 천천히 후진합니다. 오른쪽 뒤 모서리가 오른쪽 차량에 붙지 않는지 확인하세요.', cue: '간격이 빠르게 줄면 브레이크로 정지하고 핸들을 조금 푸세요.', durationSeconds: 17, gear: 'R', steering: '우측 끝까지', check: '우측 미러 · 오른쪽 뒤 모서리' },
      { title: '양쪽 선 사이에 세우기', description: '차체와 주차선이 거의 평행하면 정지해 핸들을 중앙으로 돌리고 직선 후진합니다.', cue: '후방카메라는 깊이, 양쪽 미러는 좌우 간격 확인에 사용하세요.', durationSeconds: 14, gear: 'R', steering: '중앙', check: '좌·우 미러 → 후방 거리' },
    ],
  },
  'pillar-side': {
    scenarioId: 'pillar-side',
    title: '기둥과 회전 여유 확보하기',
    steps: [
      { title: '기둥과 진입점 함께 기억하기', description: 'D로 전진해 뒤 범퍼 기준점을 맞추되, 기둥이 어느 쪽 모서리 가까이에 있는지 먼저 확인하고 정지합니다.', cue: '기둥은 미러 사각지대로 사라질 수 있으므로 위치를 기억하세요.', durationSeconds: 15, gear: 'D', steering: '중앙', check: '기둥 위치 · 뒤 범퍼 기준선' },
      { title: '회전 반경에서 기둥 빼기', description: 'R과 우측 최대 조향으로 후진합니다. 뒤가 칸으로 들어갈 때 앞부분은 반대편으로 휘두르므로 기둥 쪽 모서리를 반복 확인하세요.', cue: '확신이 없으면 즉시 정지하십시오. 기둥은 움직이지 않습니다.', durationSeconds: 17, gear: 'R', steering: '우측 끝까지', check: '기둥과 가장 가까운 앞·뒤 모서리' },
      { title: '기둥 쪽 여유 남겨 정렬', description: '평행 직전에 정지하고 핸들을 중앙으로 돌려 직선 후진합니다. 기둥 쪽에 문을 열 여유를 남기세요.', cue: '주차선 중앙보다 충돌 없는 안전거리가 우선입니다.', durationSeconds: 15, gear: 'R', steering: '중앙', check: '기둥 간격 → 반대쪽 주차선' },
    ],
  },
}

export function getLesson(scenarioId: ScenarioId) {
  return lessons[scenarioId]
}

export function lessonDuration(lesson: MiniLesson) {
  return lesson.steps.reduce((total, step) => total + step.durationSeconds, 0)
}
