import type { ScenarioId } from '../types/practice'

export type LessonStep = {
  title: string
  description: string
  cue: string
  durationSeconds: number
  visual: 'approach' | 'turn' | 'align' | 'mirror' | 'clearance'
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
      { title: '나란히 접근하기', description: '주차칸에서 약 1m 떨어져 천천히 나란히 섭니다.', cue: '내 뒤 범퍼와 옆 차량 끝을 맞추세요.', durationSeconds: 14, visual: 'approach' },
      { title: '뒤쪽을 주차칸으로 보내기', description: 'R을 선택하고 주차칸 방향으로 핸들을 끝까지 돌립니다.', cue: '양쪽 미러를 번갈아 확인하세요.', durationSeconds: 16, visual: 'turn' },
      { title: '차체를 평행하게 맞추기', description: '차량이 주차선과 나란해지기 전에 핸들을 중앙으로 돌립니다.', cue: '좌우 간격이 비슷하면 정지하세요.', durationSeconds: 14, visual: 'align' },
    ],
  },
  'left-side': {
    scenarioId: 'left-side',
    title: '왼쪽 차량의 앞 모서리 피하기',
    steps: [
      { title: '왼쪽 간격 확보', description: '왼쪽 차량과 충분한 거리를 두고 시작 위치를 잡습니다.', cue: '좌측 미러에 차량 전체가 보이게 하세요.', durationSeconds: 13, visual: 'clearance' },
      { title: '오른쪽으로 후진 회전', description: '내 차 앞부분이 왼쪽 차량에 가까워지는지 확인하며 회전합니다.', cue: '앞 모서리 간격이 줄면 즉시 정지하세요.', durationSeconds: 17, visual: 'turn' },
      { title: '좌측 미러로 평행 확인', description: '왼쪽 주차선이 차체와 평행해질 때 핸들을 풉니다.', cue: '미러 속 선이 곧게 보이면 중앙 정렬하세요.', durationSeconds: 14, visual: 'mirror' },
    ],
  },
  'right-side': {
    scenarioId: 'right-side',
    title: '오른쪽 차량과 안전거리 유지하기',
    steps: [
      { title: '오른쪽 미러 기준 잡기', description: '오른쪽 차량 끝과 내 뒤 범퍼의 위치를 맞춥니다.', cue: '오른쪽 미러를 먼저 확인하세요.', durationSeconds: 13, visual: 'mirror' },
      { title: '주차칸으로 천천히 회전', description: 'R에서 핸들을 돌리고 후방카메라 가이드 안으로 들어갑니다.', cue: '가까워지면 브레이크로 멈춰 확인하세요.', durationSeconds: 17, visual: 'turn' },
      { title: '양쪽 간격 비교', description: '좌우 미러의 간격이 비슷해질 때 차체를 곧게 세웁니다.', cue: '핸들 중앙과 주차선 평행을 함께 확인하세요.', durationSeconds: 14, visual: 'align' },
    ],
  },
  'pillar-side': {
    scenarioId: 'pillar-side',
    title: '기둥과 회전 여유 확보하기',
    steps: [
      { title: '기둥 위치 기억하기', description: '후진 전에 기둥이 차의 어느 모서리와 가까운지 확인합니다.', cue: '미러에서 사라져도 위치를 기억하세요.', durationSeconds: 15, visual: 'clearance' },
      { title: '앞부분 회전 반경 확인', description: '뒤가 들어갈 때 차량 앞부분은 반대 방향으로 크게 움직입니다.', cue: '기둥 쪽 앞 모서리를 계속 확인하세요.', durationSeconds: 17, visual: 'turn' },
      { title: '안전거리 남기고 정렬', description: '기둥과 최소한의 여유를 둔 채 주차선과 평행하게 맞춥니다.', cue: '한쪽에 붙기보다 중앙을 목표로 하세요.', durationSeconds: 15, visual: 'align' },
    ],
  },
}

export function getLesson(scenarioId: ScenarioId) {
  return lessons[scenarioId]
}

export function lessonDuration(lesson: MiniLesson) {
  return lesson.steps.reduce((total, step) => total + step.durationSeconds, 0)
}
