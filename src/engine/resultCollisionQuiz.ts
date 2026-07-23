import type { ScenarioRuntime } from '../types/practice.ts'
import { detectCollision } from './collisionDetection.ts'
import type { JudgmentChoice, JudgmentScenario } from './judgmentScenarios.ts'
import { simulateJudgmentChoice } from './judgmentScenarios.ts'
import type { ReplayEvent } from './sessionReplay.ts'

const ZONES = ['front-left', 'front-right', 'rear-left', 'rear-right'] as const
type ContactZone = typeof ZONES[number]

const ZONE_LABELS: Record<ContactZone, string> = {
  'front-left': '왼쪽 앞 모서리',
  'front-right': '오른쪽 앞 모서리',
  'rear-left': '왼쪽 뒤 모서리',
  'rear-right': '오른쪽 뒤 모서리',
}

export type ResultCollisionQuiz = {
  risk: JudgmentScenario
  correction: JudgmentScenario
  correctionSimulations: Record<string, ReturnType<typeof simulateJudgmentChoice>>
}

function endClearance(choice: JudgmentChoice, event: ReplayEvent, runtime: ScenarioRuntime) {
  const simulation = simulateJudgmentChoice(event.vehicle, choice, runtime)
  if (simulation.collided) return { simulation, score: -Infinity, clearance: 0, distanceGain: -Infinity }
  const end = simulation.states[simulation.states.length - 1]
  let clearance = 0
  for (let value = .05; value <= 1; value += .05) {
    if (detectCollision(end, value, runtime)) break
    clearance = value
  }
  const impact = event.impactVehicle ?? event.vehicle
  const startDistance = Math.hypot(event.vehicle.x - impact.x, event.vehicle.y - impact.y)
  const endDistance = Math.hypot(end.x - impact.x, end.y - impact.y)
  const distanceGain = endDistance - startDistance
  return { simulation, score: clearance * 2 + distanceGain, clearance, distanceGain }
}

export function buildResultCollisionQuiz(event: ReplayEvent, runtime: ScenarioRuntime): ResultCollisionQuiz {
  const actualZone = event.collision?.contactZone ?? 'front-right'
  const movingGear = event.vehicle.gear
  const recoveryGear = movingGear === 'R' ? 'D' : 'R'
  const originalSteering = event.vehicle.steeringAngle
  const riskChoices: JudgmentChoice[] = ZONES.map((zone) => ({
    id: zone,
    label: ZONE_LABELS[zone],
    focusZone: zone,
    feedback: zone === actualZone
      ? `실제 기록에서 ${ZONE_LABELS[zone]}가 장애물에 가장 먼저 닿았습니다.`
      : `실제 충돌 강조 위치와 비교하면 ${ZONE_LABELS[zone]}가 먼저 닿은 곳은 아닙니다.`,
  }))

  const correctionChoices: JudgmentChoice[] = [
    {
      id: 'retrace',
      label: `${recoveryGear}로 바꾸고 현재 조향을 유지해 짧게 되돌아가기`,
      feedback: '방금 이동한 곡선을 반대 방향으로 짧게 되돌아가는 경로입니다.',
      motion: [{ gear: recoveryGear, steeringAngle: originalSteering, seconds: 1.15 }],
    },
    {
      id: 'straight-away',
      label: `핸들을 중앙으로 하고 ${recoveryGear}로 짧게 이동`,
      feedback: '핸들을 중앙으로 한 뒤 반대 진행 방향으로 간격을 회복하는 경로입니다.',
      motion: [{ gear: recoveryGear, steeringAngle: 0, seconds: 1.15 }],
    },
    {
      id: 'continue',
      label: `현재 기어와 조향으로 계속 ${movingGear === 'R' ? '후진' : '전진'}`,
      feedback: '충돌이 발생한 진행 방향을 유지하므로 같은 위험 지점으로 다시 접근합니다.',
      motion: [{ gear: movingGear, steeringAngle: originalSteering, seconds: 1.15 }],
      focusZone: actualZone,
    },
    {
      id: 'restart',
      label: '짧은 수정 대신 기준점부터 다시 접근',
      feedback: '안전하게 간격을 늘리는 짧은 경로가 없을 때는 처음부터 다시 접근해야 합니다.',
    },
  ]

  const scored = correctionChoices
    .filter((choice) => choice.motion && choice.id !== 'continue')
    .map((choice) => ({ choice, ...endClearance(choice, event, runtime) }))
  const safe = scored
    .filter(({ score, distanceGain }) => Number.isFinite(score) && distanceGain > .05)
    .sort((a, b) => b.score - a.score)
  const answer = safe[0]?.choice.id ?? 'restart'
  const correctionSimulations = Object.fromEntries(correctionChoices
    .filter((choice) => choice.motion)
    .map((choice) => [choice.id, simulateJudgmentChoice(event.vehicle, choice, runtime)]))

  for (const choice of correctionChoices) {
    const simulation = correctionSimulations[choice.id]
    if (!simulation) continue
    if (simulation.collided) choice.feedback += ' 이 선택은 실제 배치에서 다른 장애물과 충돌합니다.'
    else if (choice.id === answer) choice.feedback += ' 실제 배치에서 충돌 없이 위험 지점과의 거리를 가장 안정적으로 늘립니다.'
    else choice.feedback += ' 충돌은 피하더라도 정답 경로보다 위험 지점과의 거리 회복이 작습니다.'
  }

  return {
    risk: {
      id: `result-risk-${event.id}`,
      skill: 'hazard-prediction',
      title: '1단계 · 위험 지점 찾기',
      situation: '실제 충돌 약 0.7초 전의 위치입니다.',
      question: '이대로 움직이면 가장 먼저 장애물에 닿는 곳은 어디일까요?',
      vehicle: event.vehicle,
      choices: riskChoices,
      answer: actualZone,
      takeaway: `실제 충돌 지점은 ${ZONE_LABELS[actualZone]}였습니다.`,
    },
    correction: {
      id: `result-correction-${event.id}`,
      skill: 'first-correction',
      title: '2단계 · 안전한 수정 선택',
      situation: '충돌 전에 완전히 정지했다고 가정하고 실제 주변 공간을 비교합니다.',
      question: '현재 배치에서 새로운 충돌 없이 간격을 가장 안정적으로 회복하는 행동은?',
      vehicle: event.vehicle,
      choices: correctionChoices,
      answer,
      takeaway: answer === 'restart'
        ? '짧은 수정 경로가 모두 위험하면 기준점부터 다시 접근하세요.'
        : '실제 장애물 배치에서 안전성과 거리 회복을 함께 확인한 경로입니다.',
    },
    correctionSimulations,
  }
}
