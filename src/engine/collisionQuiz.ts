import type { ReplayEvent } from './sessionReplay.ts'

export type QuizAction =
  | 'stop'
  | 'continue'
  | 'steer-more'
  | 'reverse-straight'
  | 'forward-straight'
  | 'opposite-steering'
  | 'check-clearance'
  | 'check-one-side'
  | 'maximum-steering'

export type CollisionQuizStep = {
  label: string
  question: string
  choices: readonly { id: QuizAction; label: string }[]
  answer: QuizAction
  feedback: string
}

function obstacleName(event: ReplayEvent) {
  if (event.collision?.kind === 'vehicle') return '주차 차량'
  if (event.collision?.kind === 'wall') return '벽면'
  return '장애물'
}

export function buildCollisionQuiz(event: ReplayEvent): CollisionQuizStep[] {
  const wasDrivingForward = event.vehicle.gear === 'D'
  const obstacle = obstacleName(event)
  const recoveryAction: QuizAction = wasDrivingForward ? 'reverse-straight' : 'forward-straight'
  const recoveryLabel = wasDrivingForward
    ? '뒤쪽을 확인하고 R로 짧게 직선 후진'
    : '앞쪽을 확인하고 D로 짧게 직선 전진'
  const unsafeContinue = wasDrivingForward ? '현재 방향으로 계속 전진' : '현재 방향으로 계속 후진'

  return [
    {
      label: '위험 발견',
      question: `${obstacle}에 가까워지거나 닿았을 때 가장 먼저 할 행동은?`,
      choices: [
        { id: 'continue', label: unsafeContinue },
        { id: 'stop', label: '브레이크로 완전히 정지' },
        { id: 'steer-more', label: '움직이면서 핸들을 더 돌리기' },
      ],
      answer: 'stop',
      feedback: '먼저 완전히 멈춘 뒤 접촉한 위치와 반대쪽 여유를 확인해야 추가 충돌을 막을 수 있어요.',
    },
    {
      label: '안전거리 회복',
      question: `${wasDrivingForward ? '전진' : '후진'} 중 ${obstacle}에 닿았습니다. 어느 동작으로 먼저 간격을 회복할까요?`,
      choices: [
        { id: recoveryAction, label: recoveryLabel },
        { id: 'continue', label: unsafeContinue },
        { id: 'opposite-steering', label: '현재 기어에서 반대 방향으로 크게 조향' },
      ],
      answer: recoveryAction,
      feedback: `${recoveryLabel}하면 방금 이동한 경로를 안전하게 되돌아가며 간격을 확보할 수 있어요.`,
    },
    {
      label: '재출발 판단',
      question: '간격을 확보한 뒤 다시 움직이기 전에 무엇을 확인해야 할까요?',
      choices: [
        { id: 'check-one-side', label: '충돌했던 한쪽만 확인' },
        { id: 'check-clearance', label: '진행 방향과 양쪽 간격, 차체 각도 확인' },
        { id: 'maximum-steering', label: '항상 최대 조향인지 확인' },
      ],
      answer: 'check-clearance',
      feedback: '진행할 쪽의 공간과 양쪽 간격, 차체 각도를 함께 확인한 뒤 필요한 만큼만 조향하세요.',
    },
  ]
}

